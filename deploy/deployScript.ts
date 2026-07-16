import { readFileSync } from "fs";
import path from "path";
import {
  TransactionHash,
  TransactionStatus,
  GenLayerClient,
  DecodedDeployData,
  GenLayerChain,
} from "genlayer-js/types";
import { localnet } from "genlayer-js/chains";

export default async function main(client: GenLayerClient<GenLayerChain>) {
  const filePath = path.resolve(process.cwd(), "contracts/kredo.py");
  try {
    const contractCode = new Uint8Array(readFileSync(filePath));
    await client.initializeConsensusSmartContract();

    const deployTransaction = await client.deployContract({
      code: contractCode,
      // Kredo's constructor takes: owner (Address), min_reputation_to_borrow (int).
      // IMPORTANT: owner MUST be a real wallet you control — liquidate_loan and
      // withdraw_liquidity are owner-only keeper actions, so a zero/placeholder
      // owner permanently bricks liquidations and pool withdrawals.
      args: [client.account?.address ?? "0x0000000000000000000000000000000000000000", 20],
    });
    const receipt = await client.waitForTransactionReceipt({
      hash: deployTransaction as TransactionHash,
      status: TransactionStatus.ACCEPTED,
      retries: 200,
    });
    if (
      receipt.status !== 5 && receipt.status !== 6 &&
      receipt.statusName !== "ACCEPTED" && receipt.statusName !== "FINALIZED"
    ) {
      throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);
    }
    const addr =
      (client.chain as GenLayerChain).id === localnet.id
        ? receipt.data?.contract_address
        : (receipt.txDataDecoded as DecodedDeployData)?.contractAddress
          ?? (receipt as any)?.data?.contract_address
          ?? (receipt as any)?.contractAddress;
    console.log(`Kredo deployed at: ${addr}`);
    console.log("DEPLOY_TX:", deployTransaction);
    console.log("Set NEXT_PUBLIC_CONTRACT_ADDRESS in frontend/.env.local to this address.");
  } catch (error) {
    throw new Error(`Deployment error: ${error}`);
  }
}
