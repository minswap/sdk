import invariant from "@minswap/tiny-invariant";
import { Constr, Lucid, OutRef, TxComplete, Utxo } from "@spacebudz/lucid";
import BigNumber from "bignumber.js";

import {
  ADA,
  Adapter,
  Asset,
  calculateAmountWithSlippageTolerance,
  calculateDeposit,
  calculateSwapExactIn,
  calculateSwapExactOut,
  calculateWithdraw,
  calculateZapIn,
  DataObject,
  DataType,
  Dex,
  DexV2,
  DexV2Calculation,
  LbeV2,
  LbeV2Types,
  NetworkId,
  OrderV2,
  PoolV1,
  PoolV2,
  StableOrder,
  Stableswap,
  StableswapCalculation,
  StableswapConstant,
} from "../src";

const MIN: Asset = {
  policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
  tokenName: "4d494e",
};

export async function getPoolById(
  networkId: NetworkId,
  adapter: Adapter,
  poolId: string
): Promise<{ poolState: PoolV1.State; poolDatum: PoolV1.Datum }> {
  const pool = await adapter.getV1PoolById({
    id: poolId,
  });
  if (!pool) {
    throw new Error(`Not found PoolState of ID: ${poolId}`);
  }

  const rawRoolDatum = await adapter.getDatumByDatumHash(pool.datumHash);
  const poolDatum = PoolV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(rawRoolDatum) as Constr<DataType>
  );
  return {
    poolState: pool,
    poolDatum: poolDatum,
  };
}

// MARK: DEX V1
export async function _depositTxExample(
  networkId: NetworkId,
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    networkId,
    adapter,
    poolId
  );

  const depositedAmountA = 10_000_000n;
  const depositedAmountB = 5_000_000n;

  const { necessaryAmountA, necessaryAmountB, lpAmount } = calculateDeposit({
    depositedAmountA: depositedAmountA,
    depositedAmountB: depositedAmountB,
    reserveA: poolState.reserveA,
    reserveB: poolState.reserveB,
    totalLiquidity: poolDatum.totalLiquidity,
  });

  // Because pool is always fluctuating, so you should determine the impact of amount which you will receive
  const acceptedLPAmount = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: lpAmount,
    type: "down",
  });

  return await new Dex(lucid).buildDepositTx({
    amountA: necessaryAmountA,
    amountB: necessaryAmountB,
    assetA: poolDatum.assetA,
    assetB: poolDatum.assetB,
    sender: address,
    minimumLPReceived: acceptedLPAmount,
    availableUtxos: availableUtxos,
  });
}

export async function _swapExactInTxExample(
  networkId: NetworkId,
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    networkId,
    adapter,
    poolId
  );

  const swapAmountADA = 10_000_000n;

  const { amountOut } = calculateSwapExactIn({
    amountIn: swapAmountADA,
    reserveIn: poolState.reserveA,
    reserveOut: poolState.reserveB,
  });

  // Because pool is always fluctuating, so you should determine the impact of amount which you will receive
  const slippageTolerance = 20n;
  const acceptedAmount = (amountOut * (100n - slippageTolerance)) / 100n;

  const dex = new Dex(lucid);
  return await dex.buildSwapExactInTx({
    amountIn: swapAmountADA,
    assetIn: ADA,
    assetOut: poolDatum.assetB,
    minimumAmountOut: acceptedAmount,
    isLimitOrder: false,
    sender: address,
    availableUtxos: availableUtxos,
  });
}

export async function _swapExactOutTxExample(
  networkId: NetworkId,
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    networkId,
    adapter,
    poolId
  );

  const exactAmountOut = 10_000n;

  const { amountIn } = calculateSwapExactOut({
    exactAmountOut: exactAmountOut,
    reserveIn: poolState.reserveA,
    reserveOut: poolState.reserveB,
  });

  // Because pool is always fluctuating, so you should determine the impact of amount which you will receive
  const slippageTolerance = 20n;
  const necessaryAmountIn = (amountIn * (100n + slippageTolerance)) / 100n;

  const dex = new Dex(lucid);
  return await dex.buildSwapExactOutTx({
    maximumAmountIn: necessaryAmountIn,
    assetIn: ADA,
    assetOut: poolDatum.assetB,
    expectedAmountOut: exactAmountOut,
    sender: address,
    availableUtxos: availableUtxos,
  });
}

