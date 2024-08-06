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
} from "../src";
import { Slippage } from "../src/utils/slippage.internal";

const MIN: Asset = {
  policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
  tokenName: "4d494e",
};

async function main(): Promise<void> {
  const network: Network = "Preprod";
  const blockfrostProjectId = "preprodel6eWcyCZddTV1wezpV1uNlt0GpUVAcw";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address =
    "addr_test1vrd9v47japxwp8540vsrh4grz4u9urfpfawwy7sf6r0vxqgm7wdxh";
  const lucid = await getBackendLucidInstance(
    network,
    blockfrostProjectId,
    blockfrostUrl,
    address
  );

  const blockfrostAdapter = new BlockfrostAdapter({
    networkId: NetworkId.TESTNET,
    blockFrost: new BlockFrostAPI({
      projectId: blockfrostProjectId,
      network: "preprod",
    }),
  });

  const utxos = await lucid.utxosAt(address);

  const txComplete = await _depositV2TxExample(
    lucid,
    blockfrostAdapter,
    address,
    utxos
  );
  const signedTx = await txComplete
    .signWithPrivateKey(
      "ed25519e_sk1zplkdlsqnqtrayzgukq262rw203qdvg383rgtnpjxcpj5c2jgfvx8vz5xzkxz9exm2t08v2tfhrazp6qd260wqfs0x5vckxl6zftx7cf9f9e2"
    )
    .complete();
  const txId = await signedTx.submit();
  // eslint-disable-next-line no-console
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

  const slippageTolerance = 20n;
  const acceptableLPAmount = (lpAmount * (100n - slippageTolerance)) / 100n;

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

void main();
