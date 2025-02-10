import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

import {
  BlockfrostAdapter,
  ExpiredOrderMonitor,
  getBackendBlockfrostLucidInstance,
  NetworkId,
} from "../src";

async function main(): Promise<void> {
  const networkId: NetworkId = NetworkId.TESTNET;
  const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address = "<YOUR_ADDRESS>";
  const lucid = await getBackendBlockfrostLucidInstance(
    networkId,
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

  // To test it, you need to create an expired order first
  const monitor = new ExpiredOrderMonitor({
    lucid,
    blockfrostAdapter,
    privateKey: "<YOUR_PRIVATE_KEY>",
  });

  await monitor.start();
}

void main();
