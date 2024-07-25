import Big from "big.js";

import { sqrt } from "./utils/sqrt.internal";

/**
 * Options to calculate Amount Out & Price Impact while swapping exact in
 * @amountIn The amount that we want to swap from
 * @reserveIn The Reserve of Asset In in Liquidity Pool
 * @reserveOut The Reserve of Asset Out in Liquidity Pool
 */
export type CalculateSwapExactInOptions = {
  amountIn: bigint;
  reserveIn: bigint;
  reserveOut: bigint;
};
/**
 * Calculate Amount Out & Price Impact while swapping exact in
 * @param options See @CalculateSwapExactInOptions description
 * @returns The amount of the other token that we get from the swap and its price impact
 */
export function calculateSwapExactIn(options: CalculateSwapExactInOptions): {
  amountOut: bigint;
  priceImpact: Big;
} {
  const { amountIn, reserveIn, reserveOut } = options;
  const amtOutNumerator = amountIn * 997n * reserveOut;
  const amtOutDenominator = amountIn * 997n + reserveIn * 1000n;

  const priceImpactNumerator =
    reserveOut * amountIn * amtOutDenominator * 997n -
    amtOutNumerator * reserveIn * 1000n;
  const priceImpactDenominator =
    reserveOut * amountIn * amtOutDenominator * 1000n;

  return {
    amountOut: amtOutNumerator / amtOutDenominator,
    priceImpact: new Big(priceImpactNumerator.toString())
      .mul(new Big(100))
      .div(new Big(priceImpactDenominator.toString())),
  };
}

/**
 * Options to calculate necessary Amount In & Price Impact to cover the @exactAmountOut while swapping exact out
 * @exactAmountOut The exact amount that we want to receive
 * @reserveIn The Reserve of Asset In in Liquidity Pool
 * @reserveOut The Reserve of Asset Out in Liquidity Pool
 */
export type CalculateSwapExactOutOptions = {
  exactAmountOut: bigint;
  reserveIn: bigint;
  reserveOut: bigint;
};
/**
 * Calculate necessary Amount In & Price Impact to cover the @exactAmountOut while swapping exact out
 * @param options See @CalculateSwapExactOutOptions description
 * @returns The amount needed of the input token for the swap and its price impact
 */
export function calculateSwapExactOut(options: CalculateSwapExactOutOptions): {
  amountIn: bigint;
  priceImpact: Big;
} {
  const { exactAmountOut, reserveIn, reserveOut } = options;
  const amtInNumerator = reserveIn * exactAmountOut * 1000n;
  const amtInDenominator = (reserveOut - exactAmountOut) * 997n;

  const priceImpactNumerator =
    reserveOut * amtInNumerator * 997n -
    exactAmountOut * amtInDenominator * reserveIn * 1000n;
  const priceImpactDenominator = reserveOut * amtInNumerator * 1000n;

  return {
    amountIn: amtInNumerator / amtInDenominator + 1n,
    priceImpact: new Big(priceImpactNumerator.toString())
      .mul(new Big(100))
      .div(new Big(priceImpactDenominator.toString())),
  };
}

/**
 * Options to calculate LP Amount while depositing
 * @depositedAmountA Amount of Asset A you want to deposit
 * @depositedAmountB Amount of Asset B you want to deposit
 * @reserveA Reserve of Asset A in Liquidity Pool
 * @reserveB Reserve of Asset B in Liquidity Pool
 * @totalLiquidity Total Circulating of LP Token in Liquidity Pool
 */
export type CalculateDepositOptions = {
  depositedAmountA: bigint;
  depositedAmountB: bigint;
  reserveA: bigint;
  reserveB: bigint;
  totalLiquidity: bigint;
};

/**
 * Calculate LP Amount while depositing
 * @param options See @CalculateDepositOptions description
 * @returns The amount needed of Asset A and Asset and LP Token Amount you will receive
 */
