import { Assets, UTxO } from "lucid-cardano";

import { NetworkEnvironment } from "../types/network";
import {
  FIXED_BATCHER_FEE,
  getActiveBatcherFee,
  getReducedBatcherFee,
} from "./configs.internal";
import { DexVersion } from "./types.internal";

export function calculateBatcherFee({
  utxos,
  orderAssets,
  dexVersion,
  networkEnv,
}: {
  dexVersion: DexVersion;
  utxos: UTxO[];
  orderAssets: Assets;
  networkEnv: NetworkEnvironment;
}): {
  batcherFee: bigint;
  reductionAssets: Assets;
} {
  const reductionAssets: Assets = {};
  const activeBatcherFeeConfig = getActiveBatcherFee(networkEnv, dexVersion);
  if (!activeBatcherFeeConfig) {
    return {
      batcherFee: FIXED_BATCHER_FEE,
      reductionAssets,
    };
  }
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
  const eligibleReductionAssets: Assets = {};
  for (const { asset } of activeBatcherFeeConfig.assets) {
    if (asset in totalAssets) {
      eligibleReductionAssets[asset] = totalAssets[asset];
      if (asset in orderAssets) {
        eligibleReductionAssets[asset] -= orderAssets[asset];
      }
    }
  }
  return {
    batcherFee: getReducedBatcherFee(
      activeBatcherFeeConfig,
      eligibleReductionAssets
    ),
    reductionAssets: reductionAssets,
  };
}
