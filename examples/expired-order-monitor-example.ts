import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Network } from "@minswap/lucid-cardano";

import { BlockfrostAdapter, NetworkId } from "../src";
import { ExpiredOrderMonitor } from "../src/expired-order-monitor";
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
  )

  const monitor = new ExpiredOrderMonitor({
    lucid,
    blockfrostAdapter,
    privateKey: "ed25519_sk1d3k9a79r6ne4c3zghfmz372wv8k09unezqqmwezdtpv43fsau92sqshtsz",
  });

  await monitor.start();
}

void main();
