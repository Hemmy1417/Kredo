"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Kredo from "../contracts/kredo";
import { getContractAddress, getStudioUrl, explorerTxUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";
import { useScoreEvents } from "./useScoreEvents";
import type {
  Loan,
  ReputationProfile,
  TopBorrowerEntry,
  IdentitySource,
} from "../contracts/types";

const AI_RATIONALE_KEY = (addr: string) => `kredo_ai_rationale_${addr.toLowerCase()}`;

/** Compact wei→GEN label for toast copy (accepts number/string/bigint wei). */
function formatGenLabel(wei: unknown): string {
  let n: number;
  try { n = Number(BigInt(wei as any)) / 1e18; } catch { n = Number(wei ?? 0) / 1e18; }
  if (!isFinite(n)) n = 0;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function persistAiRationale(address: string, data: any) {
  try {
    localStorage.setItem(AI_RATIONALE_KEY(address), JSON.stringify({
      summary: String(data?.summary ?? ""),
      risk_tier: String(data?.risk_tier ?? ""),
      flags: Array.isArray(data?.flags) ? data.flags.slice(0, 6) : [],
      score: Number(data?.score ?? 0),
      at: Date.now(),
    }));
  } catch { /* silent */ }
}

export function readAiRationale(address: string | null): { summary: string; risk_tier: string; flags: string[]; score: number; at: number } | null {
  if (!address || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AI_RATIONALE_KEY(address));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Hook to get the Kredo contract instance.
 * Returns null if contract address is not configured.
 * Recreated whenever wallet address changes.
 */
export function useKredoContract(): Kredo | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  return useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.",
        {
          label: "Setup Guide",
          onClick: () => window.open("/docs/setup", "_blank"),
        }
      );
      return null;
    }
    return new Kredo(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);
}

// ─── READ HOOKS ──────────────────────────────────────────────────────────────

/**
 * Fetch all loans from the contract.
 */
