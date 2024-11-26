import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Network } from "@minswap/lucid-cardano";

import { BlockfrostAdapter, NetworkId } from "../src";
import { LbeV2Worker } from "../src/lbe-v2-worker/worker";
import { NetworkEnvironment } from "../src/types/network";
import { getBackendLucidInstance } from "../src/utils/lucid";

async function main(): Promise<void> {
  const network: Network = "Preprod";
  const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address =
    "addr_test1vrd9v47japxwp8540vsrh4grz4u9urfpfawwy7sf6r0vxqgm7wdxh";
  const lucid = await getBackendLucidInstance(
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
