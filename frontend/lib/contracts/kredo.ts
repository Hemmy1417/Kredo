import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { Loan, ReputationProfile, TransactionReceipt } from "./types";

/**
 * Kredo contract class for interacting with the GenLayer Identity Lending contract.
 * All read methods are fully defensive — they return safe defaults instead of throwing
 * when the contract has no data yet (fresh deployment, unverified address, etc.)
 */
class Kredo {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(
    contractAddress: string,
    address?: string | null,
    studioUrl?: string
  ) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = { chain: studionet };
    if (address)    config.account  = address as `0x${string}`;
    if (studioUrl)  config.endpoint = studioUrl;

    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    this.client = createClient({
      chain: studionet,
      account: address as `0x${string}`,
    } as any);
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Safely convert a GenLayer Map or plain object to a plain JS object */
  private toObj(raw: any): Record<string, any> {
    if (!raw) return {};
    if (raw instanceof Map) return Object.fromEntries(raw.entries());
    if (typeof raw === "object") return raw;
    return {};
  }

  /**
   * Wait for a submitted tx and REJECT if consensus was UNDETERMINED/CANCELED.
   * The default behaviour of waitForTransactionReceipt is to return regardless,
   * which caused mutations to falsely report success and leave stale state.
   */
  private async waitAndVerify(txHash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = (await this.client.waitForTransactionReceipt({
      hash: txHash as any,
      status: "ACCEPTED" as any,
      retries: 60,
      interval: 5000,
    })) as any;
    const status = String(receipt?.status ?? "").toUpperCase();
    const cd = receipt?.consensus_data ?? {};
    const lr = cd.leader_receipt;
    const r = Array.isArray(lr) ? lr[0] : lr;
    if (status.includes("UNDETERMINED") || status.includes("CANCELED")) {
      throw new Error("Validators could not reach consensus — try again");
    }
    if (r?.execution_result === "ERROR") {
      const stderr: string = r?.genvm_result?.stderr ?? "";
      const userErr = stderr.match(/UserError: (.+)/)?.[1];
      if (userErr) throw new Error(userErr);
      // Fall back to the last meaningful line of the Python traceback
      const lines = stderr.trim().split("\n").filter((l) => l.trim() && !l.startsWith("  "));
      const lastMeaningful = lines[lines.length - 1] || "";
      const specific = lastMeaningful.replace(/^.*?Error: /, "").slice(0, 200);
      console.error("[Kredo] contract execution error, full stderr:", stderr);
      throw new Error(specific || "Contract execution error — check the browser console for the Python traceback");
    }
    return receipt as TransactionReceipt;
  }

  /** Run a readContract call; return null on any error instead of throwing */
  private async safeRead(functionName: string, args: any[] = []): Promise<any> {
    try {
      return await this.client.readContract({
        address: this.contractAddress,
        functionName,
        args,
      });
    } catch (err) {
      console.warn(`[Kredo] safeRead "${functionName}" failed:`, err);
      return null;
    }
  }

  // ── READ METHODS ───────────────────────────────────────────────────────────

  /**
   * Fetch all loans by reading total count then fetching each by ID.
   * Returns [] on a fresh deployment with no loans yet.
   */
  async getLoans(): Promise<Loan[]> {
    try {
      const raw = await this.safeRead("get_protocol_params");
      const params = this.toObj(raw);
      const total = Number(params?.total_loans_issued ?? 0);
      if (total === 0) return [];

      const results = await Promise.allSettled(
        Array.from({ length: total }, (_, i) => this.getLoan(String(i + 1)))
      );

      return results
        .filter((r): r is PromiseFulfilledResult<Loan> => r.status === "fulfilled" && !!r.value)
        .map((r) => r.value);
    } catch (err) {
      console.error("[Kredo] getLoans failed:", err);
      return [];
    }
  }

  /**
   * Fetch a single loan by ID. Returns null if not found.
   */
  async getLoan(loanId: string): Promise<Loan> {
    const raw = await this.safeRead("get_loan", [loanId]);
    if (!raw) throw new Error(`Loan ${loanId} not found`);
    const obj = this.toObj(raw);
    // Contract stores rate/ratio as bps ints — convert to decimals so the UI's
    // existing `* 100` displays are correct instead of always showing 0%.
    return {
      ...obj,
      collateral_ratio: (Number(obj.collateral_ratio_bps ?? 15000)) / 10000,
      interest_rate_apr: (Number(obj.interest_rate_bps ?? 2000)) / 10000,
    } as Loan;
  }

