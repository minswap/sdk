import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

import {
  BlockfrostAdapter,
  DexV2,
  getBackendBlockfrostLucidInstance,
  NetworkId,
} from "../src";

async function main() {
  const network: NetworkId = NetworkId.TESTNET;
  const blockfrostProjectId = "<YOUR_BLOCKFROST_PROJECT_ID>";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address = "<YOUR_ADDRESS>";

  const lucid = await getBackendBlockfrostLucidInstance(
    network,
    blockfrostProjectId,
    blockfrostUrl,
    address
  );

  const blockfrostAdapter = new BlockfrostAdapter(
    NetworkId.TESTNET,
    new BlockFrostAPI({
      projectId: blockfrostProjectId,
      network: "preprod",
    })
  );

  // Replace with your own order output reference of order transaction here
  const outRef = {
    txHash: "e37692e030243a8ca657d6f6183b774558d3cc970aa1c8b8959da052618454e7",
    outputIndex: 0,
  };

  const txComplete = await new DexV2(lucid, blockfrostAdapter).cancelOrder({
    orderOutRefs: [outRef],
  });

  const signedTx = await txComplete
    .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
    .commit();
  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}

void main();
