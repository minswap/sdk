import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

import {
  ADA,
  BlockfrostAdapter, DexV2,
  getBackendBlockfrostLucidInstance,
  NetworkId,
} from "../src";

async function main() {
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

  const txComplete = await new DexV2(lucid, blockfrostAdapter).createPoolTx({
    assetA: ADA,
    assetB: { // Replace with your own asset
      policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
      tokenName: "434d",
    },
    amountA: 10_000000n,
    amountB: 300_000000n,
    tradingFeeNumerator: 100n,
  });

  const signedTx = await txComplete
    .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
    .commit();
  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}

void main();