export async function _swapLimitExample(
  networkId: NetworkId,
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolDatum } = await getPoolById(networkId, adapter, poolId);

  const swapAmountADA = 10_000_000n;

  // use your limit price to determine the minimum amount of MIN you want to receive
  // if the pool can give more MIN (price equal or better) then the order will be batched
  const acceptedAmountMIN = 100n;

  const dex = new Dex(lucid);
  return await dex.buildSwapExactInTx({
    amountIn: swapAmountADA,
    assetIn: ADA,
    assetOut: poolDatum.assetB,
    minimumAmountOut: acceptedAmountMIN,
    isLimitOrder: true,
    sender: address,
    availableUtxos: availableUtxos,
  });
}

export async function _withdrawTxExample(
  networkId: NetworkId,
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    networkId,
    adapter,
    poolId
  );

  const lpAsset = Asset.fromString(poolState.assetLP);
  const withdrawalAmount = 100_000n;

  const { amountAReceive, amountBReceive } = calculateWithdraw({
    withdrawalLPAmount: withdrawalAmount,
    reserveA: poolState.reserveA,
    reserveB: poolState.reserveB,
    totalLiquidity: poolDatum.totalLiquidity,
  });

  // Because pool is always fluctuating, so you should determine the impact of amount which you will receive
  const slippageTolerance = 20n;
  const acceptedAmountAReceive =
    (amountAReceive * (100n - slippageTolerance)) / 100n;
  const acceptedAmountBReceive =
    (amountBReceive * (100n - slippageTolerance)) / 100n;

  const dex = new Dex(lucid);
  return await dex.buildWithdrawTx({
    lpAsset: lpAsset,
    lpAmount: withdrawalAmount,
    sender: address,
    minimumAssetAReceived: acceptedAmountAReceive,
    minimumAssetBReceived: acceptedAmountBReceive,
    availableUtxos: availableUtxos,
  });
}

export async function _zapTxExample(
  networkId: NetworkId,
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    networkId,
    adapter,
    poolId
  );

  const zapAmount = 10_000_000n;

  const lpAmountOut = calculateZapIn({
    amountIn: zapAmount,
    reserveIn: poolState.reserveA,
    reserveOut: poolState.reserveB,
    totalLiquidity: poolDatum.totalLiquidity,
  });

  // Because pool is always fluctuating, so you should determine the impact of amount which you will receive
  const slippageTolerance = 20n;
  const acceptedLPAmount = (lpAmountOut * (100n - slippageTolerance)) / 100n;

  const dex = new Dex(lucid);
  return await dex.buildZapInTx({
    sender: address,
    amountIn: zapAmount,
    assetIn: poolDatum.assetA,
    assetOut: poolDatum.assetB,
    minimumLPReceived: acceptedLPAmount,
    availableUtxos: availableUtxos,
  });
}

export async function _cancelTxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  orderOutRef: OutRef
): Promise<TxComplete> {
  const orderUtxo = (await lucid.utxosByOutRef([orderOutRef]))[0];
  invariant(orderUtxo.datumHash, "order utxo missing datum hash");
  orderUtxo.datum = await adapter.getDatumByDatumHash(orderUtxo.datumHash);
  const dex = new Dex(lucid);
  return dex.buildCancelOrder({
    orderUtxo,
    sender: address,
  });
}

// MARK: DEX V2
export async function _createPoolV2(
  lucid: Lucid,
  adapter: Adapter
): Promise<TxComplete> {
  const dexV2 = new DexV2(lucid, adapter);
  const txComplete = await dexV2.createPoolTx({
    assetA: ADA,
    assetB: {
      // Replace with your asset
      policyId: "a99569ec232f6b5ce2d81045417af541addca3c44de01be882b394ee",
      tokenName: "4c505f544f4b454e",
    },
    amountA: 10_000000n,
    amountB: 30_000n,
    tradingFeeNumerator: 100n,
  });

  return txComplete;
}

export async function _swapExactInV2TxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;

  const pool = await adapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "could not find pool");

  const swapAmount = 5_000_000n;
  const amountOut = DexV2Calculation.calculateAmountOut({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    amountIn: swapAmount,
    tradingFeeNumerator: pool.feeA[0],
  });

  // 20%
  const acceptedAmountOut = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: amountOut,
    type: "down",
  });

  return new DexV2(lucid, adapter).createBulkOrdersTx({
    sender: address,
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
  });
}

