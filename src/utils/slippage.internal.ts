import BigNumber from "bignumber.js";

export namespace Slippage {
    export function apply({
        slippage,
        amount,
        type,
    }: {
        slippage: BigNumber;
        amount: bigint;
        type: "up" | "down";
    }): bigint {
        switch (type) {
            case "up": {
                const slippageAdjustedAmount = new BigNumber(1).plus(slippage).multipliedBy(amount.toString());
                return BigInt(slippageAdjustedAmount.toFixed(0, BigNumber.ROUND_DOWN));
            }
            case "down": {
                const slippageAdjustedAmount = new BigNumber(1)
                    .div(new BigNumber(1).plus(slippage))
                    .multipliedBy(amount.toString());
                return BigInt(slippageAdjustedAmount.toFixed(0, BigNumber.ROUND_DOWN));
            }
        }
    }
}