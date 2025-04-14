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
  // Replace with your Blockfrost project ID
  const blockfrostProjectId = "preprodBA1p1STJuuCjuw2QjfqFIecfT9SCyC9M";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  // Replace with your address
  const address = "addr_test1vp0rfn7x3mf85jctsd85uu4pzga0ujh23dsxhznlktazflsjze52n";
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
  );

  // Replace with your private key
  const signedTx = await txComplete
    .signWithPrivateKey("ed25519_sk1j9gkra33ts20pvjjq4my4lazpttmv98usq2e49um7sj67yy2clmqjdeuj9")
    .commit();

  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}

void main();