export async function _swapExactOutV2TxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;

  const swapAmount = 10_000n;
  const pool = await adapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "could not find pool");

  const amountIn = DexV2Calculation.calculateAmountIn({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    tradingFeeNumerator: pool.feeA[0],
    amountOut: swapAmount,
  });

  // 20%
  const maximumAmountIn = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: amountIn,
    type: "up",
  });

  return new DexV2(lucid, adapter).createBulkOrdersTx({
    sender: address,
    orderOptions: [
      {
        type: OrderV2.StepType.SWAP_EXACT_OUT,
        assetIn: assetA,
        maximumAmountIn: maximumAmountIn,
        expectedReceived: swapAmount,
        direction: OrderV2.Direction.A_TO_B,
        killOnFailed: false,
        lpAsset: pool.lpAsset,
      },
    ],
  });
}

export async function _depositV2TxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;

  const amountA = 10_000n;
  const amountB = 10_000n;

  const pool = await adapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "Pool not found");

  const lpAmount = DexV2Calculation.calculateDepositAmount({
    amountA,
    amountB,
    poolInfo: pool.info,
  });

  const acceptableLPAmount = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: lpAmount,
    type: "down",
  });

  return new DexV2(lucid, adapter).createBulkOrdersTx({
    sender: address,
    orderOptions: [
      {
        type: OrderV2.StepType.DEPOSIT,
        assetA,
        amountA: 10_000n,
        assetB,
        amountB: 10_000n,
        lpAsset: pool.lpAsset,
        minimumLPReceived: acceptableLPAmount,
        killOnFailed: false,
      },
    ],
  });
}

export async function _withdrawV2TxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
): Promise<TxComplete> {
  // ADA-MIN Lp Asset
  const lpAsset = {
    policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
    tokenName:
      "6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200",
  };
  const lpAmount = 20_000n;
  const pool = await adapter.getV2PoolByLp(lpAsset);
  invariant(pool, "Pool not found");
  const { withdrawalA, withdrawalB } = DexV2Calculation.calculateWithdrawAmount(
    {
      withdrawalLPAmount: lpAmount,
      totalLiquidity: pool.totalLiquidity,
      datumReserves: pool.datumReserves,
    }
  );

  const acceptableAmountAReceive = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: withdrawalA,
    type: "down",
  });

  const acceptableAmountBReceive = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: withdrawalB,
    type: "down",
  });

  return new DexV2(lucid, adapter).createBulkOrdersTx({
    sender: address,
    orderOptions: [
      {
        type: OrderV2.StepType.WITHDRAW,
        lpAmount: lpAmount,
        minimumAssetAReceived: acceptableAmountAReceive,
        minimumAssetBReceived: acceptableAmountBReceive,
        killOnFailed: false,
        lpAsset,
      },
    ],
  });
}

export async function _stopV2TxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;
  const amountA = 10_000n;

  const pool = await adapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "pool not found");
  const amountOut = DexV2Calculation.calculateAmountOut({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    amountIn: amountA,
    tradingFeeNumerator: pool.feeA[0],
  });

  // sell at 10% down
  const stopAmount = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 10,
    amount: amountOut,
    type: "down",
  });

  return new DexV2(lucid, adapter).createBulkOrdersTx({
    sender: address,
    orderOptions: [
      {
        type: OrderV2.StepType.STOP,
        assetIn: assetA,
        lpAsset: pool.lpAsset,
        amountIn: amountA,
        stopAmount,
        direction: OrderV2.Direction.A_TO_B,
      },
    ],
  });
}

export async function _ocoV2TxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;
  const amountA = 10_000n;

  const pool = await adapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "Pool not found");

  const amountOut = DexV2Calculation.calculateAmountOut({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    amountIn: amountA,
    tradingFeeNumerator: pool.feeA[0],
  });

  const limitAmount = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: amountOut,
    type: "up",
  });

  const stopAmount = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: amountOut,
    type: "down",
  });

  return new DexV2(lucid, adapter).createBulkOrdersTx({
    sender: address,
    orderOptions: [
      {
        type: OrderV2.StepType.OCO,
        amountIn: amountA,
        assetIn: assetA,
        lpAsset: pool.lpAsset,
        stopAmount,
        limitAmount,
        direction: OrderV2.Direction.A_TO_B,
      },
    ],
  });
}