export function calculateDeposit(options: CalculateDepositOptions): {
  necessaryAmountA: bigint;
  necessaryAmountB: bigint;
  lpAmount: bigint;
} {
  const {
    depositedAmountA,
    depositedAmountB,
    reserveA,
    reserveB,
    totalLiquidity,
  } = options;
  const deltaLiquidityA = (depositedAmountA * totalLiquidity) / reserveA;
  const deltaLiquidityB = (depositedAmountB * totalLiquidity) / reserveB;
  let necessaryAmountA, necessaryAmountB, lpAmount: bigint;
  if (deltaLiquidityA > deltaLiquidityB) {
    necessaryAmountA = (depositedAmountB * reserveA) / reserveB;
    necessaryAmountB = depositedAmountB;
    lpAmount = deltaLiquidityB;
  } else if (deltaLiquidityA < deltaLiquidityB) {
    necessaryAmountA = depositedAmountA;
    necessaryAmountB = (depositedAmountA * reserveB) / reserveA;
    lpAmount = deltaLiquidityA;
  } else {
    necessaryAmountA = depositedAmountA;
    necessaryAmountB = depositedAmountB;
    lpAmount = deltaLiquidityA;
  }
  return {
    necessaryAmountA: necessaryAmountA,
    necessaryAmountB: necessaryAmountB,
    lpAmount: lpAmount,
  };
}

/**
 * Options to calculate amount A and amount B after withdrawing @withdrawalLPAmount out of Liquidity Pool
 * @withdrawalLPAmount LP Token amount you want to withdraw
 * @reserveA Reserve of Asset A in Liquidity Pool
 * @reserveB Reserve of Asset B in Liquidity Pool
 * @totalLiquidity Total Circulating of LP Token in Liquidity Pool
 */
export type CalculateWithdrawOptions = {
  withdrawalLPAmount: bigint;
  reserveA: bigint;
  reserveB: bigint;
  totalLiquidity: bigint;
};

/**
 * Calculate amount A and amount B after withdrawing @withdrawalLPAmount out of Liquidity Pool
 * @param options See @CalculateWithdrawOptions description
 * @returns amount A and amount B you will receive
 */
export function calculateWithdraw(options: CalculateWithdrawOptions): {
  amountAReceive: bigint;
  amountBReceive: bigint;
} {
  const { withdrawalLPAmount, reserveA, reserveB, totalLiquidity } = options;
  return {
    amountAReceive: (withdrawalLPAmount * reserveA) / totalLiquidity,
    amountBReceive: (withdrawalLPAmount * reserveB) / totalLiquidity,
  };
}

/**
 * Options to calculate LP Amount while zapping
 * @amountIn Amount you want to zap
 * @reserveIn Reserve of Asset which you want to zap in Liquidity Pool
 * @reserveOut Reserve of other Asset in Liquidity Pool
 * @totalLiquidity Total Circulating of LP Token in Liquidity Pool
 */
export type CalculateZapInOptions = {
  amountIn: bigint;
  reserveIn: bigint;
  reserveOut: bigint;
  totalLiquidity: bigint;
};

/**
 * Calculate LP Amount while zapping
 * @param options See @CalculateZapInOptions description
 * @returns Amount of LP Token you will receive
 */
export function calculateZapIn(options: CalculateZapInOptions): bigint {
  const { amountIn, reserveIn, reserveOut, totalLiquidity } = options;
  const swapAmountIn =
    (sqrt(
      1997n ** 2n * reserveIn ** 2n + 4n * 997n * 1000n * amountIn * reserveIn
    ) -
      1997n * reserveIn) /
    (2n * 997n);
  const swapToAssetOutAmount = calculateSwapExactIn({
    amountIn: swapAmountIn,
    reserveIn: reserveIn,
    reserveOut: reserveOut,
  }).amountOut;
  return (
    (swapToAssetOutAmount * totalLiquidity) /
    (reserveOut - swapToAssetOutAmount)
  );
}

export namespace DexV2Calculation {
  export const MAX_LIQUIDITY = 9_223_372_036_854_775_807n;
  export const DEFAULT_POOL_ADA = 4_500_000n;
  // The amount of liquidity that will be locked in pool when creating pools
  export const MINIMUM_LIQUIDITY = 10n;

  export type InitialLiquidityOptions = {
    amountA: bigint;
    amountB: bigint;
  };
  export function calculateInitialLiquidity({
    amountA,
    amountB,
  }: InitialLiquidityOptions): bigint {
    let x = sqrt(amountA * amountB);
    if (x * x < amountA * amountB) {
      x += 1n;
    }
    return x;
  }
}
