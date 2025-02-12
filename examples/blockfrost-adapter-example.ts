import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

import {
  Asset,
  BlockfrostAdapter,
  getBackendBlockfrostLucidInstance,
  NetworkId,
} from "../src";
import { _swapExactInV2TxExample } from "./build-tx-example";

const MIN: Asset = {
  policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
  tokenName: "4d494e",
};

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

  const utxos = await lucid.utxosAt(address);

  // Replace your function in build-tx-example that you want to test here
  const txComplete = await _swapExactInV2TxExample(
    lucid,
    blockfrostAdapter,
    address,
    utxos
  );

  const signedTx = await txComplete
    .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
    .commit();

  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}
