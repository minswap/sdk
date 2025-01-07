import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Network } from "@minswap/lucid-cardano";

import { BlockfrostAdapter, NetworkId } from "../src";
import { LbeV2Worker } from "../src/lbe-v2-worker/worker";
import { NetworkEnvironment } from "../src/types/network";
import { getBackendLucidInstance } from "../src/utils/lucid";

async function main(): Promise<void> {
  const network: Network = "Preprod";
  const blockfrostProjectId = process.env["BLOCKFROST_PROJECT_ID_TESTNET"] || "";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address =
    "addr_test1vr9fc7ytkrhmvrm0hmpj90ywmnytyexxr5vv3hzgpg2a4wg74yn6t";
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
    privateKey: "ed25519_sk1d3k9a79r6ne4c3zghfmz372wv8k09unezqqmwezdtpv43fsau92sqshtsz",
  });

  await worker.start();
}

void main();