export async function _zapOutV2TxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
): Promise<TxComplete> {
  // ADA-MIN Lp Asset
  const lpAsset = {
    policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
    tokenName:
      "6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200",
  };
  const lpAmount = 10_000n;
  const pool = await adapter.getV2PoolByLp(lpAsset);
  invariant(pool, "Pool not found");
  const zapAmountOut = DexV2Calculation.calculateZapOutAmount({
    withdrawalLPAmount: lpAmount,
    direction: OrderV2.Direction.B_TO_A,
    poolInfo: pool.info,
  });

  const acceptableZapOutAmount = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: zapAmountOut,
    type: "down",
  });

  return new DexV2(lucid, adapter).createBulkOrdersTx({
    sender: address,
    orderOptions: [
      {
        type: OrderV2.StepType.ZAP_OUT,
        lpAmount,
        direction: OrderV2.Direction.B_TO_A,
        minimumReceived: acceptableZapOutAmount,
        killOnFailed: false,
        lpAsset,
      },
    ],
  });
}

export async function _partialSwapV2TxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;
  const amountA = 10_000n;
  const pool = await adapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "Pool not found");

  const amountOut = DexV2Calculation.calculateAmountOut({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    amountIn: amountA,
    tradingFeeNumerator: pool.feeA[0],
  });

  // 20% above market
  const limitAmount = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: amountOut,
    type: "up",
  });

  const gcd = calculateGcd(amountA, limitAmount);
  const maximumSwaps = 2;

  return new DexV2(lucid, adapter).createBulkOrdersTx({
    sender: address,
    orderOptions: [
      {
        type: OrderV2.StepType.PARTIAL_SWAP,
        assetIn: assetA,
        amountIn: amountA,
        direction: OrderV2.Direction.A_TO_B,
        expectedInOutRatio: [amountA / gcd, limitAmount / gcd],
        maximumSwapTime: maximumSwaps,
        minimumSwapAmountRequired: BigInt(
          new BigNumber(getMinimumTradePercent(maximumSwaps))
            .div(100)
            .multipliedBy(amountA.toString())
            .toFixed(0)
        ),
        lpAsset: pool.lpAsset,
      },
    ],
  });
}

export async function _multiRoutingTxExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
): Promise<TxComplete> {
  const assetA = MIN;
  const amountA = 10_000n;

  // ADA-MIN Lp Asset
  const lpAssetA = {
    policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
    tokenName:
      "6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200",
  };
  // ADA-MileCoin Lp Asset
  const lpAssetB = {
    policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
    tokenName:
      "976edd2e047eedcd0d707df19155b9298d68020b8a68c2b27223539c4df57d3d",
  };
  const routings = [
    {
      lpAsset: lpAssetA,
      direction: OrderV2.Direction.B_TO_A,
    },
    {
      lpAsset: lpAssetB,
      direction: OrderV2.Direction.A_TO_B,
    },
  ];
  const pools = await Promise.all(
    routings.map(({ lpAsset }) => adapter.getV2PoolByLp(lpAsset))
  );
  invariant(pools.length === routings.length, "pools not found");

  let lastAmountIn = amountA;
  for (let i = 0; i < routings.length; i++) {
    const pool = pools[i];
    const routing = routings[i];
    invariant(pool, "Pool not found");
    const amountOut = DexV2Calculation.calculateAmountOut({
      reserveIn: pool.reserveA,
      reserveOut: pool.reserveB,
      amountIn: lastAmountIn,
      tradingFeeNumerator:
        routing.direction === OrderV2.Direction.A_TO_B
          ? pool.feeA[0]
          : pool.feeB[0],
    });
    lastAmountIn = amountOut;
  }

  const acceptableOutputAmount = calculateAmountWithSlippageTolerance({
    slippageTolerancePercent: 20,
    amount: lastAmountIn,
    type: "down",
  });

  return new DexV2(lucid, adapter).createBulkOrdersTx({
    sender: address,
    orderOptions: [
      {
        type: OrderV2.StepType.SWAP_ROUTING,
        assetIn: assetA,
        amountIn: amountA,
        routings: [
          {
            lpAsset: lpAssetA,
            direction: OrderV2.Direction.B_TO_A,
          },
          {
            lpAsset: lpAssetB,
            direction: OrderV2.Direction.A_TO_B,
          },
        ],
        minimumReceived: acceptableOutputAmount,
        lpAsset: lpAssetA,
      },
    ],
  });
}

