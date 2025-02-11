import { Configuration, MaestroClient } from "@maestro-org/typescript-sdk";

import {
  getBackendMaestroLucidInstance,
  MaestroAdapter,
  NetworkId,
} from "../src";
import { _depositTxExample } from "./build-tx-example";

async function main(): Promise<void> {
  const networkId: NetworkId = NetworkId.TESTNET;
  const maestroApiKey = "<YOUR_MAESTRO_API_KEY>";

  const address = "<YOUR_ADDRESS>";

  const lucid = await getBackendMaestroLucidInstance(
    "Preprod",
    maestroApiKey,
    address
  );

  const maestroClient = new MaestroClient(
    new Configuration({
      apiKey: maestroApiKey,
      network: "Preprod",
    })
  );

  const maestroAdapter = new MaestroAdapter(NetworkId.TESTNET, maestroClient);

  const utxos = await lucid.utxosAt(address);

  // Replace your function in build-tx-example that you want to test here
  const txComplete = await _depositTxExample(
    networkId,
    lucid,
    maestroAdapter,
    address,
    utxos
  );

  const signedTx = await txComplete
    .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
    .commit();

  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}

void main();