  /**
   * Fetch reputation profile for an address.
   * Returns a zero-score default profile if the address is unverified —
   * our contract raises UserError for unknown addresses, so we catch that here.
   */
  async getReputation(address: string | null): Promise<ReputationProfile | null> {
    if (!address) return null;
    try {
      const raw = await this.safeRead("get_reputation", [address]);
      if (!raw) return this.defaultProfile(address);
      const profile = this.toObj(raw);
      if (profile.score === undefined) return this.defaultProfile(address);
      // Contract returns bps (basis points) to avoid float issues — convert back
      return {
        ...profile,
        collateral_ratio: (Number(profile.collateral_ratio_bps ?? 15000)) / 10000,
        interest_rate_apr: (Number(profile.interest_rate_bps ?? 2000)) / 10000,
      } as ReputationProfile;
    } catch {
      return this.defaultProfile(address);
    }
  }

  private defaultProfile(address: string): ReputationProfile {
    return {
      address,
      score: 0,
      risk_tier: "UNVERIFIED" as any,
      identity_sources: [],
      last_updated: "",
      total_loans_repaid: 0,
      total_loans_defaulted: 0,
      verified: false,
      collateral_ratio: 1.5,
      interest_rate_apr: 0.20,
    };
  }

  /**
   * Preview loan terms without committing.
   */
  async previewLoanTerms(
    borrowerAddress: string,
    loanAmountWei: bigint,
    durationDays: number
  ): Promise<any> {
    const raw = await this.safeRead("preview_loan_terms", [
      borrowerAddress,
      loanAmountWei,
      durationDays,
    ]);
    if (!raw) throw new Error("Failed to preview loan terms");
    const obj = this.toObj(raw);
    // Convert bps back to decimals for the UI
    return {
      ...obj,
      collateral_ratio: (Number(obj.collateral_ratio_bps ?? 15000)) / 10000,
      interest_rate_apr: (Number(obj.interest_rate_bps ?? 2000)) / 10000,
    };
  }

  /**
   * Fetch protocol-level parameters.
   * Returns safe defaults on a fresh deployment.
   */
  async getProtocolParams(): Promise<any> {
    const raw = await this.safeRead("get_protocol_params");
    if (!raw) return { total_loans_issued: 0, min_reputation_to_borrow: 0, owner: "" };
    return this.toObj(raw);
  }

  // ── WRITE METHODS ──────────────────────────────────────────────────────────

  async evaluateIdentity(
    borrowerAddress: string,
    identitySources: { type: string; url: string; label: string }[]
  ): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "evaluate_identity",
        args: [borrowerAddress, identitySources],
        value: BigInt(0),
      });
      return await this.waitAndVerify(txHash);
    } catch (err) {
      console.error("[Kredo] evaluateIdentity failed:", err);
      throw err instanceof Error ? err : new Error("Failed to evaluate identity");
    }
  }

  async requestLoan(
    borrowerAddress: string,
    loanAmountWei: bigint,
    collateralAmountWei: bigint,
    durationDays: number
  ): Promise<TransactionReceipt> {
    try {
      // Both loan and collateral amounts flow to the contract as wei-scale
      // BigInts (the contract uses BPS math internally). msg.value moves real
      // GEN and MetaMask displays it as "N GEN" instead of "N wei".
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "request_loan",
        args: [borrowerAddress, loanAmountWei, collateralAmountWei, durationDays],
        value: collateralAmountWei,
      });
      return await this.waitAndVerify(txHash);
    } catch (err) {
      console.error("[Kredo] requestLoan failed:", err);
      throw err instanceof Error ? err : new Error("Failed to request loan");
    }
  }

  async repayLoan(loanId: string, repaymentAmountWei: bigint): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "repay_loan",
        args: [loanId, repaymentAmountWei],
        value: BigInt(0),
      });
      return await this.waitAndVerify(txHash);
    } catch (err) {
      console.error("[Kredo] repayLoan failed:", err);
      throw err instanceof Error ? err : new Error("Failed to repay loan");
    }
  }

  async liquidateLoan(loanId: string): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "liquidate_loan",
        args: [loanId],
        value: BigInt(0),
      });
      return await this.waitAndVerify(txHash);
    } catch (err) {
      console.error("[Kredo] liquidateLoan failed:", err);
      throw err instanceof Error ? err : new Error("Failed to liquidate loan");
    }
  }
}

export default Kredo;