export function useLoans() {
  const contract = useKredoContract();

  return useQuery<Loan[], Error>({
    queryKey: ["loans"],
    queryFn: () => (contract ? contract.getLoans() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

/**
 * Fetch a single loan by ID.
 */
export function useLoan(loanId: string | null) {
  const contract = useKredoContract();

  return useQuery<Loan | null, Error>({
    queryKey: ["loan", loanId],
    queryFn: () =>
      contract && loanId ? contract.getLoan(loanId) : Promise.resolve(null),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!loanId,
  });
}

/**
 * Fetch reputation profile for an address.
 * Returns null without hitting the contract if address is empty.
 * The contract raises UserError for unverified addresses — we return
 * a default profile instead of crashing.
 */
export function useReputation(address: string | null) {
  const contract = useKredoContract();

  return useQuery<ReputationProfile | null, Error>({
    queryKey: ["reputation", address],
    queryFn: async () => {
      if (!contract || !address) return null;
      return contract.getReputation(address);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    // Only fetch if we have both contract and a real address
    enabled: !!contract && !!address && address.length > 0,
  });
}

/**
 * Derive top borrowers from loans that have REPAID status —
 * only fetch reputation for addresses that have completed a loan,
 * meaning they are guaranteed to have a profile on-chain.
 */
export function useTopBorrowers() {
  const contract = useKredoContract();
  const { data: loans } = useLoans();

  return useQuery<TopBorrowerEntry[], Error>({
    // Key on a lightweight derivative — never the raw Loan[] (u256 fields
    // are BigInt and crash JSON.stringify inside React Query's hashKey).
    queryKey: ["topBorrowers", loans?.length ?? 0, loans?.map((l) => l.loan_id).join(",") ?? ""],
    queryFn: async () => {
      if (!contract || !loans || loans.length === 0) return [];

      // Only fetch reputation for borrowers with at least one completed loan
      // — these are guaranteed to have an on-chain profile
      const activeBorrowers = loans
        .filter((l) => l.status === "REPAID" || l.status === "LIQUIDATED")
        .map((l) => l.borrower)
        .filter(Boolean);

      const uniqueAddresses = [...new Set(activeBorrowers)];
      if (uniqueAddresses.length === 0) return [];

      const profiles = await Promise.allSettled(
        uniqueAddresses.map((addr) => contract.getReputation(addr))
      );

      return profiles
        .filter((r): r is PromiseFulfilledResult<ReputationProfile> =>
          r.status === "fulfilled" && !!r.value && r.value.verified
        )
        .map((r) => ({
          address: r.value.address,
          score: r.value.score,
          total_loans_repaid: r.value.total_loans_repaid,
          total_loans_defaulted: r.value.total_loans_defaulted,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

/**
 * Fetch protocol-level parameters.
 */
export function useProtocolParams() {
  const contract = useKredoContract();

  return useQuery({
    queryKey: ["protocolParams"],
    queryFn: () =>
      contract ? contract.getProtocolParams() : Promise.resolve(null),
    staleTime: 10000,
    enabled: !!contract,
  });
}

// ─── WRITE HOOKS ─────────────────────────────────────────────────────────────

/**
 * Evaluate identity sources and compute a reputation score (AI-powered).
 */
export function useEvaluateIdentity() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const { recordEvent } = useScoreEvents(address);

  const mutation = useMutation({
    mutationFn: async ({
      borrowerAddress,
      identitySources,
      priorScore,
    }: {
      borrowerAddress: string;
      identitySources: IdentitySource[];
      priorScore: number;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsEvaluating(true);
      const { receipt, txHash } = await contract.evaluateIdentity(borrowerAddress, identitySources);
      const payload = contract.parseReturnPayload(receipt);
      return { receipt, txHash, payload, priorScore };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["topBorrowers"] });
      setIsEvaluating(false);
      const payload = data?.payload;
      const prior = Number(data?.priorScore ?? 0);
      if (address && payload?.score != null) {
        persistAiRationale(address, payload);
        recordEvent({
          kind: prior > 0 ? "reverified" : "verified",
          delta: Number(payload.score) - prior,
          fromScore: prior,
          toScore: Number(payload.score),
          note: `Identity ${prior > 0 ? "re-evaluated" : "evaluated"} — risk tier ${payload.risk_tier ?? "?"}`,
          aiSummary: String(payload.summary ?? ""),
          aiRiskTier: String(payload.risk_tier ?? ""),
        });
      }
      success("Identity evaluated!", {
        description: `New score: ${payload?.score ?? "recorded on-chain"}`,
        action: { label: "View on explorer", onClick: () => window.open(explorerTxUrl(data?.txHash), "_blank") },
      });
    },
    onError: (err: any) => {
      setIsEvaluating(false);
      error("Failed to evaluate identity", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isEvaluating,
    evaluateIdentity: mutation.mutate,
    evaluateIdentityAsync: mutation.mutateAsync,
  };
}

/**
 * Request a new loan.
 */
export function useRequestLoan() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isRequesting, setIsRequesting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      borrowerAddress,
      loanAmount,
      collateralAmount,
      durationDays,
    }: {
      borrowerAddress: string;
      loanAmount: bigint;
      collateralAmount: bigint;
      durationDays: number;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRequesting(true);
      return contract.requestLoan(
        borrowerAddress,
        loanAmount,
        collateralAmount,
        durationDays
      );
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["protocolParams"] });
      queryClient.invalidateQueries({ queryKey: ["poolStats"] });
      setIsRequesting(false);
      success("Loan requested!", {
        description: "Your loan has been recorded on the blockchain.",
        action: { label: "View on explorer", onClick: () => window.open(explorerTxUrl(data?.txHash), "_blank") },
      });
    },
    onError: (err: any) => {
      setIsRequesting(false);
      error("Failed to request loan", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isRequesting,
    isSuccess: mutation.isSuccess,
    requestLoan: mutation.mutate,
    requestLoanAsync: mutation.mutateAsync,
  };
}

/**
 * Repay an active loan.
 */
export function useRepayLoan() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isRepaying, setIsRepaying] = useState(false);
  const [repayingLoanId, setRepayingLoanId] = useState<string | null>(null);
  const { recordEvent } = useScoreEvents(address);

  const mutation = useMutation({
    mutationFn: async ({
      loanId,
      repaymentAmount,
      priorScore,
    }: {
      loanId: string;
      repaymentAmount: bigint;
      priorScore: number;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRepaying(true);
      setRepayingLoanId(loanId);
      const { receipt, txHash } = await contract.repayLoan(loanId, repaymentAmount);
      const payload = contract.parseReturnPayload(receipt);
      return { receipt, txHash, payload, loanId, priorScore };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["topBorrowers"] });
      queryClient.invalidateQueries({ queryKey: ["poolStats"] });
      setIsRepaying(false);
      setRepayingLoanId(null);
      const payload = data?.payload;
      // A partial payment leaves the loan ACTIVE — don't claim it's closed or
      // record a reputation event (the boost only lands on the full payoff).
      const isPartial = payload?.payment_type === "partial" || payload?.status === "ACTIVE";
      if (isPartial) {
        success("Partial payment received", {
          description: `Loan #${data.loanId} still open · ${formatGenLabel(payload?.outstanding)} GEN remaining`,
          action: { label: "View on explorer", onClick: () => window.open(explorerTxUrl(data?.txHash), "_blank") },
        });
        return;
      }
      const to = Number(payload?.new_reputation_score ?? data?.priorScore ?? 0);
      const from = Number(data?.priorScore ?? 0);
      if (address) {
        recordEvent({
          kind: "loan_repaid",
          delta: to - from,
          fromScore: from,
          toScore: to,
          note: `Repaid loan #${data.loanId} — +${Number(payload?.score_boost ?? 0)} reputation`,
          loanId: String(data.loanId),
        });
      }
      const lateFee = BigInt(payload?.late_fee_charged ?? 0);
      success("Loan repaid!", {
        description:
          `Collateral refunded · reputation +${Number(payload?.score_boost ?? 0)}` +
          (lateFee > 0n ? ` · late fee ${formatGenLabel(lateFee)} GEN` : ""),
        action: { label: "View on explorer", onClick: () => window.open(explorerTxUrl(data?.txHash), "_blank") },
      });
    },
    onError: (err: any) => {
      setIsRepaying(false);
      setRepayingLoanId(null);
      error("Failed to repay loan", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isRepaying,
    repayingLoanId,
    repayLoan: mutation.mutate,
    repayLoanAsync: mutation.mutateAsync,
  };
}

/**
 * Liquidate a defaulted loan.
 */
export function useLiquidateLoan() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isLiquidating, setIsLiquidating] = useState(false);
  const [liquidatingLoanId, setLiquidatingLoanId] = useState<string | null>(
    null
  );
  const { recordEvent } = useScoreEvents(address);

  const mutation = useMutation({
    mutationFn: async (args: { loanId: string; borrowerAddress?: string; priorBorrowerScore?: number }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsLiquidating(true);
      setLiquidatingLoanId(args.loanId);
      const { receipt, txHash } = await contract.liquidateLoan(args.loanId);
      const payload = contract.parseReturnPayload(receipt);
      return { receipt, txHash, payload, ...args };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["reputation"] });
      queryClient.invalidateQueries({ queryKey: ["topBorrowers"] });
      queryClient.invalidateQueries({ queryKey: ["poolStats"] });
      setIsLiquidating(false);
      setLiquidatingLoanId(null);
      // Keeper write-off: the seized collateral returns to the pool reserve to
      // offset the disbursed principal; any shortfall is booked as a write-off.
      const payload = data?.payload;
      if (address) {
        recordEvent({
          kind: "loan_defaulted",
          delta: 0,
          fromScore: 0,
          toScore: 0,
          note: `Liquidated loan #${data.loanId} — collateral ${payload?.seized_collateral ?? 0} wei returned to pool`,
          loanId: String(data.loanId),
        });
      }
      success("Loan liquidated!", {
        description: `Collateral seized to pool · borrower penalised by ${Number(payload?.score_penalty ?? 0)}`,
        action: { label: "View on explorer", onClick: () => window.open(explorerTxUrl(data?.txHash), "_blank") },
      });
    },
    onError: (err: any) => {
      setIsLiquidating(false);
      setLiquidatingLoanId(null);
      error("Failed to liquidate loan", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isLiquidating,
    liquidatingLoanId,
    liquidateLoan: mutation.mutate,
    liquidateLoanAsync: mutation.mutateAsync,
  };
}

/**
 * Preview loan terms without committing — returns a promise directly
 * so it can be called imperatively inside form effects.
 */
export function usePreviewLoanTerms() {
  const contract = useKredoContract();
  const [isFetching, setIsFetching] = useState(false);

  const preview = async ({
    borrowerAddress,
    loanAmount,
    durationDays,
  }: {
    borrowerAddress: string;
    loanAmount: bigint;
    durationDays: number;
  }) => {
    if (!contract) return null;
    setIsFetching(true);
    try {
      return await contract.previewLoanTerms(
        borrowerAddress,
        loanAmount,
        durationDays
      );
    } finally {
      setIsFetching(false);
    }
  };

  return { preview, isFetching };
}

// ─── LIQUIDITY POOL HOOKS ────────────────────────────────────────────────────

/**
 * Live solvency snapshot of the lending book (reserve, outstanding, utilization,
 * lifetime interest / write-offs). Safe zero defaults on a fresh deployment.
 */
export function usePoolStats() {
  const contract = useKredoContract();

  return useQuery({
    queryKey: ["poolStats"],
    queryFn: () => (contract ? contract.getPoolStats() : Promise.resolve(null)),
    refetchOnWindowFocus: true,
    staleTime: 5000,
    enabled: !!contract,
  });
}

/** Seed the lending pool with GEN (LP / owner). */
export function useDepositLiquidity() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isDepositing, setIsDepositing] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({ amount }: { amount: bigint }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsDepositing(true);
      return contract.depositLiquidity(amount);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["poolStats"] });
      queryClient.invalidateQueries({ queryKey: ["protocolParams"] });
      queryClient.invalidateQueries({ queryKey: ["lpPosition"] });
      setIsDepositing(false);
      success("Liquidity deposited!", {
        description: "You now hold pool shares — repaid interest accrues to them automatically.",
        action: { label: "View on explorer", onClick: () => window.open(explorerTxUrl(data?.txHash), "_blank") },
      });
    },
    onError: (err: any) => {
      setIsDepositing(false);
      error("Failed to deposit liquidity", { description: err?.message || "Please try again." });
    },
  });

  return { ...mutation, isDepositing, depositLiquidity: mutation.mutate, depositLiquidityAsync: mutation.mutateAsync };
}

/** Any LP burns pool shares for their pro-rata slice (principal + yield). */
export function useWithdrawLiquidity() {
  const contract = useKredoContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({ shares }: { shares: bigint }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsWithdrawing(true);
      return contract.withdrawLiquidity(shares);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["poolStats"] });
      queryClient.invalidateQueries({ queryKey: ["protocolParams"] });
      queryClient.invalidateQueries({ queryKey: ["lpPosition"] });
      setIsWithdrawing(false);
      success("Liquidity withdrawn!", {
        description: "Your shares were redeemed — principal plus earned yield returned to your wallet.",
        action: { label: "View on explorer", onClick: () => window.open(explorerTxUrl(data?.txHash), "_blank") },
      });
    },
    onError: (err: any) => {
      setIsWithdrawing(false);
      error("Failed to withdraw liquidity", { description: err?.message || "Please try again." });
    },
  });

  return { ...mutation, isWithdrawing, withdrawLiquidity: mutation.mutate, withdrawLiquidityAsync: mutation.mutateAsync };
}

/** Owner collects the accrued protocol fee on interest. */
export function useClaimProtocolFees() {
  const contract = useKredoContract();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      setIsClaiming(true);
      return contract.claimProtocolFees();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["poolStats"] });
      setIsClaiming(false);
      success("Protocol fees claimed!", {
        action: { label: "View on explorer", onClick: () => window.open(explorerTxUrl(data?.txHash), "_blank") },
      });
    },
    onError: (err: any) => {
      setIsClaiming(false);
      error("Failed to claim fees", { description: err?.message || "Please try again." });
    },
  });

  return { ...mutation, isClaiming, claimProtocolFees: mutation.mutate };
}

/** The connected wallet's LP position: shares, value, earned yield. */
export function useLpPosition() {
  const contract = useKredoContract();
  const { address } = useWallet();

  return useQuery({
    queryKey: ["lpPosition", address?.toLowerCase()],
    queryFn: () =>
      contract && address ? contract.getLpPosition(address) : Promise.resolve(null),
    staleTime: 5000,
    enabled: !!contract && !!address,
  });
}
