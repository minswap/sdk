import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

import {
  BlockfrostAdapter,
  getBackendBlockfrostLucidInstance,
  LbeV2Worker,
  NetworkEnvironment,
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

  // To test it, you need to create an event, then you create a deposit order
  const worker = new LbeV2Worker({
    networkEnv: NetworkEnvironment.TESTNET_PREPROD,
    networkId: NetworkId.TESTNET,
    lucid,
    blockfrostAdapter,
    privateKey: "<YOUR_PRIVATE_KEY>",
  });

  await worker.start();
}

void main();
