import invariant from "@minswap/tiny-invariant";
import { Utxo } from "@spacebudz/lucid";
import Big from "big.js";
import BigNumber from "bignumber.js";
import { zipWith } from "remeda";

import { OrderV2 } from "./types/order";
import { PoolV2 } from "./types/pool";
import { Slippage } from "./utils/slippage.internal";
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
 * Options to calculate amount with slippage tolerance up or down
 * @slippageTolerancePercent The slippage tolerance percent
 * @amount The amount that we want to calculate
 * @type The type of slippage tolerance, up or down
 */
export type CalculateSwapExactOutWithSlippageToleranceOptions = {
  slippageTolerancePercent: number;
  amount: bigint;
  type: "up" | "down";
};

/**
 * Calculate result amount with slippage tolerance up or down
 * @param options See @CalculateSwapExactOutWithSlippageToleranceOptions description
 * @returns The amount needed of the input token for the swap and its price impact
 */
export function calculateAmountWithSlippageTolerance(
  options: CalculateSwapExactOutWithSlippageToleranceOptions
): bigint {
  const { slippageTolerancePercent, amount, type } = options;
  const slippageTolerance = new BigNumber(slippageTolerancePercent).div(100);
  return Slippage.apply({
    slippage: slippageTolerance,
    amount: amount,
    type: type,
  });
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

export namespace StableswapCalculation {
  export function getD(mulBalances: bigint[], amp: bigint): bigint {
    const sumMulBalances = mulBalances.reduce(
      (sum, balance) => sum + balance,
      0n
    );
    if (sumMulBalances === 0n) {
      return 0n;
    }

    const length = BigInt(mulBalances.length);
    let dPrev = 0n;
    let d = sumMulBalances;
    const ann = amp * length;

    for (let i = 0; i < 255; i++) {
      let dp = d;
      for (const mulBalance of mulBalances) {
        dp = (dp * d) / (mulBalance * length);
      }
      dPrev = d;
      d =
        ((ann * sumMulBalances + dp * length) * d) /
        ((ann - 1n) * d + (length + 1n) * dp);
      if (d > dPrev) {
        if (d - dPrev <= 1n) {
          break;
        }
      } else {
        if (dPrev - d <= 1n) {
          break;
        }
      }
    }
    return d;
  }

  export function getY(
    i: number,
    j: number,
    x: bigint,
    xp: bigint[],
    amp: bigint
  ): bigint {
    if (i === j || i < 0 || j < 0 || i >= xp.length || j >= xp.length) {
      throw Error(
        `getY failed: i and j must be different and less than length of xp`
      );
    }
    const length = BigInt(xp.length);
    const d = getD(xp, amp);
    let c = d;
    let s = 0n;
    const ann = amp * length;

    let _x = 0n;
    for (let index = 0; index < Number(length); index++) {
      if (index === i) {
        _x = x;
      } else if (index !== j) {
        _x = xp[index];
      } else {
        continue;
      }
      s += _x;
      c = (c * d) / (_x * length);
    }

    c = (c * d) / (ann * length);
    const b = s + d / ann;
    let yPrev = 0n;
    let y = d;
    for (let index = 0; index < 255; index++) {
      yPrev = y;
      y = (y * y + c) / (2n * y + b - d);
      if (y > yPrev) {
        if (y - yPrev <= 1n) {
          break;
        }
      } else {
        if (yPrev - y <= 1n) {
          break;
        }
      }
    }
    return y;
  }

  export function getYD(
    i: number,
    xp: bigint[],
    amp: bigint,
    d: bigint
  ): bigint {
    const length = BigInt(xp.length);
    invariant(
      0 <= i && i < xp.length,
      `getYD failed: i must be less than length of xp`
    );
    let c = d;
    let s = 0n;
    const ann = amp * length;

    let _x = 0n;
    for (let index = 0; index < Number(length); index++) {
      if (index !== i) {
        _x = xp[index];
      } else {
        continue;
      }
      s += _x;
      c = (c * d) / (_x * length);
    }
    c = (c * d) / (ann * length);
    const b = s + d / ann;
    let yPrev = 0n;
    let y = d;
    for (let index = 0; index < 255; index++) {
      yPrev = y;
      y = (y * y + c) / (2n * y + b - d);
      if (y > yPrev) {
        if (y - yPrev <= 1n) {
          break;
        }
      } else {
        if (yPrev - y <= 1n) {
          break;
        }
      }
    }
    return y;
  }

  export function getDMem(
    balances: bigint[],
    multiples: bigint[],
    amp: bigint
  ): bigint {
    const mulBalances = zipWith(balances, multiples, (a, b) => a * b);
    return getD(mulBalances, amp);
  }

  type CommonStableswapCalculationOptions = {
    amp: bigint;
    multiples: bigint[];
    datumBalances: bigint[];
    fee: bigint;
    adminFee: bigint;
    feeDenominator: bigint;
  };

  /**
   * @property {number} inIndex - index of asset in config assets that you want to swap
   * @property {bigint} amountIn - amount of asset that you want to swap
   * @property {number} outIndex - index of asset in config assets that you want to receive
   */
  export type StableswapCalculateSwapOptions =
    CommonStableswapCalculationOptions & {
      inIndex: number;
      outIndex: number;
      amountIn: bigint;
    };

  /**
   * @property {bigint[]} amountIns - amount of assets that you want to deposit ordering by assets in config
   * @property {bigint} totalLiquidity - amount of asset that you want to swap
   */
  export type StableswapCalculateDepositOptions =
    CommonStableswapCalculationOptions & {
      amountIns: bigint[];
      totalLiquidity: bigint;
    };

  export type StableswapCalculateWithdrawOptions = Omit<
    CommonStableswapCalculationOptions,
    "amp" | "fee" | "adminFee" | "feeDenominator"
  > & {
    withdrawalLPAmount: bigint;
    totalLiquidity: bigint;
  };

  /**
   * @property {bigint[]} withdrawAmounts - exactly amount of assets that you want to withdraw ordering by assets in config
   */
  export type StableswapCalculateWithdrawImbalanceOptions =
    CommonStableswapCalculationOptions & {
      withdrawAmounts: bigint[];
      totalLiquidity: bigint;
    };

  /**
   * @property {bigint} amountLpIn - exactly LP amount that you want to withdraw
   * @property {number} outIndex - index of asset that you want to zap out in config assets
   */
  export type StableswapCalculateZapOutOptions =
    CommonStableswapCalculationOptions & {
      amountLpIn: bigint;
      outIndex: number;
      totalLiquidity: bigint;
    };

  /**
   * @returns amount of asset that you want to receive.
   */
  export function calculateSwapAmount({
    inIndex,
    outIndex,
    amountIn,
    amp,
    multiples,
    datumBalances,
    fee,
    adminFee,
    feeDenominator,
  }: StableswapCalculateSwapOptions): bigint {
    const tempDatumBalances = [...datumBalances];

    const length = multiples.length;
    invariant(
      amountIn > 0,
      `calculateExchange error: amountIn ${amountIn} must be positive.`
    );
    invariant(
      0 <= inIndex && inIndex < length,
      `calculateExchange error: inIndex ${inIndex} is not valid, must be within 0-${
        length - 1
      }`
    );
    invariant(
      0 <= outIndex && outIndex < length,
      `calculateExchange error: outIndex ${outIndex} is not valid, must be within 0-${
        length - 1
      }`
    );
    invariant(inIndex !== outIndex, `inIndex must be different from outIndex`);
    const mulBalances = zipWith(tempDatumBalances, multiples, (a, b) => a * b);
    const mulIn = multiples[inIndex];
    const mulOut = multiples[outIndex];
    const x = mulBalances[inIndex] + amountIn * mulIn;
    const y = getY(inIndex, outIndex, x, mulBalances, amp);

    const dy = mulBalances[outIndex] - y;
    const dyFee = (dy * fee) / feeDenominator;
    const dyAdminFee = (dyFee * adminFee) / feeDenominator;
    const amountOut = (dy - dyFee) / mulOut;
    const newDatumBalanceOut = (y + (dyFee - dyAdminFee)) / mulOut;

    invariant(
      amountOut > 0,
      `calculateExchange error: amountIn is too small, amountOut (${amountOut}) must be positive.`
    );
    invariant(
      newDatumBalanceOut > 0,
      `calculateExchange error: newDatumBalanceOut (${newDatumBalanceOut}) must be positive.`
    );
    return amountOut;
  }

  /**
   * @returns amount of liquidity asset you receive.
   */
  export function calculateDeposit({
    amountIns,
    amp,
    multiples,
    datumBalances,
    totalLiquidity,
    fee,
    adminFee,
    feeDenominator,
  }: StableswapCalculateDepositOptions): bigint {
    const tempDatumBalances = [...datumBalances];

    const length = multiples.length;
    invariant(
      amountIns.length === length,
      `calculateDeposit error: amountIns's length ${amountIns.length} is invalid, amountIns's length must be ${length}`
    );

    let newDatumBalances: bigint[] = [];
    let lpAmount = 0n;
    if (totalLiquidity === 0n) {
      for (let i = 0; i < length; ++i) {
        invariant(
          amountIns[i] > 0n,
          `calculateDeposit error: amount index ${i} must be positive in case totalLiquidity = 0`
        );
      }
      newDatumBalances = zipWith(tempDatumBalances, amountIns, (a, b) => a + b);
      const d1 = getDMem(newDatumBalances, multiples, amp);
      invariant(
        d1 > 0,
        `calculateDeposit: d1 must be greater than 0 in case totalLiquidity = 0`
      );
      lpAmount = d1;
    } else {
      let sumIns = 0n;
      for (let i = 0; i < length; ++i) {
        if (amountIns[i] < 0n) {
          invariant(
            amountIns[i] > 0n,
            `calculateDeposit error: amountIns index ${i} must be non-negative`
          );
        }
        sumIns += amountIns[i];
      }
      invariant(
        sumIns > 0,
        `calculateDeposit error: sum of amountIns must be positive`
      );

      const newDatumBalanceWithoutFee = zipWith(
        tempDatumBalances,
        amountIns,
        (a, b) => a + b
      );

      const d0 = getDMem(tempDatumBalances, multiples, amp);
      const d1 = getDMem(newDatumBalanceWithoutFee, multiples, amp);

      invariant(
        d1 > d0,
        `calculateDeposit: d1 must be greater than d0 in case totalLiquidity > 0, d1: ${d1}, d0: ${d0}`
      );

      const specialFee = (fee * BigInt(length)) / (4n * (BigInt(length) - 1n));

      const newDatBalancesWithTradingFee: bigint[] = [];
      for (let i = 0; i < tempDatumBalances.length; i++) {
        const oldBalance = tempDatumBalances[i];
        const newBalance = newDatumBalanceWithoutFee[i];

        const idealBalance = (d1 * oldBalance) / d0;
        let different = 0n;
        // In this case, liquidity pool has to swap the amount of other assets to get @different assets[i]
        if (newBalance > idealBalance) {
          different = newBalance - idealBalance;
        } else {
          different = idealBalance - newBalance;
        }
        const tradingFeeAmount = (specialFee * different) / feeDenominator;
        const adminFeeAmount = (tradingFeeAmount * adminFee) / feeDenominator;
        newDatumBalances.push(newBalance - adminFeeAmount);
        newDatBalancesWithTradingFee.push(newBalance - tradingFeeAmount);
      }
      for (let i = 0; i < length; ++i) {
        invariant(
          newDatBalancesWithTradingFee[i] > 0,
          `calculateDeposit error: deposit amount is too small, newDatBalancesWithTradingFee must be positive`
        );
      }
      const d2 = getDMem(newDatBalancesWithTradingFee, multiples, amp);
      lpAmount = (totalLiquidity * (d2 - d0)) / d0;
    }

    invariant(
      lpAmount > 0,
      `calculateDeposit error: deposit amount is too small, lpAmountOut ${lpAmount} must be positive`
    );
    return lpAmount;
  }

  /**
   * @returns amounts of asset you can receive ordering by config assets
   */
  export function calculateWithdraw({
    withdrawalLPAmount,
    multiples,
    datumBalances,
    totalLiquidity,
  }: StableswapCalculateWithdrawOptions): bigint[] {
    const tempDatumBalances = [...datumBalances];

    const length = multiples.length;
    invariant(
      withdrawalLPAmount > 0,
      `calculateWithdraw error: withdrawalLPAmount must be positive`
    );
    const amountOuts = tempDatumBalances.map(
      (balance) => (balance * withdrawalLPAmount) / totalLiquidity
    );
    let sumOuts = 0n;
    for (let i = 0; i < length; ++i) {
      invariant(
        amountOuts[i] >= 0n,
        `calculateWithdraw error: amountOuts must be non-negative`
      );
      sumOuts += amountOuts[i];
    }
    invariant(
      sumOuts > 0n,
      `calculateWithdraw error: sum of amountOuts must be positive`
    );

    return amountOuts;
  }

  /**
   * @returns lp asset amount you need to provide to receive exactly amount of assets in the pool
   */
  export function calculateWithdrawImbalance({
    withdrawAmounts,
    amp,
    multiples,
    datumBalances,
    totalLiquidity,
    fee,
    feeDenominator,
  }: StableswapCalculateWithdrawImbalanceOptions): bigint {
    const tempDatumBalances = [...datumBalances];

    const length = multiples.length;

    invariant(
      withdrawAmounts.length === length,
      `calculateWithdrawImbalance error: withdrawAmounts's length ${withdrawAmounts.length} is invalid, withdrawAmounts's length must be ${length}`
    );

    let sumOuts = 0n;
    for (let i = 0; i < length; ++i) {
      invariant(
        withdrawAmounts[i] >= 0n,
        `calculateDeposit error: amountIns must be non-negative`
      );

      sumOuts += withdrawAmounts[i];
    }
    invariant(
      sumOuts > 0n,
      `calculateWithdrawImbalance error: sum of withdrawAmounts must be positive`
    );

    const specialFee = (fee * BigInt(length)) / (4n * (BigInt(length) - 1n));

    const newDatBalancesWithoutFee = zipWith(
      tempDatumBalances,
      withdrawAmounts,
      (a, b) => a - b
    );
    for (let i = 0; i < length; ++i) {
      invariant(
        newDatBalancesWithoutFee[i] > 0n,
        `calculateWithdrawImbalance error: not enough asset index ${i}`
      );
    }
    const d0 = getDMem(tempDatumBalances, multiples, amp);
    const d1 = getDMem(newDatBalancesWithoutFee, multiples, amp);

    const newDatBalancesWithTradingFee: bigint[] = [];
    for (let i = 0; i < length; ++i) {
      const idealBalance = (d1 * tempDatumBalances[i]) / d0;
      let different = 0n;
      if (newDatBalancesWithoutFee[i] > idealBalance) {
        different = newDatBalancesWithoutFee[i] - idealBalance;
      } else {
        different = idealBalance - newDatBalancesWithoutFee[i];
      }
      const tradingFeeAmount = (specialFee * different) / feeDenominator;
      newDatBalancesWithTradingFee.push(
        newDatBalancesWithoutFee[i] - tradingFeeAmount
      );
    }
    for (let i = 0; i < length; ++i) {
      invariant(
        newDatBalancesWithTradingFee[i] > 0n,
        `calculateWithdrawImbalance error: not enough asset index ${i}`
      );
    }

    const d2 = getDMem(newDatBalancesWithTradingFee, multiples, amp);
    let lpAmount = ((d0 - d2) * totalLiquidity) / d0;

    invariant(
      lpAmount > 0n,
      `calculateWithdrawImbalance error: required lpAmount ${lpAmount} must be positive`
    );

    lpAmount += 1n;
    return lpAmount;
  }

  /**
   * @returns amount asset amount you want receive
   */
  export function calculateZapOut({
    amountLpIn,
    outIndex,
    amp,
    multiples,
    datumBalances,
    totalLiquidity,
    fee,
    adminFee,
    feeDenominator,
  }: StableswapCalculateZapOutOptions): bigint {
    const tempDatumBalances = [...datumBalances];

    const length = multiples.length;
    invariant(
      amountLpIn > 0,
      `calculateZapOut error: amountLpIn ${amountLpIn} must be positive.`
    );

    invariant(
      0 <= outIndex && outIndex < length,
      `calculateZapOut error: outIndex ${outIndex} is not valid, must be within 0-${
        length - 1
      }`
    );

    const mulBalances = zipWith(tempDatumBalances, multiples, (a, b) => a * b);
    const mulOut = multiples[outIndex];
    const d0 = getD(mulBalances, amp);
    const d1 = d0 - (amountLpIn * d0) / totalLiquidity;
    const mulBalancesReduced = mulBalances;
    // newY is new MulBal[outIndex]
    const newYWithoutFee = getYD(outIndex, mulBalances, amp, d1);
    const specialFee = (fee * BigInt(length)) / (4n * (BigInt(length) - 1n));

    const amountOutWithoutFee =
      (mulBalances[outIndex] - newYWithoutFee) / mulOut;
    for (let i = 0; i < length; ++i) {
      const diff =
        i === outIndex
          ? (mulBalances[i] * d1) / d0 - newYWithoutFee
          : mulBalances[i] - (mulBalances[i] * d1) / d0;
      mulBalancesReduced[i] -= (diff * specialFee) / feeDenominator;
    }
    const newY = getYD(outIndex, mulBalancesReduced, amp, d1);
    const amountOut = (mulBalancesReduced[outIndex] - newY - 1n) / mulOut;
    tempDatumBalances[outIndex] -=
      amountOut +
      ((amountOutWithoutFee - amountOut) * adminFee) / feeDenominator;
    return amountOut;
  }

  export function getPrice(
    balances: bigint[],
    multiples: bigint[],
    amp: bigint,
    assetAIndex: number,
    assetBIndex: number
  ): [bigint, bigint] {
    const mulBalances = zipWith(balances, multiples, (a, b) => a * b);
    const length = BigInt(mulBalances.length);
    const ann = amp * length;
    const d = getD(mulBalances, amp);

    // Dr = D / (N_COINS ** N_COINS)
    // for i in range(N_COINS):
    //     Dr = Dr * D / xp[i]

    //drNumerator = D^(n+1)
    //drDenominator = n^n*xp[0]*xp[1]*...*xp[n-1]
    let drNumerator = d;
    let drDenominator = 1n;
    for (let i = 0n; i < length; ++i) {
      drNumerator = drNumerator * d;
      drDenominator = drDenominator * mulBalances[Number(i)] * length;
    }

    // (ANN * xp[assetAIndex] + Dr * xp[assetAIndex] / xp[assetBIndex]) / (ANN * xp[assetAIndex] + Dr)
    // = (drDenominator * ANN * xp[assetAIndex] * xp[assetBIndex] + drNumerator*xp[assetAIndex])
    //       / xp[assetBIndex] * (drDenominator * Ann * xp[assetAIndex] + drNumerator)
    // this is price of asset[assetBIndex] / multiples[assetBIndex] base on asset[assetAIndex] / multiples[assetAIndex]
    // => price = priceWithMultiple / multiples[assetAIndex] * multiples[assetBIndex]
    return shortenFraction([
      (drDenominator *
        ann *
        mulBalances[assetAIndex] *
        mulBalances[assetBIndex] +
        drNumerator * mulBalances[assetAIndex]) *
        multiples[assetBIndex],
      mulBalances[assetBIndex] *
        (drDenominator * ann * mulBalances[assetAIndex] + drNumerator) *
        multiples[assetAIndex],
    ]);
  }
}

function shortenFraction([numerator, denominator]: [bigint, bigint]): [
  bigint,
  bigint,
] {
  const gcd = gcdFunction(numerator, denominator);
  if (gcd === 0n) {
    return [1n, 1n];
  } else {
    return [numerator / gcd, denominator / gcd];
  }
}

function gcdFunction(a: bigint, b: bigint): bigint {
  if (a > b) {
    if (b === 0n) {
      return a;
    }
    return gcdFunction(a % b, b);
  } else if (a < b) {
    if (a === 0n) {
      return b;
    }
    return gcdFunction(a, b % a);
  }
  return a;
}

export function compareUtxo(s1: Utxo, s2: Utxo): number {
  if (s1.txHash === s2.txHash) {
    return s1.outputIndex - s2.outputIndex;
  }

  if (s1.txHash < s2.txHash) {
    return -1;
  }
  if (s1.txHash === s2.txHash) {
    return 0;
  }
  return 1;
}
