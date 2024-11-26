import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Network } from "@minswap/lucid-cardano";

import { BlockfrostAdapter, NetworkId } from "../src";
import { DexV2Worker } from "../src/dex-v2-worker";
import { NetworkEnvironment } from "../src/types/network";
import { getBackendLucidInstance } from "../src/utils/lucid";

async function main(): Promise<void> {
  const network: Network = "Preprod";
  const blockfrostProjectId = "preprodSj4PM4LDOTa2BbfAY4XIEqASI9gKzOEz";
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
    networkEnv: NetworkEnvironment.TESTNET_PREPROD,
    networkId: NetworkId.TESTNET,
    lucid,
    blockfrostAdapter,
    privateKey:
      "ed25519e_sk1pqs6ssazw755demuks2974mdwu6stz0uxpj543edm5cm0y96p9gk9lcv5jspdg3aq7wtv9r96uaru0rnu4qdm7lccarntjm22mtk72cm5cjrj",
  });

  await worker.start();
}

void main();
