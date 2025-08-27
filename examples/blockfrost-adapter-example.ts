import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

import {
  BlockfrostAdapter,
  getBackendBlockfrostLucidInstance,
  NetworkId,
} from "../src";
import { _swapExactInV2TxExample } from "./build-tx-example";

async function main(): Promise<void> {
  const projectId = "<YOUR_BLOCKFROST_API_KEY>";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address = "<YOUR_ADDRESS>";
  const lucid = await getBackendBlockfrostLucidInstance({
    network: "Preprod",
    projectId,
    blockfrostUrl,
    address,
  });

  const blockfrostAdapter = new BlockfrostAdapter(
    NetworkId.TESTNET,
    new BlockFrostAPI({
      projectId: projectId,
      network: "preprod",
    })
  );

  // Replace your function in build-tx-example that you want to test here
  const txComplete = await _swapExactInV2TxExample(
    lucid,
    blockfrostAdapter,
    address
  );

  const signedTx = await txComplete
    .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
    .commit();

  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}

main();
