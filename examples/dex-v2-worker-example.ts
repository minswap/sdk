import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Network } from "@minswap/lucid-cardano";

import { BlockfrostAdapter, NetworkId } from "../src";
import { DexV2Worker } from "../src/dex-v2-worker";
import { getBackendLucidInstance } from "../src/utils/lucid";

async function main(): Promise<void> {
  const network: Network = "Preprod";
  const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address =
    "addr_test1qqf2dhk96l2kq4xh2fkhwksv0h49vy9exw383eshppn863jereuqgh2zwxsedytve5gp9any9jwc5hz98sd47rwfv40stc26fr";
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

  const worker = new DexV2Worker({
    lucid,
    blockfrostAdapter,
    privateKey: "<YOUR_PRIVATE_KEY>",
  });

  await worker.start();
}

void main();