export async function _cancelV2TxExample(
  lucid: Lucid,
  adapter: Adapter
): Promise<TxComplete> {
  return new DexV2(lucid, adapter).cancelOrder({
    orderOutRefs: [
      {
        // Replace with your tx hash of your Tx Order
        txHash:
          "a59e105fdf159a6b68385994cce84bf4801743482f858e9d504a1275bfb1cf5e",
        outputIndex: 0,
      },
    ],
  });
}

// MARK: STABLESWAP
export async function _swapStableExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await adapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  const swapAmount = 10n;

  // This pool has 2 assets in its config. They are [tDJED, tiUSD].
  // Index-0 Asset is tDJED. Index-1 Asset is tiUSD.
  // This order swaps 1_000n tDJED to ... tiUSD.
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

  return new Stableswap(lucid).createBulkOrdersTx({
    sender: address,
    availableUtxos: availableUtxos,
    options: [
      {
        lpAsset: lpAsset,
        type: StableOrder.StepType.SWAP,
        assetInAmount: swapAmount,
        assetInIndex: 0n,
        assetOutIndex: 1n,
        minimumAssetOut: amountOut,
      },
    ],
  });
}

export async function _depositStableExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await adapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  // This pool has 2 assets in its config. They are [tDJED, tiUSD].
  // This order deposits 100_000n tDJED and 1_000n tiUSD into the pool.
  const amountIns = [1_000n, 1_000n];

  const lpAmount = StableswapCalculation.calculateDeposit({
    amountIns: amountIns,
    totalLiquidity: pool.totalLiquidity,
    amp: pool.amp,
    multiples: config.multiples,
    datumBalances: pool.datum.balances,
    fee: config.fee,
    adminFee: config.adminFee,
    feeDenominator: config.feeDenominator,
  });

  return new Stableswap(lucid).createBulkOrdersTx({
    sender: address,
    availableUtxos: availableUtxos,
    options: [
      {
        lpAsset: lpAsset,
        type: StableOrder.StepType.DEPOSIT,
        assetsAmount: [
          [Asset.fromString(pool.assets[0]), 1_000n],
          [Asset.fromString(pool.assets[1]), 1_000n],
        ],
        minimumLPReceived: lpAmount,
        totalLiquidity: pool.totalLiquidity,
      },
    ],
  });
}

export async function _withdrawStableExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await adapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  const lpAmount = 100n;

  const amountOuts = StableswapCalculation.calculateWithdraw({
    withdrawalLPAmount: lpAmount,
    multiples: config.multiples,
    datumBalances: pool.datum.balances,
    totalLiquidity: pool.totalLiquidity,
  });

  return new Stableswap(lucid).createBulkOrdersTx({
    sender: address,
    availableUtxos: availableUtxos,
    options: [
      {
        lpAsset: lpAsset,
        type: StableOrder.StepType.WITHDRAW,
        lpAmount: lpAmount,
        minimumAmounts: amountOuts,
      },
    ],
  });
}

export async function _withdrawImbalanceStableExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await adapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  const withdrawAmounts = [100n, 100n];

  // This pool has 2 assets in its config. They are [tDJED, tiUSD].
  // This order withdraws exactly 1234n tDJED and 5678n tiUSD from the pool.
  const lpAmount = StableswapCalculation.calculateWithdrawImbalance({
    withdrawAmounts: withdrawAmounts,
    totalLiquidity: pool.totalLiquidity,
    amp: pool.amp,
    multiples: config.multiples,
    datumBalances: pool.datum.balances,
    fee: config.fee,
    adminFee: config.adminFee,
    feeDenominator: config.feeDenominator,
  });

  return new Stableswap(lucid).createBulkOrdersTx({
    sender: address,
    availableUtxos: availableUtxos,
    options: [
      {
        lpAsset: lpAsset,
        type: StableOrder.StepType.WITHDRAW_IMBALANCE,
        lpAmount: lpAmount,
        withdrawAmounts: withdrawAmounts,
      },
    ],
  });
}

