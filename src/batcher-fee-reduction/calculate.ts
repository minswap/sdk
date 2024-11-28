import { Assets, UTxO } from "@minswap/lucid-cardano";
import BigNumber from "bignumber.js";

import { NetworkEnvironment } from "../types/network";
import {
  BatcherFeeConfig,
  BatcherFeeReductionConfig,
  DexVersion,
} from "./configs.internal";

export namespace BatcherFee {
  export function getFinalFee({
    config,
    reductionAssets,
  }: {
    config: BatcherFeeReductionConfig;
    reductionAssets: Assets;
  }): bigint {
    if (Object.keys(reductionAssets).length === 0) {
      return config.maxFee;
    }
    const { assets, minFee } = config;
    // Calculate total amount ratio through each reduction asset
    // The ratio is: current amount in wallet / maximum amount
    let totalReductionAmountRatio = new BigNumber(0);
    for (const { asset, maximumAmount } of assets) {
      if (asset in reductionAssets) {
        const reductionAmount = new BigNumber(reductionAssets[asset].toString())
          .div(maximumAmount.toString());
        totalReductionAmountRatio =
          totalReductionAmountRatio.plus(reductionAmount);
      }
    }

    // Maximum ratio is 1
    const maximumReductionAmountRatio = totalReductionAmountRatio.isGreaterThanOrEqualTo(new BigNumber(1))
      ? new BigNumber(1)
      : totalReductionAmountRatio;

    const maximumReduction = new BigNumber(config.maxFee.toString())
      .minus(minFee.toString())
      .div(config.maxFee.toString())
      .multipliedBy(100);

    // Apply the ratio to calculate batcher fee reduction
    const totalReduction = new BigNumber(maximumReduction).multipliedBy(maximumReductionAmountRatio).div(100);

    // New batcher fee = (1 - reduction) * DEFAULT BATCHER FEE
    const finalFee = new BigNumber(1)
      .minus(totalReduction)
      .multipliedBy(new BigNumber(config.maxFee.toString()))
      .toFixed(0);

    return BigInt(finalFee);
  }

  export function finalizeFee({
    networkEnv,
    currentDate,
    dexVersion,
    utxos,
    orderAssets
  }: {
    networkEnv: NetworkEnvironment;
    currentDate: Date,
    dexVersion: DexVersion;
    utxos: UTxO[];
    orderAssets: Assets;
  }): {
    batcherFee: bigint;
    reductionAssets: Assets;
  } {
    const defaultFee = BatcherFeeConfig.CONFIG[networkEnv][dexVersion].defaultFee;
    const activeReductionConfig = BatcherFeeConfig.getActiveConfig({
      networkEnv,
      dexVersion,
      currentDate
    });

    if (activeReductionConfig === undefined) {
      return {
        batcherFee: defaultFee,
        reductionAssets: {}
      }
    }

    const reductionAssets: Assets = {};
    const totalAssets: Assets = {};
    for (const u of utxos) {
      for (const [asset, amount] of Object.entries(u.assets)) {
        if (asset in totalAssets) {
          totalAssets[asset] += amount;
        } else {
          totalAssets[asset] = amount;
        }
      }
    }
    for (const { asset } of activeReductionConfig.assets) {
      if (asset in totalAssets) {
        reductionAssets[asset] = totalAssets[asset];
        if (asset in orderAssets) {
          reductionAssets[asset] -= orderAssets[asset];
        }
      }
    }
    return {
      batcherFee: getFinalFee({
        config: activeReductionConfig,
        reductionAssets: reductionAssets
      }),
      reductionAssets: reductionAssets,
    };
  }
}