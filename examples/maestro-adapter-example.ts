import { Configuration,MaestroClient } from "@maestro-org/typescript-sdk";
import invariant from "@minswap/tiny-invariant";
import { Lucid, Network, TxComplete } from "@spacebudz/lucid/mod";

import { Asset, NetworkId, PoolV2 } from "../src";
import { MaestroAdapter } from "../src/adapters/maestro";
import { LbeV2 } from "../src/lbe-v2/lbe-v2";
import { getBackendMaestroLucidInstance } from "../src/utils/lucid";

async function main(): Promise<void> {
  const cardanoNetwork: Network = "Preprod";
  const maestroApiKey = "<YOUR_MAESTRO_API_KEY>";

  const address =
    "addr_test1qqf2dhk96l2kq4xh2fkhwksv0h49vy9exw383eshppn863jereuqgh2zwxsedytve5gp9any9jwc5hz98sd47rwfv40stc26fr";

  const lucid = await getBackendMaestroLucidInstance(
    cardanoNetwork,
    maestroApiKey,
    address
  );

  const maestroClient = new MaestroClient(
    new Configuration({
      apiKey: maestroApiKey,
      network: cardanoNetwork,
    })
  );

  const maestroAdapter = new MaestroAdapter(NetworkId.TESTNET, maestroClient);

  const txComplete = await _lbeV2DepositOrderExample(
    lucid,
    address,
    maestroAdapter
  );
  const signedTx = await txComplete
    .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
    .commit();

  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}

// Example Tx: 7af5ea80b6a4a587e2c6cfce383367829f0cb68c90b65656c8198a72afc3f419
async function _lbeV2DepositOrderExample(
  lucid: Lucid,
  address: string,
  maestroAdapter: MaestroAdapter
): Promise<TxComplete> {
  const baseAsset = Asset.fromString(
    "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed7243414b45"
  );
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await maestroAdapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

  const seller = await maestroAdapter.getLbeV2SellerByLbeId(lbeId);
  invariant(seller !== null, `Can not find seller by lbeId ${lbeId}`);
  const sellerUtxos = await lucid.utxosByOutRef([
    { txHash: seller.txIn.txHash, outputIndex: seller.txIn.index },
  ]);
  invariant(sellerUtxos.length === 1, "Can not find seller Utxo");

  const orders = await maestroAdapter.getLbeV2OrdersByLbeIdAndOwner(
    lbeId,
    address
  );
  const orderUtxos =
    orders.length > 0
      ? await lucid.utxosByOutRef(
          orders.map((o) => ({
            txHash: o.txIn.txHash,
            outputIndex: o.txIn.index,
          }))
        )
      : [];

  invariant(
    orderUtxos.length === orders.length,
    "Can not find enough order Utxos"
  );

  const currentSlot = await maestroAdapter.currentSlot();
  return new LbeV2(lucid).depositOrWithdrawOrder({
    currentSlot: currentSlot,
    existingOrderUtxos: orderUtxos,
    treasuryUtxo: treasuryUtxos[0],
    sellerUtxo: sellerUtxos[0],
    owner: address,
    action: { type: "deposit", additionalAmount: 1_000_000n },
  });
}

void main();