export async function _zapOutStableExample(
  lucid: Lucid,
  adapter: Adapter,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await adapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  // This pool has 2 assets in its config. They are [tDJED, tiUSD].
  // This order withdraws xxx tiUSD by 12345 Lp Assets from the pool.
  const lpAmount = 10n;
  const outIndex = 0;
  const amountOut = StableswapCalculation.calculateZapOut({
    amountLpIn: lpAmount,
    outIndex: outIndex,
    totalLiquidity: pool.totalLiquidity,
    amp: pool.amp,
    multiples: config.multiples,
    datumBalances: pool.datum.balances,
    fee: config.fee,
    adminFee: config.adminFee,
    feeDenominator: config.feeDenominator,
  });

  return new Stableswap(lucid).createBulkOrdersTx({
    sender: address,
    availableUtxos: availableUtxos,
    options: [
      {
        lpAsset: lpAsset,
        type: StableOrder.StepType.ZAP_OUT,
        lpAmount: lpAmount,
        assetOutIndex: BigInt(outIndex),
        minimumAssetOut: amountOut,
      },
    ],
  });
}

export async function _bulkOrderStableExample(
  lucid: Lucid,
  address: string,
  availableUtxos: Utxo[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const lpAmount = 100n;
  const outIndex = 0;

  return new Stableswap(lucid).createBulkOrdersTx({
    sender: address,
    availableUtxos: availableUtxos,
    options: [
      {
        lpAsset: lpAsset,
        type: StableOrder.StepType.ZAP_OUT,
        lpAmount: lpAmount,
        assetOutIndex: BigInt(outIndex),
        minimumAssetOut: 1n,
      },
      {
        lpAsset: lpAsset,
        type: StableOrder.StepType.SWAP,
        assetInAmount: 10n,
        assetInIndex: 0n,
        assetOutIndex: 1n,
        minimumAssetOut: 1n,
      },
    ],
  });
}

export async function _cancelStableExample(
  lucid: Lucid,
  outRef: OutRef
): Promise<TxComplete> {
  const orderUtxos = await lucid.utxosByOutRef([outRef]);
  invariant(orderUtxos.length > 0, "Can not find order to cancel");
  return new Stableswap(lucid).buildCancelOrdersTx({
    orderUtxos: orderUtxos,
  });
}

// MARK: LBE V2
const ONE_MINUTE_IN_MS = 1000 * 60;
const ONE_HOUR_IN_MS = 1000 * 60 * 60;
const _ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;

// Example Tx: e1f42baa7b685acf083d5a3ffe4eefd1f53f4682226f0f39de56310de108239b
export async function _createLbeV2EventExample(
  lucid: Lucid,
  address: string,
  adapter: Adapter,
  asset: string
): Promise<TxComplete> {
  // Replace with your asset here
  const baseAsset = Asset.fromString(asset);
  const curSlot = lucid.utils.unixTimeToSlots(Date.now());
  const curDate = lucid.utils.slotsToUnixTime(curSlot);
  const lbeV2Parameters: LbeV2Types.LbeV2Parameters = {
    baseAsset: baseAsset,
    reserveBase: 10n,
    raiseAsset: ADA,
    startTime: BigInt(curDate + ONE_MINUTE_IN_MS),
    endTime: BigInt(curDate + 2 * ONE_HOUR_IN_MS),
    owner: address,
    receiver: address,
    poolAllocation: 100n,
    minimumOrderRaise: undefined,
    minimumRaise: 50n,
    maximumRaise: 100n,
    penaltyConfig: {
      penaltyStartTime: BigInt(curDate + ONE_MINUTE_IN_MS * 2),
      percent: 20n,
    },
    revocable: true,
    poolBaseFee: 30n,
  };
  const factory = await adapter.getLbeV2Factory(
    lbeV2Parameters.baseAsset,
    lbeV2Parameters.raiseAsset
  );
  invariant(factory !== null, "Can not find factory");
  const factoryUtxos = await lucid.utxosByOutRef([
    { outputIndex: factory.txIn.index, txHash: factory.txIn.txHash },
  ]);
  invariant(factoryUtxos.length !== 0, "Can not find factory utxo");
  const projectDetails = {
    eventName: "TEST SDK",
    description: "test lbe v2 in public sdk",
    socialLinks: {
      twitter: "https://x.com/MinswapDEX",
      telegram: "https://t.me/MinswapMafia",
      discord: "https://discord.gg/minswap",
      website: "https://minswap.org/",
    },
    tokenomics: [
      {
        tag: "admin",
        percentage: "70",
      },
      {
        tag: "LBE",
        percentage: "30",
      },
    ],
  };
  const currentSlot = await adapter.currentSlot();
  return new LbeV2(lucid).createEvent({
    factoryUtxo: factoryUtxos[0],
    lbeV2Parameters: lbeV2Parameters,
    currentSlot: currentSlot,
    sellerOwner: address,
    sellerCount: 10,
    projectDetails: projectDetails,
  });
}

// Example Tx: 40116c275da234ec6b7c88ff38dfa45ad18c7c1388c2d3f8f6e43dfef90b7e70
export async function _updateLbeV2EventExample(
  lucid: Lucid,
  address: string,
  adapter: Adapter,
  asset: string
): Promise<TxComplete> {
  // Replace with your asset here
  const baseAsset = Asset.fromString(asset);
  const curSlot = lucid.utils.unixTimeToSlots(Date.now());
  const curDate = lucid.utils.slotsToUnixTime(curSlot);
  const lbeV2Parameters: LbeV2Types.LbeV2Parameters = {
    baseAsset: baseAsset,
    reserveBase: 100n,
    raiseAsset: ADA,
    startTime: BigInt(curDate + _ONE_DAY_IN_MS * 20),
    endTime: BigInt(curDate + _ONE_DAY_IN_MS * 20 + 2 * ONE_HOUR_IN_MS),
    owner: address,
    receiver: address,
    poolAllocation: 100n,
    minimumOrderRaise: undefined,
    minimumRaise: 50n,
    maximumRaise: 100n,
    penaltyConfig: {
      penaltyStartTime: BigInt(
        curDate + _ONE_DAY_IN_MS * 20 + 10 * ONE_MINUTE_IN_MS
      ),
      percent: 20n,
    },
    revocable: true,
    poolBaseFee: 30n,
  };
  const projectDetails = {
    eventName: "TEST SDK hiiiiiiii",
    description: "test lbe v2 in public sdk",
    socialLinks: {
      twitter: "https://x.com/MinswapDEX",
      telegram: "https://t.me/MinswapMafia",
      discord: "https://discord.gg/minswap",
      website: "https://app.minswap.org/",
    },
    tokenomics: [
      {
        tag: "admin",
        percentage: "70",
      },
      {
        tag: "LBE",
        percentage: "30",
      },
    ],
  };
  const currentSlot = await adapter.currentSlot();
  const lbeId = PoolV2.computeLPAssetName(baseAsset, ADA);
  const treasury = await adapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, "Event is not created");
  const treasuryUtxos = await lucid.utxosByOutRef([
    { outputIndex: treasury.txIn.index, txHash: treasury.txIn.txHash },
  ]);
  invariant(treasuryUtxos.length !== 0, "Can not find factory utxo");
  return new LbeV2(lucid).updateEvent({
    owner: await lucid.wallet.address(),
    treasuryUtxo: treasuryUtxos[0],
    lbeV2Parameters: lbeV2Parameters,
    currentSlot: currentSlot,
    projectDetails: projectDetails,
  });
}

