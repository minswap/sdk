# Minswap AMM V2 & Stableswap Classes Documentation

## Overview

This documentation provides details on how to interact with the **Stableswap** and **AMM V2** classes in the Minswap platform. These classes allow users to create stableswap orders, manage liquidity pools, and interact with decentralized exchanges (DEXs) using Minswap's platform, while benefiting from Minswap Batcher fee discounts.

### Transaction Builder Functions

- **Stableswap class**: Located in `src/stableswap.ts`.
- **AMM V2 class**: Located in `src/dex-v2.ts`.
- **Example file**: Demonstrates usage of both classes, located in `examples/example.ts`.

### Utility Functions

- All utility functions are located in the [Calculate](../src/calculate.ts) file. These functions provide the necessary calculations for operations such as trades, deposits, and withdrawals related to the DEX V2 and Stable Liquidity Pool.
- You can combine these utility functions with the [Slippage](../src/utils/slippage.internal.ts) file to manage volatile liquidity pools efficiently.

### Batcher Fee Discount

Currently, everyone who swaps on the Minswap DEX pays a 2 $ADA fee to execute the DEX order. To increase the utility of the $MIN token within the platform, $MIN holders are entitled to a discount on this 2 $ADA Batcher Fee. More details about this can be found in the [Minswap Official Docs](https://docs.minswap.org/min-token/usdmin-tokenomics/trading-fee-discount).

Technically, the Batcher Fee Discount is calculated based on the ADA-MIN LP Tokens and MIN tokens that users are holding. This calculation is handled by the [BatcherFee.finalizeFee](../src/batcher-fee-reduction/calculate.ts#L11) function.

If you are transacting through the `Stableswap` or `DexV2` classes, the transaction is automatically constructed with the Batcher Fee Discount if you are eligible for it.

---

## Example Usage

### 1. Make a Trade on a Stable Pool

```typescript
const network: Network = "Preprod";
const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

const address = "<YOUR_ADDRESS>";

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

const utxos = await lucid.utxosAt(address);

const lpAsset = Asset.fromString("<STABLE_POOL_LP_ASSET>");
const config = StableswapConstant.getConfigByLpAsset(lpAsset, NetworkId.TESTNET);

const pool = await blockfrostAdapter.getStablePoolByLpAsset(lpAsset);

invariant(pool, `Can not find pool by lp asset ${Asset.toString(lpAsset)}`);

const swapAmount = 1_000n;

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
      assetInIndex: 0n,
      assetOutIndex: 1n,
      minimumAssetOut: amountOut,
    },
  ],
});

const signedTx = await txComplete.signWithPrivateKey("<YOUR_PRIVATE_KEY>").complete();
const txId = await signedTx.submit();
console.info(`Transaction submitted successfully: ${txId}`);
```

### 2. Make a Trade on a DEX V2 Pool

```typescript
const network: Network = "Preprod";
const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

const address = "<YOUR_ADDRESS>";

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

const utxos = await lucid.utxosAt(address);

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
// 20% slippage tolerance
const slippageTolerance = new BigNumber(20).div(100);
const acceptedAmountOut = Slippage.apply({
  slippage: slippageTolerance,
  amount: amountOut,
  type: "down",
});

const txComplete = await new DexV2(lucid, blockfrostAdapter).createBulkOrdersTx({
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
});

const signedTx = await txComplete.signWithPrivateKey("<YOUR_PRIVATE_KEY>").complete();
const txId = await signedTx.submit();
console.info(`Transaction submitted successfully: ${txId}`);

```

### 3. Create the DEX V2 Liquiditiy Pool

```typescript
const network: Network = "Preprod";
const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

const address = "<YOUR_ADDRESS>";

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

const utxos = await lucid.utxosAt(address);

const txComplete = await new DexV2(lucid, blockfrostAdapter).createPoolTx({
  assetA: ADA,
  assetB: {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    tokenName: "434d",
  },
  amountA: 10_000000n,
  amountB: 300_000000n,
  tradingFeeNumerator: 100n,
});

const signedTx = await txComplete.signWithPrivateKey("<YOUR_PRIVATE_KEY>").complete();
const txId = await signedTx.submit();
console.info(`Transaction submitted successfully: ${txId}`);
```

## Additional Examples

You can explore more examples in the [Examples](../examples/example.ts) folder to learn how to integrate the Stableswap and DexV2 classes in more complex scenarios.

## Conclusion
The Stableswap and AMM V2 classes offer powerful tools for interacting with Minswap’s decentralized exchange. They allow users to easily manage liquidity pools and make swaps, with built-in support for Minswap Batcher Fee discounts. By utilizing these classes, users can create efficient transactions and leverage the utility of $MIN to reduce costs.

For more details, you can refer to the specific class files:

- [Stableswap class](../src/stableswap.ts)
- [AMM V2 class](../src/dex-v2.ts)