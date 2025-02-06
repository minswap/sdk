import { BlockFrostAPI } from "@blockfrost/blockfrost-js";

import {
  ADA,
  Asset,
  BlockfrostAdapter,
  DexV2,
  DexV2Calculation,
  getBackendBlockfrostLucidInstance,
  NetworkId, OrderV2,
} from "../src";

async function main() {
  const network: NetworkId = NetworkId.TESTNET;
  const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address = "<YOUR_ADDRESS>";

  const lucid = await getBackendBlockfrostLucidInstance(
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

  const MIN: Asset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    tokenName: "4d494e",
  };

  const utxos = await lucid.utxosAt(address);

  const assetA = ADA;
  const assetB = MIN;

  const pool = await blockfrostAdapter.getV2PoolByPair(assetA, assetB);
  if (!pool) {
    throw new Error("could not find pool");
  }

  const swapAmount = BigInt(1000000);
  const amountOut = DexV2Calculation.calculateAmountOut({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    amountIn: swapAmount,
    tradingFeeNumerator: pool.feeA[0],
  });

  // 20% slippage tolerance
  const acceptedAmountOut = DexV2Calculation.calculateAmountOutWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amountOut: amountOut,
    type: "down",
  });

  const txComplete = await new DexV2(lucid, blockfrostAdapter).createBulkOrdersTx(
    {
      sender: address,
      availableUtxos: utxos,
      orderOptions: [
        {
          type: OrderV2.StepType.SWAP_EXACT_IN,
          amountIn: swapAmount,
          assetIn: assetA,
          direction: OrderV2.Direction.A_TO_B,
          minimumAmountOut: acceptedAmountOut,
          lpAsset: pool.lpAsset,
          isLimitOrder: false,
          killOnFailed: false,
        },
      ],
    }
  );

  const signedTx = await txComplete
    .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
    .commit();
  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}

void main();