// Example Tx: b3c7049ff4402bdb2f3fe6522c720fad499d5f3dae512299dfb3a5e011a66496
export async function _lbeV2AddMoreSellersExample(
  lucid: Lucid,
  address: string,
  adapter: Adapter,
  asset: string
): Promise<TxComplete> {
  // Replace with your asset here
  const baseAsset = Asset.fromString(asset);
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await adapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

  const manager = await adapter.getLbeV2ManagerByLbeId(lbeId);
  invariant(manager !== null, `Can not find manager by lbeId ${lbeId}`);
  const managerUtxos = await lucid.utxosByOutRef([
    { txHash: manager.txIn.txHash, outputIndex: manager.txIn.index },
  ]);
  invariant(managerUtxos.length === 1, "Can not find manager Utxo");

  return new LbeV2(lucid).addSellers({
    treasuryUtxo: treasuryUtxos[0],
    managerUtxo: managerUtxos[0],
    addSellerCount: 2,
    sellerOwner: address,
    currentSlot: await adapter.currentSlot(),
  });
}

// Example Tx: b1819fbee0bb1eace80f97a75089a8b87047ea2f18959092949306e5301b048d
export async function _cancelLbeV2EventByOwnerExample(
  lucid: Lucid,
  address: string,
  adapter: Adapter,
  asset: string
): Promise<TxComplete> {
  // Replace with your asset here
  const baseAsset = Asset.fromString(asset);
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await adapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

  return new LbeV2(lucid).cancelEvent({
    treasuryUtxo: treasuryUtxos[0],
    cancelData: { reason: LbeV2Types.CancelReason.BY_OWNER, owner: address },
    currentSlot: await adapter.currentSlot(),
  });
}

