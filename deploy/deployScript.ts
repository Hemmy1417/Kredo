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
      // Kredo's constructor takes: owner (str), min_reputation_to_borrow (int).
      // Owner defaults to the deploying wallet at read time; set an initial
      // minimum of 0 (any reputation can borrow with full collateral).
      args: ["0x0000000000000000000000000000000000000000", 0],
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
        : (receipt.txDataDecoded as DecodedDeployData)?.contractAddress;
    console.log(`Kredo deployed at: ${addr}`);
    console.log("Set NEXT_PUBLIC_CONTRACT_ADDRESS in frontend/.env.local to this address.");
  } catch (error) {
    throw new Error(`Deployment error: ${error}`);
  }
}
