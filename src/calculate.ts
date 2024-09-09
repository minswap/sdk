import Big from "big.js";

import { OrderV2 } from "./types/order";
import { PoolV2 } from "./types/pool";
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

type Reserves = [bigint, bigint];
type Fraction = [bigint, bigint];

export namespace DexV2Calculation {
  export type InitialLiquidityOptions = {
    amountA: bigint;
    amountB: bigint;
  };

  export type CalculateAmountOutOptions = {
    reserveIn: bigint;
    reserveOut: bigint;
    amountIn: bigint;
    tradingFeeNumerator: bigint;
  };

  export type CalculateAmountOutFractionOptions = {
    reserveIn: bigint;
    reserveOut: bigint;
    amountIn: Fraction;
    tradingFeeNumerator: bigint;
  };

  export type CalculateAmountInOptions = {
    reserveIn: bigint;
    reserveOut: bigint;
    amountOut: bigint;
    tradingFeeNumerator: bigint;
  };

  export type CalculateMaxInSwapOptions = {
    reserveIn: bigint;
    reserveOut: bigint;
    tradingFeeNumerator: bigint;
    ioRatio: Fraction;
  };

  export type CalculateDepositAmountOptions = {
    amountA: bigint;
    amountB: bigint;
    poolInfo: PoolV2.Info;
  };

  export type CalculateDepositSwapAmountOptions = {
    amountIn: bigint;
    amountOut: bigint;
    reserveIn: bigint;
    reserveOut: bigint;
    tradingFeeNumerator: bigint;
  };

  export type CalculateWithdrawAmountOptions = {
    datumReserves: Reserves;
    withdrawalLPAmount: bigint;
    totalLiquidity: bigint;
  };

  export type CalculateZapOutAmountOptions = {
    withdrawalLPAmount: bigint;
    direction: OrderV2.Direction;
    poolInfo: PoolV2.Info;
  };

  export function bigIntPow(x: bigint): bigint {
    return x * x;
  }

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

  /* Functions using for DexV2 properties calculation */
  export function calculateAmountOut({
    reserveIn,
    reserveOut,
    amountIn,
    tradingFeeNumerator,
  }: CalculateAmountOutOptions): bigint {
    const diff = PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR - tradingFeeNumerator;
    const inWithFee = diff * amountIn;
    const numerator = inWithFee * reserveOut;
    const denominator =
      PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR * reserveIn + inWithFee;
    return numerator / denominator;
  }

  export function calculateAmountOutFraction({
    reserveIn,
    reserveOut,
    amountIn,
    tradingFeeNumerator,
  }: CalculateAmountOutFractionOptions): [bigint, bigint] {
    const [amountInNumerator, amountInDenominator] = amountIn;
    const diff = PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR - tradingFeeNumerator;
    const numerator = amountInNumerator * diff * reserveOut;
    const denominator =
      PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR * amountInDenominator * reserveIn +
      amountInNumerator * diff;
    return [numerator, denominator];
  }

  export function calculateAmountIn({
    reserveIn,
    reserveOut,
    amountOut,
    tradingFeeNumerator,
  }: CalculateAmountInOptions): bigint {
    if (amountOut >= reserveOut) {
      throw new Error("Amount Out must be less than Reserve Out");
    }
    const diff = PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR - tradingFeeNumerator;
    const numerator =
      reserveIn * amountOut * PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR;
    const denominator = (reserveOut - amountOut) * diff;
    return numerator / denominator + 1n;
  }

  export function calculateMaxInSwap({
    reserveIn,
    reserveOut,
    tradingFeeNumerator,
    ioRatio,
  }: CalculateMaxInSwapOptions): bigint {
    const [ioRatioNumerator, ioRatioDenominator] = ioRatio;
    const diff = PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR - tradingFeeNumerator;
    const numerator =
      ioRatioNumerator * diff * reserveOut -
      ioRatioDenominator * PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR * reserveIn;
    const denominator = ioRatioDenominator * diff;
    const maxInSwap = numerator / denominator;
    return maxInSwap > 0 ? maxInSwap : 0n;
  }