// Example Tx: 7af5ea80b6a4a587e2c6cfce383367829f0cb68c90b65656c8198a72afc3f419
export async function _lbeV2DepositOrderExample(
  lucid: Lucid,
  address: string,
  adapter: Adapter,
  asset: string
): Promise<TxComplete> {
  // Replace with your asset here
  const baseAsset = Asset.fromString(asset);
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await adapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

  const seller = await adapter.getLbeV2SellerByLbeId(lbeId);
  invariant(seller !== null, `Can not find seller by lbeId ${lbeId}`);
  const sellerUtxos = await lucid.utxosByOutRef([
    { txHash: seller.txIn.txHash, outputIndex: seller.txIn.index },
  ]);
  invariant(sellerUtxos.length === 1, "Can not find seller Utxo");

  const orders = await adapter.getLbeV2OrdersByLbeIdAndOwner(lbeId, address);
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

  const currentSlot = await adapter.currentSlot();
  return new LbeV2(lucid).depositOrWithdrawOrder({
    currentSlot: currentSlot,
    existingOrderUtxos: orderUtxos,
    treasuryUtxo: treasuryUtxos[0],
    sellerUtxo: sellerUtxos[0],
    owner: address,
    action: { type: "deposit", additionalAmount: 1_000_000n },
  });
}

// Example Tx: 3388b9ce7f2175576b12ac48eacfb78da24b2319ab0595b5cc6bf9531e781eef
export async function _lbeV2WithdrawOrderExample(
  lucid: Lucid,
  address: string,
  adapter: Adapter,
  asset: string
): Promise<TxComplete> {
  // Replace with your asset here
  const baseAsset = Asset.fromString(asset);
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await adapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

  const seller = await adapter.getLbeV2SellerByLbeId(lbeId);
  invariant(seller !== null, `Can not find seller by lbeId ${lbeId}`);
  const sellerUtxos = await lucid.utxosByOutRef([
    { txHash: seller.txIn.txHash, outputIndex: seller.txIn.index },
  ]);
  invariant(sellerUtxos.length === 1, "Can not find seller Utxo");

  const orders = await adapter.getLbeV2OrdersByLbeIdAndOwner(lbeId, address);
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

  const currentSlot = await adapter.currentSlot();
  return new LbeV2(lucid).depositOrWithdrawOrder({
    currentSlot: currentSlot,
    existingOrderUtxos: orderUtxos,
    treasuryUtxo: treasuryUtxos[0],
    sellerUtxo: sellerUtxos[0],
    owner: address,
    action: { type: "withdraw", withdrawalAmount: 10n },
  });
}

// Example Tx: 9667528ebfe0c51aad3c6ef6b1dc7e1660c55c8d712d30eb81a5520dd4aca780
export async function _lbeV2CloseEventExample(
  lucid: Lucid,
  address: string,
  adapter: Adapter,
  asset: string
): Promise<TxComplete> {
  // Replace with your asset here
  const baseAsset = Asset.fromString(asset);
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await adapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const headAndTailFactory = await adapter.getLbeV2HeadAndTailFactory(lbeId);
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
  const currentSlot = await adapter.currentSlot();

  return new LbeV2(lucid).closeEventTx({
    treasuryUtxo: treasuryUtxos[0],
    headFactoryUtxo: headFactoryUtxos[0],
    tailFactoryUtxo: tailFactoryUtxos[0],
    currentSlot: currentSlot,
    owner: address,
  });
}

export function calculateGcd(a: bigint, b: bigint): bigint {
  if (!b) {
    return a;
  }
  const remainder = a > b ? a % b : b % a;
  return calculateGcd(a > b ? b : a, remainder);
}

export function getMinimumTradePercent(maxTradeTime: number): number {
  switch (maxTradeTime) {
    case 2: {
      return 40;
    }
    case 3: {
      return 25;
    }
    case 4: {
      return 20;
    }
    case 5: {
      return 15;
    }
    default: {
      return 100;
    }
  }
}
