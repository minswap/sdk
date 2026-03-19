import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Constr } from "@spacebudz/lucid";

import {
  ADA,
  BlockfrostAdapter,
  calculateSwapExactIn,
  DataObject,
  DataType,
  Dex,
  getBackendBlockfrostLucidInstance,
  NetworkId,
  PoolV1,
} from "../src";

const blockfrostProjectId = "preprodel6eWcyCZddTV1wezpV1uNlt0GpUVAcw";
const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";
const networkId = NetworkId.TESTNET;

// This public preprod address has a single 5 ADA UTxO, which is enough
// for a small build-only swap test without signing or submitting.
const address =
  "addr_test1qpssc0r090a9u0pyvdr9y76sm2xzx04n6d4j0y5hukcx6rxz4dtgkhfdynadkea0qezv99wljdl076xkg2krm96nn8jszmh3w7";

const poolId =
  "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

async function main(): Promise<void> {
  const lucid = await getBackendBlockfrostLucidInstance(
    networkId,
    blockfrostProjectId,
    blockfrostUrl,
    address
  );

  const adapter = new BlockfrostAdapter(
    networkId,
    new BlockFrostAPI({
      projectId: blockfrostProjectId,
      network: "preprod",
    })
  );

  const availableUtxos = await lucid.utxosAt(address);
  if (availableUtxos.length === 0) {
    throw new Error("No UTxOs available for the selected testnet address");
  }

  const poolState = await adapter.getV1PoolById({ id: poolId });
  if (!poolState) {
    throw new Error(`Pool ${poolId} not found on testnet`);
  }

  const rawPoolDatum = await adapter.getDatumByDatumHash(poolState.datumHash);
  const poolDatum = PoolV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(rawPoolDatum) as Constr<DataType>
  );

  // Keep the swap small enough to fit inside the 5 ADA source UTxO after
  // the order deposit, batcher fee, and transaction fee are added.
  const amountIn = 100_000n;
  const { amountOut } = calculateSwapExactIn({
    amountIn: amountIn,
    reserveIn: poolState.reserveA,
    reserveOut: poolState.reserveB,
  });
  const minimumAmountOut = (amountOut * 80n) / 100n;

  const tx = await new Dex(lucid).buildSwapExactInTx({
    sender: address,
    availableUtxos: availableUtxos,
    amountIn: amountIn,
    assetIn: ADA,
    assetOut: poolDatum.assetB,
    minimumAmountOut: minimumAmountOut,
    isLimitOrder: false,
  });

  console.info(
    JSON.stringify(
      {
        address,
        poolId,
        inputUtxoCount: availableUtxos.length,
        amountIn: amountIn.toString(),
        expectedAmountOut: amountOut.toString(),
        minimumAmountOut: minimumAmountOut.toString(),
        fee: tx.fee,
        txHash: tx.toHash(),
        txCborPrefix: tx.toString().slice(0, 64),
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