  export function calculateDepositAmount({
    amountA,
    amountB,
    poolInfo,
  }: CalculateDepositAmountOptions): bigint {
    const { datumReserves, totalLiquidity, tradingFee } = poolInfo;
    const [datumReserveA, datumReserveB] = [...datumReserves];
    const ratioA = (amountA * totalLiquidity) / datumReserveA;
    const ratioB = (amountB * totalLiquidity) / datumReserveB;
    if (ratioA > ratioB) {
      // Need swap a part of A to B
      const swapAmountA = calculateDepositSwapAmount({
        amountIn: amountA,
        amountOut: amountB,
        reserveIn: datumReserveA,
        reserveOut: datumReserveB,
        tradingFeeNumerator: tradingFee.feeANumerator,
      });
      const [swapAmountANumerator, swapAmountADenominator] = swapAmountA;
      const lpAmount =
        ((amountA * swapAmountADenominator - swapAmountANumerator) *
          totalLiquidity) /
        (datumReserveA * swapAmountADenominator + swapAmountANumerator);
      return lpAmount;
    } else if (ratioA < ratioB) {
      // Need swap a part of B to A
      const swapAmountB = calculateDepositSwapAmount({
        amountIn: amountB,
        amountOut: amountA,
        reserveIn: datumReserveB,
        reserveOut: datumReserveA,
        tradingFeeNumerator: tradingFee.feeBNumerator,
      });
      const [swapAmountBNumerator, swapAmountBDenominator] = swapAmountB;
      const lpAmount =
        ((amountB * swapAmountBDenominator - swapAmountBNumerator) *
          totalLiquidity) /
        (datumReserveB * swapAmountBDenominator + swapAmountBNumerator);
      return lpAmount;
    } else {
      return ratioA;
    }
  }

  export function calculateDepositSwapAmount({
    amountIn,
    amountOut,
    reserveIn,
    reserveOut,
    tradingFeeNumerator,
  }: CalculateDepositSwapAmountOptions): Fraction {
    const x = (amountOut + reserveOut) * reserveIn;
    const y =
      4n *
      (amountOut + reserveOut) *
      (amountOut * reserveIn * reserveIn - amountIn * reserveIn * reserveOut);
    const z = 2n * (amountOut + reserveOut);
    const a =
      bigIntPow(x) *
        bigIntPow(
          2n * PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR - tradingFeeNumerator
        ) -
      y *
        PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR *
        (PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR - tradingFeeNumerator);
    const b =
      (2n * PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR - tradingFeeNumerator) * x;
    const numerator = sqrt(a) - b;
    const denominator =
      z * (PoolV2.DEFAULT_TRADING_FEE_DENOMINATOR - tradingFeeNumerator);
    return [numerator, denominator];
  }

  export function calculateWithdrawAmount({
    withdrawalLPAmount,
    datumReserves,
    totalLiquidity,
  }: CalculateWithdrawAmountOptions): {
    withdrawalA: bigint;
    withdrawalB: bigint;
  } {
    const [datumReserveA, datumReserveB] = [...datumReserves];
    const amountA = (withdrawalLPAmount * datumReserveA) / totalLiquidity;
    const amountB = (withdrawalLPAmount * datumReserveB) / totalLiquidity;
    return {
      withdrawalA: amountA,
      withdrawalB: amountB,
    };
  }

  export function calculateZapOutAmount({
    withdrawalLPAmount,
    direction,
    poolInfo,
  }: CalculateZapOutAmountOptions): bigint {
    const { datumReserves, totalLiquidity, tradingFee } = poolInfo;
    const [datumReserveA, datumReserveB] = [...datumReserves];
    const { withdrawalA, withdrawalB } = calculateWithdrawAmount({
      withdrawalLPAmount: withdrawalLPAmount,
      datumReserves: datumReserves,
      totalLiquidity: totalLiquidity,
    });

    const reserveAAfterWithdraw = datumReserveA - withdrawalA;
    const reserveBAfterWithdraw = datumReserveB - withdrawalB;
    let amountOut = 0n;
    switch (direction) {
      case OrderV2.Direction.A_TO_B: {
        const extraAmountOut = calculateAmountOut({
          amountIn: withdrawalA,
          reserveIn: reserveAAfterWithdraw,
          reserveOut: reserveBAfterWithdraw,
          tradingFeeNumerator: tradingFee.feeANumerator,
        });
        amountOut = withdrawalB + extraAmountOut;
        return amountOut;
      }
      case OrderV2.Direction.B_TO_A: {
        const extraAmountOut = calculateAmountOut({
          amountIn: withdrawalB,
          reserveIn: reserveBAfterWithdraw,
          reserveOut: reserveAAfterWithdraw,
          tradingFeeNumerator: tradingFee.feeBNumerator,
        });
        amountOut = withdrawalA + extraAmountOut;
        return amountOut;
      }
    }
  }
}
