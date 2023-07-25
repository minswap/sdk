import { Network } from "lucid-cardano";
import { BatcherFeeConfig } from "./types";
import BigNumber from "bignumber.js";

export const FIXED_BATCHER_FEE = 2_000_000n;

const BATCHER_FEE_CONFIG_MAINNET: BatcherFeeConfig[] = [
    {
        maximumReduction: 25,
        startTime: new Date("2022-09-14T07:00:00.000Z"),
        endTime: undefined,
        maximumAmountMIN: 50_000_000_000n, // 50K MIN
        maximumAmountADAMINLP: 5_000_000_000n // 5B ADA-MIN LP
    },
];

const BATCHER_FEE_CONFIG_TESTNET_PREPROD: BatcherFeeConfig[] = [
    {
        maximumReduction: 25,
        startTime: new Date("2022-09-01T00:00:00.000Z"),
        endTime: undefined,
        maximumAmountMIN: 10_000_000n,
        maximumAmountADAMINLP: 100_000_000n
    },
];

function getBatcherFeeConfigs(network: Network): BatcherFeeConfig[] | null {
    switch (network) {
        case "Mainnet":
            return BATCHER_FEE_CONFIG_MAINNET;
        case "Preprod":
            return BATCHER_FEE_CONFIG_TESTNET_PREPROD;
        default:
            return null
    }
}

export function getBatcherFee(
    network: Network,
    amountMIN: bigint,
    amountLP: bigint,
  ): bigint {
    const currentTime = new Date().getTime()
    const batcherFeeConfigs = getBatcherFeeConfigs(network)
    if (!batcherFeeConfigs) {
        return FIXED_BATCHER_FEE
    }
    const activeConfig = batcherFeeConfigs.find((c) => {
      return (
        c.startTime.getTime() <= currentTime && c.endTime ? currentTime <= c.endTime.getTime() : true
      );
    });
    if (!activeConfig) {
      return FIXED_BATCHER_FEE;
    }

    const redunctionOnHoldingMIN = new BigNumber(amountMIN.toString()).div(activeConfig.maximumAmountMIN.toString())
    const redunctionOnHoldingLP = new BigNumber(amountLP.toString()).div(activeConfig.maximumAmountADAMINLP.toString())
    const totalReductionAmountRatio = redunctionOnHoldingMIN.plus(redunctionOnHoldingLP)
  
    // Maximum ratio is 1
    const maximumReductionAmountRatio = totalReductionAmountRatio.isGreaterThanOrEqualTo(new BigNumber(1))
      ? new BigNumber(1)
      : totalReductionAmountRatio;
  
    // Apply the ratio to calculate batcher fee reduction
    const totalReduction = new BigNumber(activeConfig.maximumReduction)
      .multipliedBy(maximumReductionAmountRatio)
      .div(new BigNumber(100));
  
    // New batcher fee = (1 - reduction) * DEFAULT BATCHER FEE
    const batcherFee = new BigNumber(1)
      .minus(totalReduction)
      .multipliedBy(new BigNumber(FIXED_BATCHER_FEE.toString()))
      .toFixed(0);
    return BigInt(batcherFee);
  }