import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

import {
  Asset,
  BlockfrostAdapter,
  getBackendBlockfrostLucidInstance,
  NetworkId,
  StableOrder,
  Stableswap,
  StableswapCalculation,
  StableswapConstant,
} from "../src";

async function main() {
  const networkId: NetworkId = NetworkId.TESTNET;
  const blockfrostProjectId = "<YOUR_BLOCKFROST_PROJECT_ID>";
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

  // This is LP asset of tDJED-tiUSD pool.
  // You can replace this with your own LP asset.
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await blockfrostAdapter.getStablePoolByLpAsset(lpAsset);

  if (!pool) {
    throw new Error("could not find pool");
  }

  const swapAmount = BigInt(1_000);

  // This pool has 2 assets in its config: [tDJED, tiUSD].
  // Index-0 Asset is tDJED, and Index-1 Asset is tiUSD.
  // This order swaps 1_000n tDJED to tiUSD.
  const amountOut = StableswapCalculation.calculateSwapAmount({
    inIndex: 0,
    outIndex: 1,
    amountIn: swapAmount,
    amp: pool.amp,
    multiples: config.multiples,
    datumBalances: pool.datum.balances,
    fee: config.fee,
    adminFee: config.adminFee,
    feeDenominator: config.feeDenominator,
  });

  const txComplete = await new Stableswap(lucid).createBulkOrdersTx({
    sender: address,
    availableUtxos: utxos,
    options: [
      {
        lpAsset: lpAsset,
        type: StableOrder.StepType.SWAP,
        assetInAmount: swapAmount,
        assetInIndex: BigInt(0),
        assetOutIndex: BigInt(1),
        minimumAssetOut: amountOut,
      },
    ],
  });

  const signedTx = await txComplete
    .signWithPrivateKey(
      "<YOUR_PRIVATE_KEY>"
    )
    .commit();
  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}

void main();
