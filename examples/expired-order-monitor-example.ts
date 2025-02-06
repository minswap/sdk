import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

import { NetworkId } from "../src";
import { BlockfrostAdapter } from "../src/adapters/blockfrost";
import { ExpiredOrderMonitor } from "../src/expired-order-monitor";
import { getBackendBlockfrostLucidInstance } from "../src/utils/lucid";

async function main(): Promise<void> {
  const networkId: NetworkId = NetworkId.TESTNET;
  const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address =
    "addr_test1qqf2dhk96l2kq4xh2fkhwksv0h49vy9exw383eshppn863jereuqgh2zwxsedytve5gp9any9jwc5hz98sd47rwfv40stc26fr";
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

  const monitor = new ExpiredOrderMonitor({
    lucid,
    blockfrostAdapter,
    privateKey: "<YOUR_PRIVATE_KEY>",
  });

  await monitor.start();
}

void main();
