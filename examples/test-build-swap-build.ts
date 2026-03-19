import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Blockfrost, Data, Lucid } from "lucid-cardano";

import {
  ADA,
  BlockfrostAdapter,
  calculateSwapExactIn,
  Dex,
  NetworkId,
  PoolV1,
} from "../build/index.es.js";

function mustGetEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} not found`);
  }
  return value;
}

async function main(): Promise<void> {
  const networkId = NetworkId.TESTNET;
  const blockfrostProjectId = mustGetEnv("BLOCKFROST_PROJECT_ID_TESTNET");
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  // This public preprod address currently has a 5 ADA UTxO, which is enough
  // for a small unsigned V1 swap build test.
  const address =
    "addr_test1qpssc0r090a9u0pyvdr9y76sm2xzx04n6d4j0y5hukcx6rxz4dtgkhfdynadkea0qezv99wljdl076xkg2krm96nn8jszmh3w7";
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const lucid = await Lucid.new(
    new Blockfrost(blockfrostUrl, blockfrostProjectId),
    "Preprod"
  );
  lucid.selectWalletFrom({ address: address });

  const adapter = new BlockfrostAdapter({
    networkId: networkId,
    blockFrost: new BlockFrostAPI({
      projectId: blockfrostProjectId,
      network: "preprod",
    }),
  });

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
    Data.from(rawPoolDatum)
  );

  // Keep the swap small enough to leave room for deposit ADA, batcher fee,
  // and the final transaction fee inside the source UTxO.
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
