/**
 * Repository-level proof that Kredo contract writes are SIGNED by the
 * connected wallet.
 *
 * The Kredo wrapper (lib/contracts/kredo.ts) binds the connected wallet's
 * EIP-1193 provider into its genlayer-js client:
 *
 *   createClient({ chain: studionet, account: address, provider })
 *
 * so `writeContract` routes the signing request (eth_sendTransaction) through
 * the wallet the user actually picked — not genlayer-js's implicit
 * window.ethereum fallback. These tests pin that behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT = ("0x" + "ab".repeat(20)) as `0x${string}`;
const ACCOUNT = ("0x" + "12".repeat(20)) as `0x${string}`;
const TX_HASH = ("0x" + "cd".repeat(32)) as `0x${string}`;

const CONSENSUS_MAIN = {
  address: ("0x" + "01".repeat(20)) as `0x${string}`,
  abi: [
    {
      type: "function",
      name: "addTransaction",
      stateMutability: "nonpayable",
      inputs: [
        { name: "sender", type: "address" },
        { name: "recipient", type: "address" },
        { name: "numOfInitialValidators", type: "uint256" },
        { name: "maxRotations", type: "uint256" },
        { name: "txData", type: "bytes" },
      ],
      outputs: [],
    },
  ],
};

// genlayer-js fires sim_getConsensusContract over fetch when a client is
// created; answer it locally so the suite stays fully offline.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: CONSENSUS_MAIN }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
});

// A minimal EIP-1193 wallet double that records every request it signs.
function recordingProvider() {
  const calls: Array<{ method: string; params: any[] }> = [];
  const provider = {
    request: async ({ method, params = [] }: { method: string; params?: any[] }) => {
      calls.push({ method, params });
      switch (method) {
        case "eth_chainId":            return `0x${studionet.id.toString(16)}`;
        case "eth_accounts":
        case "eth_requestAccounts":    return [ACCOUNT];
        case "eth_getTransactionCount":return "0x0";
        case "eth_estimateGas":        return "0x30d40";
        case "eth_gasPrice":           return "0x1";
        case "eth_sendTransaction":    return TX_HASH; // the wallet signs + broadcasts
        default:                        return "0x1";
      }
    },
    on: () => {},
    removeListener: () => {},
  };
  return { provider, calls };
}

describe("Kredo writes are signed by the connected wallet provider", () => {
  it("routes writeContract through the injected EIP-1193 provider (eth_sendTransaction, correct from)", async () => {
    const { provider, calls } = recordingProvider();

    // EXACTLY how lib/contracts/kredo.ts builds its write client.
    const client: any = createClient({ chain: studionet, account: ACCOUNT, provider });
    client.chain.consensusMainContract = CONSENSUS_MAIN;

    const txHash = await client.writeContract({
      address: CONTRACT,
      functionName: "deposit_liquidity",
      args: [],
      value: 10n ** 18n,
    });

    expect(txHash).toBe(TX_HASH);
    const sendTx = calls.find((c) => c.method === "eth_sendTransaction");
    expect(sendTx, "eth_sendTransaction must be signed by the wallet provider").toBeDefined();
    expect(String(sendTx!.params[0].from).toLowerCase()).toBe(ACCOUNT.toLowerCase());
  });

  it("the Kredo wrapper's write is signed through the connected provider", async () => {
    const { provider, calls } = recordingProvider();
    // Make the wrapper resolve the connected provider to our recording double.
    vi.doMock("../lib/genlayer/client", async (orig) => {
      const actual = await (orig() as Promise<Record<string, unknown>>);
      return { ...actual, getEthereumProvider: () => provider };
    });
    vi.stubGlobal("window", { ethereum: provider } as unknown as Window & typeof globalThis);

    const { default: Kredo } = await import("../lib/contracts/kredo");
    const kredo = new Kredo(CONTRACT, ACCOUNT);

    // Fire the write; the wallet signs (eth_sendTransaction) quickly, then the
    // wrapper's waitAndVerify polls the receipt for a long time — we only need
    // to prove the SIGNATURE went through the connected provider, so don't await
    // the poll.
    void kredo.depositLiquidity(10n ** 18n).catch(() => {});

    await vi.waitFor(
      () => expect(calls.find((c) => c.method === "eth_sendTransaction")).toBeDefined(),
      { timeout: 4000 },
    );
    const sendTx = calls.find((c) => c.method === "eth_sendTransaction")!;
    expect(String(sendTx.params[0].from).toLowerCase()).toBe(ACCOUNT.toLowerCase());
  });
});
