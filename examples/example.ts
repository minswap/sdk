import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import invariant from "@minswap/tiny-invariant";
import BigNumber from "bignumber.js";
import {
  Address,
  Blockfrost,
  Constr,
  Data,
  Lucid,
  Network,
  OutRef,
  TxComplete,
  UTxO,
} from "lucid-cardano";

import {
  ADA,
  Asset,
  BlockfrostAdapter,
  calculateDeposit,
  calculateSwapExactIn,
  calculateSwapExactOut,
  calculateWithdraw,
  calculateZapIn,
  Dex,
  DexV2,
  DexV2Calculation,
  NetworkId,
  OrderV2,
  PoolV1,
  PoolV2,
  StableOrder,
  StableswapCalculation,
  StableswapConstant,
} from "../src";
import { LbeV2 } from "../src/lbe-v2";
import { Stableswap } from "../src/stableswap";
import { LbeV2Types } from "../src/types/lbe-v2";
import { Slippage } from "../src/utils/slippage.internal";

const MIN: Asset = {
  policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
  tokenName: "4d494e",
};

async function main(): Promise<void> {
  const network: Network = "Preprod";
  const blockfrostProjectId = "hihi";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address =
    "addr_test1qqf2dhk96l2kq4xh2fkhwksv0h49vy9exw383eshppn863jereuqgh2zwxsedytve5gp9any9jwc5hz98sd47rwfv40stc26fr";
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

  // const utxos = await lucid.utxosAt(address);

  const txComplete = await _lbeV2AddMoreSellersExample(
    lucid,
    address,
    blockfrostAdapter
  );
  const signedTx = await txComplete.signWithPrivateKey("hihi").complete();

  const txId = await signedTx.submit();
  console.info(`Transaction submitted successfully: ${txId}`);
}

async function getPoolById(
  network: Network,
  blockfrostAdapter: BlockfrostAdapter,
  poolId: string
): Promise<{ poolState: PoolV1.State; poolDatum: PoolV1.Datum }> {
  const pool = await blockfrostAdapter.getV1PoolById({
    id: poolId,
  });
  if (!pool) {
    throw new Error(`Not found PoolState of ID: ${poolId}`);
  }

  const rawRoolDatum = await blockfrostAdapter.getDatumByDatumHash(
    pool.datumHash
  );
  const poolDatum = PoolV1.Datum.fromPlutusData(
    network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET,
    Data.from(rawRoolDatum) as Constr<Data>
  );
  return {
    poolState: pool,
    poolDatum: poolDatum,
  };
}

// MARK: DEX V1
async function _depositTxExample(
  network: Network,
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    network,
    blockfrostAdapter,
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
  const slippageTolerance = 20n;
  const acceptedLPAmount = (lpAmount * (100n - slippageTolerance)) / 100n;

  const dex = new Dex(lucid);
  return await dex.buildDepositTx({
    amountA: necessaryAmountA,
    amountB: necessaryAmountB,
    assetA: poolDatum.assetA,
    assetB: poolDatum.assetB,
    sender: address,
    minimumLPReceived: acceptedLPAmount,
    availableUtxos: availableUtxos,
  });
}

