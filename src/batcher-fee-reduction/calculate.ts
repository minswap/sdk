import { Assets, UTxO } from "lucid-cardano";

import { NetworkEnvironment } from "../types/network";
import {
  BATCHER_FEE_CONFIG,
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
  const standardFee = BATCHER_FEE_CONFIG[networkEnv][dexVersion].standardFee;
  const activeBatcherFeeConfig = getActiveBatcherFee(networkEnv, dexVersion);
  if (!activeBatcherFeeConfig) {
    return {
      batcherFee: standardFee,
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
  for (const { asset } of activeBatcherFeeConfig.assets) {
    if (asset in totalAssets) {
      reductionAssets[asset] = totalAssets[asset];
      if (asset in orderAssets) {
        reductionAssets[asset] -= orderAssets[asset];
      }
    }
  }
  return {
    batcherFee: getReducedBatcherFee(
      standardFee,
      activeBatcherFeeConfig,
      reductionAssets
    ),
    reductionAssets: reductionAssets,
  };
}
