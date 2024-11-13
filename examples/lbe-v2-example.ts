import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Address, Lucid, Network, TxComplete } from "lucid-cardano";

import invariant from "@minswap/tiny-invariant";
import { BlockfrostAdapter, NetworkId } from "../src";
import { LbeV2 } from "../src/lbe-v2";
import { getBackendLucidInstance, getEnv } from "./utils";

async function lbeV2CloseEventExample(
  lucid: Lucid,
  address: Address,
  blockfrostAdapter: BlockfrostAdapter
): Promise<TxComplete> {
  const lbeId =
    "8823e4ff91df19c575b2b0e4ecf52f2a4690800d781fcb2bf4c78cfd29598cb9";
  const treasury = await blockfrostAdapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const headAndTailFactory =
    await blockfrostAdapter.getLbeV2HeadAndTailFactory(lbeId);
  invariant(
    headAndTailFactory,
    `Can not find head and tail factory by lbeId ${lbeId}`
  );
  const { head: headFactory, tail: tailFactory } = headAndTailFactory;

  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length !== 0, "Can not find treasury Utxo");

  const headFactoryUtxos = await lucid.utxosByOutRef([
    { txHash: headFactory.txIn.txHash, outputIndex: headFactory.txIn.index },
  ]);

  invariant(headFactoryUtxos.length !== 0, "Can not find head factory Utxo");

  const tailFactoryUtxos = await lucid.utxosByOutRef([
    { txHash: tailFactory.txIn.txHash, outputIndex: tailFactory.txIn.index },
  ]);
  invariant(tailFactoryUtxos.length !== 0, "Can not find tail factory Utxo");
  const currentSlot = await blockfrostAdapter.currentSlot();

  return new LbeV2(lucid).closeEventTx({
    treasuryUtxo: treasuryUtxos[0],
    headFactoryUtxo: headFactoryUtxos[0],
    tailFactoryUtxo: tailFactoryUtxos[0],
    currentSlot: currentSlot,
    owner: address,
  });
}

async function main(): Promise<void> {
  const network: Network = "Preprod";
  const blockfrostProjectId = getEnv("BLOCKFROST_KEY");
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address =
    "addr_test1qzjd7yhl8d8aezz0spg4zghgtn7rx7zun7fkekrtk2zvw9vsxg93khf9crelj4wp6kkmyvarlrdvtq49akzc8g58w9cqhx3qeu";

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

  const closeLbeTx = await lbeV2CloseEventExample(
    lucid,
    address,
    blockfrostAdapter
  );
  console.log(closeLbeTx.toString());
}

main();