async function _swapExactInTxExample(
  network: Network,
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    network,
    blockfrostAdapter,
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

async function _swapExactOutTxExample(
  network: Network,
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    network,
    blockfrostAdapter,
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

async function _swapLimitExample(
  network: Network,
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolDatum } = await getPoolById(network, blockfrostAdapter, poolId);

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

async function _withdrawTxExample(
  network: Network,
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    network,
    blockfrostAdapter,
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

async function _zapTxExample(
  network: Network,
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  // ID of ADA-MIN Pool on Testnet Preprod
  const poolId =
    "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";

  const { poolState, poolDatum } = await getPoolById(
    network,
    blockfrostAdapter,
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

async function _cancelTxExample(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter,
  address: Address,
  orderOutRef: OutRef
): Promise<TxComplete> {
  const orderUtxo = (await lucid.utxosByOutRef([orderOutRef]))[0];
  invariant(orderUtxo.datumHash, "order utxo missing datum hash");
  orderUtxo.datum = await blockFrostAdapter.getDatumByDatumHash(
    orderUtxo.datumHash
  );
  const dex = new Dex(lucid);
  return dex.buildCancelOrder({
    orderUtxo,
    sender: address,
  });
}

// MARK: DEX V2
async function _createPoolV2(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter
): Promise<TxComplete> {
  const dexV2 = new DexV2(lucid, blockFrostAdapter);
  const txComplete = await dexV2.createPoolTx({
    assetA: ADA,
    assetB: {
      policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
      tokenName: "434d",
    },
    amountA: 10_000000n,
    amountB: 300_000000n,
    tradingFeeNumerator: 100n,
  });

  return txComplete;
}

async function _swapExactInV2TxExample(
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;

  const pool = await blockfrostAdapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "could not find pool");

  const swapAmount = 5_000_000n;
  const amountOut = DexV2Calculation.calculateAmountOut({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    amountIn: swapAmount,
    tradingFeeNumerator: pool.feeA[0],
  });
  // 20%
  const slippageTolerance = new BigNumber(20).div(100);
  const acceptedAmountOut = Slippage.apply({
    slippage: slippageTolerance,
    amount: amountOut,
    type: "down",
  });

  return new DexV2(lucid, blockfrostAdapter).createBulkOrdersTx({
    sender: address,
    availableUtxos: availableUtxos,
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

async function _swapExactOutV2TxExample(
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;

  const swapAmount = 10_000n;
  const pool = await blockfrostAdapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "could not find pool");

  const amountIn = DexV2Calculation.calculateAmountIn({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    tradingFeeNumerator: pool.feeA[0],
    amountOut: swapAmount,
  });

  // 20%
  const slippageTolerance = new BigNumber(20).div(100);
  const maximumAmountIn = Slippage.apply({
    slippage: slippageTolerance,
    amount: amountIn,
    type: "up",
  });
  return new DexV2(lucid, blockfrostAdapter).createBulkOrdersTx({
    sender: address,
    availableUtxos: availableUtxos,
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

async function _depositV2TxExample(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;

  const amountA = 10_000n;
  const amountB = 10_000n;

  const pool = await blockFrostAdapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "Pool not found");

  const lpAmount = DexV2Calculation.calculateDepositAmount({
    amountA,
    amountB,
    poolInfo: pool.info,
  });

  const slippageTolerance = new BigNumber(20).div(100);
  const acceptableLPAmount = Slippage.apply({
    slippage: slippageTolerance,
    amount: lpAmount,
    type: "down",
  });

  return new DexV2(lucid, blockFrostAdapter).createBulkOrdersTx({
    sender: address,
    availableUtxos,
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

async function _withdrawV2TxExample(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  // ADA-MIN Lp Asset
  const lpAsset = {
    policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
    tokenName:
      "6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200",
  };
  const lpAmount = 20_000n;
  const pool = await blockFrostAdapter.getV2PoolByLp(lpAsset);
  invariant(pool, "Pool not found");
  const { withdrawalA, withdrawalB } =
    await DexV2Calculation.calculateWithdrawAmount({
      withdrawalLPAmount: lpAmount,
      totalLiquidity: pool.totalLiquidity,
      datumReserves: pool.datumReserves,
    });

  const slippageTolerance = new BigNumber(20).div(100);
  const acceptableAmountAReceive = Slippage.apply({
    slippage: slippageTolerance,
    amount: withdrawalA,
    type: "down",
  });
  const acceptableAmountBReceive = Slippage.apply({
    slippage: slippageTolerance,
    amount: withdrawalB,
    type: "down",
  });
  return new DexV2(lucid, blockFrostAdapter).createBulkOrdersTx({
    sender: address,
    availableUtxos,
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

async function _stopV2TxExample(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;
  const amountA = 10_000n;

  const pool = await blockFrostAdapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "pool not found");
  const amountOut = DexV2Calculation.calculateAmountOut({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    amountIn: amountA,
    tradingFeeNumerator: pool.feeA[0],
  });

  // sell at 10% down
  const stopAmount = Slippage.apply({
    slippage: new BigNumber(10).div(100),
    amount: amountOut,
    type: "down",
  });

  return new DexV2(lucid, blockFrostAdapter).createBulkOrdersTx({
    sender: address,
    availableUtxos,
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

async function _ocoV2TxExample(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;
  const amountA = 10_000n;

  const pool = await blockFrostAdapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "Pool not found");

  const amountOut = DexV2Calculation.calculateAmountOut({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    amountIn: amountA,
    tradingFeeNumerator: pool.feeA[0],
  });
  const limitAmount = Slippage.apply({
    slippage: new BigNumber(20).div(100),
    amount: amountOut,
    type: "up",
  });
  const stopAmount = Slippage.apply({
    slippage: new BigNumber(20).div(100),
    amount: amountOut,
    type: "down",
  });
  return new DexV2(lucid, blockFrostAdapter).createBulkOrdersTx({
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
    availableUtxos,
  });
}

async function _zapOutV2TxExample(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  // ADA-MIN Lp Asset
  const lpAsset = {
    policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
    tokenName:
      "6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200",
  };
  const lpAmount = 10_000n;
  const pool = await blockFrostAdapter.getV2PoolByLp(lpAsset);
  invariant(pool, "Pool not found");
  const zapAmountOut = DexV2Calculation.calculateZapOutAmount({
    withdrawalLPAmount: lpAmount,
    direction: OrderV2.Direction.B_TO_A,
    poolInfo: pool.info,
  });

  const slippageTolerance = new BigNumber(20).div(100);
  const acceptableZapOutAmount = Slippage.apply({
    slippage: slippageTolerance,
    amount: zapAmountOut,
    type: "down",
  });

  return new DexV2(lucid, blockFrostAdapter).createBulkOrdersTx({
    sender: address,
    availableUtxos,
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

async function _partialSwapV2TxExample(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const assetA = ADA;
  const assetB = MIN;
  const amountA = 10_000n;
  const pool = await blockFrostAdapter.getV2PoolByPair(assetA, assetB);
  invariant(pool, "Pool not found");

  const amountOut = DexV2Calculation.calculateAmountOut({
    reserveIn: pool.reserveA,
    reserveOut: pool.reserveB,
    amountIn: amountA,
    tradingFeeNumerator: pool.feeA[0],
  });
  // 20% above market
  const limitAmount = Slippage.apply({
    slippage: new BigNumber(20).div(100),
    amount: amountOut,
    type: "up",
  });

  const gcd = calculateGcd(amountA, limitAmount);
  const maximumSwaps = 2;

  return new DexV2(lucid, blockFrostAdapter).createBulkOrdersTx({
    sender: address,
    availableUtxos,
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

async function _multiRoutingTxExample(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
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
    routings.map(({ lpAsset }) => blockFrostAdapter.getV2PoolByLp(lpAsset))
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

  const slippageTolerance = new BigNumber(20).div(100);
  const acceptableOutputAmount = Slippage.apply({
    slippage: slippageTolerance,
    amount: lastAmountIn,
    type: "down",
  });

  return new DexV2(lucid, blockFrostAdapter).createBulkOrdersTx({
    sender: address,
    availableUtxos,
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

async function _cancelV2TxExample(
  lucid: Lucid,
  blockFrostAdapter: BlockfrostAdapter
): Promise<TxComplete> {
  return new DexV2(lucid, blockFrostAdapter).cancelOrder({
    orderOutRefs: [
      {
        txHash:
          "83e22abd3fad8525b02bf2fd1c8e8d0dbc37dbbe09384d666699081ee3e6f282",
        outputIndex: 0,
      },
    ],
  });
}

// MARK: STABLESWAP
async function _swapStableExample(
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await blockfrostAdapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  const swapAmount = 1_000n;

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

async function _depositStableExample(
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await blockfrostAdapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  // This pool has 2 assets in its config. They are [tDJED, tiUSD].
  // This order deposits 100_000n tDJED and 1_000n tiUSD into the pool.
  const amountIns = [100_000n, 1_000n];

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
          [Asset.fromString(pool.assets[0]), 100_000n],
          [Asset.fromString(pool.assets[1]), 1_000n],
        ],
        minimumLPReceived: lpAmount,
        totalLiquidity: pool.totalLiquidity,
      },
    ],
  });
}

async function _withdrawStableExample(
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await blockfrostAdapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  const lpAmount = 10_000n;

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

async function _withdrawImbalanceStableExample(
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await blockfrostAdapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  const withdrawAmounts = [1234n, 5678n];

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

async function _zapOutStableExample(
  lucid: Lucid,
  blockfrostAdapter: BlockfrostAdapter,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const config = StableswapConstant.getConfigByLpAsset(
    lpAsset,
    NetworkId.TESTNET
  );

  const pool = await blockfrostAdapter.getStablePoolByLpAsset(lpAsset);

  invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

  // This pool has 2 assets in its config. They are [tDJED, tiUSD].
  // This order withdraws xxx tiUSD by 12345 Lp Assets from the pool.
  const lpAmount = 12345n;
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

async function _bulkOrderStableExample(
  lucid: Lucid,
  address: Address,
  availableUtxos: UTxO[]
): Promise<TxComplete> {
  const lpAsset = Asset.fromString(
    "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70"
  );
  const lpAmount = 12345n;
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
        assetInAmount: 1000n,
        assetInIndex: 0n,
        assetOutIndex: 1n,
        minimumAssetOut: 1n,
      },
    ],
  });
}

async function _cancelStableExample(lucid: Lucid): Promise<TxComplete> {
  const orderUtxos = await lucid.utxosByOutRef([
    {
      txHash:
        "c3ad8e0aa159a22a14088474908e5c23ba6772a6aa82f8250e7e8eaa1016b2d8",
      outputIndex: 0,
    },
    {
      txHash:
        "72e57a1fd90bf0b9291a6fa8e04793099d51df7844813689dde67ce3eea03c1f",
      outputIndex: 0,
    },
  ]);
  invariant(orderUtxos.length === 2, "Can not find order to cancel");
  return new Stableswap(lucid).buildCancelOrdersTx({
    orderUtxos: orderUtxos,
  });
}

// MARK: LBE V2
const ONE_MINUTE_IN_MS = 1000 * 60;
const ONE_HOUR_IN_MS = 1000 * 60 * 60;
const _ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;

// Example Tx: e1f42baa7b685acf083d5a3ffe4eefd1f53f4682226f0f39de56310de108239b
async function _createLbeV2EventExample(
  lucid: Lucid,
  address: Address,
  blockfrostAdapter: BlockfrostAdapter
): Promise<TxComplete> {
  const baseAsset = Asset.fromString(
    "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0bfdfc61f25b3065a310ba3e352159125910b947b7aee704728318949933127cdc"
  );
  const curSlot = lucid.currentSlot();
  const curDate = lucid.utils.slotToUnixTime(curSlot);
  const lbeV2Parameters: LbeV2Types.LbeV2Parameters = {
    baseAsset: baseAsset,
    reserveBase: 100_000n,
    raiseAsset: ADA,
    startTime: BigInt(curDate + ONE_HOUR_IN_MS),
    endTime: BigInt(curDate + 2 * ONE_HOUR_IN_MS),
    owner: address,
    receiver: address,
    poolAllocation: 100n,
    minimumOrderRaise: undefined,
    minimumRaise: 10_000_000n,
    maximumRaise: 100_000_000n,
    penaltyConfig: {
      penaltyStartTime: BigInt(
        curDate + ONE_HOUR_IN_MS + 20 * ONE_MINUTE_IN_MS
      ),
      percent: 20n,
    },
    revocable: true,
    poolBaseFee: 30n,
  };
  const factory = await blockfrostAdapter.getLbeV2Factory(
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
  const currentSlot = await blockfrostAdapter.currentSlot();
  return new LbeV2(lucid).createEvent({
    factoryUtxo: factoryUtxos[0],
    lbeV2Parameters: lbeV2Parameters,
    currentSlot: currentSlot,
    sellerOwner: address,
    sellerCount: 10,
    projectDetails: projectDetails,
  });
}

// Example Tx: b3c7049ff4402bdb2f3fe6522c720fad499d5f3dae512299dfb3a5e011a66496
async function _lbeV2AddMoreSellersExample(
  lucid: Lucid,
  address: Address,
  blockfrostAdapter: BlockfrostAdapter
): Promise<TxComplete> {
  const baseAsset = Asset.fromString(
    "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed7243414b45"
  );
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await blockfrostAdapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

  const manager = await blockfrostAdapter.getLbeV2ManagerByLbeId(lbeId);
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
    currentSlot: await blockfrostAdapter.currentSlot(),
  });
}

// Example Tx: b1819fbee0bb1eace80f97a75089a8b87047ea2f18959092949306e5301b048d
async function _cancelLbeV2EventByOwnerExample(
  lucid: Lucid,
  address: Address,
  blockfrostAdapter: BlockfrostAdapter
): Promise<TxComplete> {
  const baseAsset = Asset.fromString(
    "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d865190718981e4e7fab3eb80963f14148714d7a7847652d4017d0fb744db075027"
  );
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await blockfrostAdapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

  return new LbeV2(lucid).cancelEvent({
    treasuryUtxo: treasuryUtxos[0],
    cancelData: { reason: LbeV2Types.CancelReason.BY_OWNER, owner: address },
    currentSlot: await blockfrostAdapter.currentSlot(),
  });
}

// Example Tx: 7af5ea80b6a4a587e2c6cfce383367829f0cb68c90b65656c8198a72afc3f419
async function _lbeV2DepositOrderExample(
  lucid: Lucid,
  address: Address,
  blockfrostAdapter: BlockfrostAdapter
): Promise<TxComplete> {
  const baseAsset = Asset.fromString(
    "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed7243414b45"
  );
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await blockfrostAdapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

  const seller = await blockfrostAdapter.getLbeV2SellerByLbeId(lbeId);
  invariant(seller !== null, `Can not find seller by lbeId ${lbeId}`);
  const sellerUtxos = await lucid.utxosByOutRef([
    { txHash: seller.txIn.txHash, outputIndex: seller.txIn.index },
  ]);
  invariant(sellerUtxos.length === 1, "Can not find seller Utxo");

  const orders = await blockfrostAdapter.getLbeV2OrdersByLbeIdAndOwner(
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

  const currentSlot = await blockfrostAdapter.currentSlot();
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
async function _lbeV2WithdrawOrderExample(
  lucid: Lucid,
  address: Address,
  blockfrostAdapter: BlockfrostAdapter
): Promise<TxComplete> {
  const baseAsset = Asset.fromString(
    "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed7243414b45"
  );
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  const treasury = await blockfrostAdapter.getLbeV2TreasuryByLbeId(lbeId);
  invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
  const treasuryUtxos = await lucid.utxosByOutRef([
    { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
  ]);
  invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

  const seller = await blockfrostAdapter.getLbeV2SellerByLbeId(lbeId);
  invariant(seller !== null, `Can not find seller by lbeId ${lbeId}`);
  const sellerUtxos = await lucid.utxosByOutRef([
    { txHash: seller.txIn.txHash, outputIndex: seller.txIn.index },
  ]);
  invariant(sellerUtxos.length === 1, "Can not find seller Utxo");

  const orders = await blockfrostAdapter.getLbeV2OrdersByLbeIdAndOwner(
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

  const currentSlot = await blockfrostAdapter.currentSlot();
  return new LbeV2(lucid).depositOrWithdrawOrder({
    currentSlot: currentSlot,
    existingOrderUtxos: orderUtxos,
    treasuryUtxo: treasuryUtxos[0],
    sellerUtxo: sellerUtxos[0],
    owner: address,
    action: { type: "withdraw", withdrawalAmount: 1_000_000n },
  });
}

// FAIL ???
async function _lbeV2CloseEventExample(
  lucid: Lucid,
  address: Address,
  blockfrostAdapter: BlockfrostAdapter
): Promise<TxComplete> {
  const baseAsset = Asset.fromString(
    "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0bfdfc61f25b3065a310ba3e352159125910b947b7aee704728318949933127cdc"
  );
  const raiseAsset = Asset.fromString("lovelace");

  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
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

/**
 * Initialize Lucid Instance for Browser Environment
 * @param network Network you're working on
 * @param projectId Blockfrost API KEY
 * @param blockfrostUrl Blockfrost URL
 * @returns
 */
async function _getBrowserLucidInstance(
  network: Network,
  projectId: string,
  blockfrostUrl: string
): Promise<Lucid> {
  const provider = new Blockfrost(blockfrostUrl, projectId);
  const lucid = await Lucid.new(provider, network);

  // This is an approach we can inject Eternl Extension to Lucid Instance
  // We can do similar with other wallet extensions
  const api = await window.cardano.eternl.enable();
  lucid.selectWallet(api);
  return lucid;
}

/**
 * Initialize Lucid Instance for Backend Environment
 * @param network Network you're working on
 * @param projectId Blockfrost API KEY
 * @param blockfrostUrl Blockfrost URL
 * @param address Your own address
 * @returns
 */
async function getBackendLucidInstance(
  network: Network,
  projectId: string,
  blockfrostUrl: string,
  address: Address
): Promise<Lucid> {
  const provider = new Blockfrost(blockfrostUrl, projectId);
  const lucid = await Lucid.new(provider, network);
  lucid.selectWalletFrom({
    address: address,
  });
  return lucid;
}

function calculateGcd(a: bigint, b: bigint): bigint {
  if (!b) {
    return a;
  }
  const remainder = a > b ? a % b : b % a;
  return calculateGcd(a > b ? b : a, remainder);
}

function getMinimumTradePercent(maxTradeTime: number): number {
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

void main();
