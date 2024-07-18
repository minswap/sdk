import BigNumber from "bignumber.js";
import { Assets } from "lucid-cardano";

import { NetworkEnvironment } from "../types/network";
import {
  BatcherFeeConfig,
  BatcherFeeReductionConfig,
  DexVersion,
} from "./types.internal";

export const FIXED_BATCHER_FEE = 2_000_000n;

export function getActiveBatcherFee(
  networkEnv: NetworkEnvironment,
  dexVersion: DexVersion
): BatcherFeeReductionConfig | undefined {
  const batcherFeeConfig = BATCHER_FEE_CONFIG[networkEnv][dexVersion];
  if (!batcherFeeConfig) {
    return undefined;
  }
  const currentTime = new Date().getTime();
  let activeReductionConfig: BatcherFeeReductionConfig | undefined;
  for (const config of batcherFeeConfig.reduction) {
    const isActive =
      config.startTime.getTime() <= currentTime && config.endTime
        ? currentTime <= config.endTime.getTime()
        : true;
    if (isActive) {
      activeReductionConfig = config;
    }
  }
  return activeReductionConfig;
}

export function getBatcherFee(
  activeReductionConfig: BatcherFeeReductionConfig,
  reductionAssets: Assets
): bigint {
  const totalReductionAmountRatio = new BigNumber(0);
  const { assets, minFee } = activeReductionConfig;
  for (const { asset, maximumAmount } of assets) {
    if (asset in reductionAssets) {
      const reductionAmount = new BigNumber(
        reductionAssets[asset].toString()
      ).div(maximumAmount.toString());
      totalReductionAmountRatio.plus(reductionAmount);
    }
  }

  // Maximum ratio is 1
  const maximumReductionAmountRatio =
    totalReductionAmountRatio.isGreaterThanOrEqualTo(new BigNumber(1))
      ? new BigNumber(1)
      : totalReductionAmountRatio;

  const maximumReduction = new BigNumber(FIXED_BATCHER_FEE.toString())
    .minus(minFee.toString())
    .div(FIXED_BATCHER_FEE.toString())
    .multipliedBy(100);

  // Apply the ratio to calculate batcher fee reduction
  const totalReduction = new BigNumber(maximumReduction)
    .multipliedBy(maximumReductionAmountRatio)
    .div(100);

  // New batcher fee = (1 - reduction) * DEFAULT BATCHER FEE
  const finalFee = new BigNumber(1)
    .minus(totalReduction)
    .multipliedBy(new BigNumber(FIXED_BATCHER_FEE.toString()))
    .toFixed(0);
  return BigInt(finalFee);
}

export const BATCHER_FEE_CONFIG: Record<
  NetworkEnvironment,
  Record<DexVersion, BatcherFeeConfig>
> = {
  [NetworkEnvironment.MAINNET]: {
    [DexVersion.DEX_V1]: {
      standardFee: 2_000_000n,
      reduction: [
        {
          minFee: 1_500_000n,
          startTime: new Date("2022-09-14T07:00:00.000Z"),
          endTime: undefined,
          assets: [
            {
              asset:
                "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6.4d494e", // MIN
              maximumAmount: 50_000_000_000n, // 50K MIN
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.6aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2", // ADA-MIN LP
              maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP
            },
          ],
        },
      ],
    },
    [DexVersion.STABLESWAP]: {
      standardFee: 2_000_000n,
      reduction: [
        {
          minFee: 1_500_000n,
          startTime: new Date("2022-09-14T07:00:00.000Z"),
          endTime: undefined,
          assets: [
            {
              asset:
                "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6.4d494e", // MIN
              maximumAmount: 50_000_000_000n, // 50K MIN
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.6aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2", // ADA-MIN LP
              maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP
            },
          ],
        },
      ],
    },
    [DexVersion.DEX_V2]: {
      standardFee: 1_000_000n,
      reduction: [
        {
          minFee: 750_000n,
          startTime: new Date("2024-07-01T05:00:00.000Z"),
          endTime: undefined,
          assets: [
            {
              asset:
                "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6.4d494e", // MIN
              maximumAmount: 50_000_000_000n, // 50K MIN
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.6aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2", // ADA-MIN LP V1
              maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP
            },
            {
              asset:
                "f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c.82e2b1fd27a7712a1a9cf750dfbea1a5778611b20e06dd6a611df7a643f8cb75", // ADA-MIN LP V2
              maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP V2
            },
          ],
        },
      ],
    },
  },
  [NetworkEnvironment.TESTNET_PREPROD]: {
    [DexVersion.DEX_V1]: {
      standardFee: 2_000_000n,
      reduction: [
        {
          minFee: 1_500_000n,
          startTime: new Date("2022-09-01T00:00:00.000Z"),
          endTime: new Date("2024-06-24T00:00:00.000Z"),
          assets: [
            {
              asset:
                "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72.4d494e", // MIN
              maximumAmount: 10_000_000n,
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d", // ADA-MIN LP
              maximumAmount: 100_000_000n,
            },
          ],
        },
        {
          minFee: 1_500_000n,
          startTime: new Date("2024-06-24T00:00:00.000Z"),
          endTime: undefined,
          assets: [
            {
              asset:
                "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72.4d494e", // MIN
              maximumAmount: 10_000_000n,
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d", // ADA-MIN LP
              maximumAmount: 100_000_000n,
            },
            {
              asset:
                "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b.6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200", // ADA-MIN LP V2
              maximumAmount: 100_000_000n,
            },
          ],
        },
      ],
    },
    [DexVersion.STABLESWAP]: {
      standardFee: 2_000_000n,
      reduction: [
        {
          minFee: 1_500_000n,
          startTime: new Date("2022-09-01T00:00:00.000Z"),
          endTime: new Date("2024-06-24T00:00:00.000Z"),
          assets: [
            {
              asset:
                "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72.4d494e",
              // MIN
              maximumAmount: 10_000_000n,
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d",
              // ADA-MIN LP
              maximumAmount: 100_000_000n,
            },
          ],
        },
        {
          minFee: 1_500_000n,
          startTime: new Date("2024-06-24T00:00:00.000Z"),
          endTime: undefined,
          assets: [
            {
              asset:
                "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72.4d494e", // MIN
              maximumAmount: 10_000_000n,
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d", // ADA-MIN LP
              maximumAmount: 100_000_000n,
            },
            {
              asset:
                "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b.6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200", // ADA-MIN LP V2
              maximumAmount: 100_000_000n,
            },
          ],
        },
      ],
    },
    [DexVersion.DEX_V2]: {
      standardFee: 1_300_000n,
      reduction: [
        {
          minFee: 1_000_000n,
          startTime: new Date("2024-04-23T00:00:00.000Z"),
          endTime: new Date("2024-06-24T00:00:00.000Z"),
          assets: [
            {
              asset:
                "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72.4d494e", // MIN
              maximumAmount: 10_000_000n,
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d", // ADA-MIN LP
              maximumAmount: 100_000_000n,
            },
          ],
        },
        {
          minFee: 1_000_000n,
          startTime: new Date("2024-06-24T00:00:00.000Z"),
          endTime: undefined,
          assets: [
            {
              asset:
                "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72.4d494e", // MIN
              maximumAmount: 10_000_000n,
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d", // ADA-MIN LP
              maximumAmount: 100_000_000n,
            },
            {
              asset:
                "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b.6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200", // ADA-MIN LP V2
              maximumAmount: 100_000_000n,
            },
          ],
        },
      ],
    },
  },
  [NetworkEnvironment.TESTNET_PREVIEW]: {
    [DexVersion.DEX_V1]: {
      standardFee: 2_000_000n,
      reduction: [
        {
          minFee: 1_500_000n,
          startTime: new Date("2022-09-01T00:00:00.000Z"),
          endTime: undefined,
          assets: [
            {
              asset:
                "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72.4d494e", // MIN
              maximumAmount: 10_000_000n,
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d", // ADA-MIN LP
              maximumAmount: 100_000_000n,
            },
          ],
        },
      ],
    },
    [DexVersion.STABLESWAP]: {
      standardFee: 2_000_000n,
      reduction: [
        {
          minFee: 1_500_000n,
          startTime: new Date("2022-09-01T00:00:00.000Z"),
          endTime: undefined,
          assets: [
            {
              asset:
                "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72.4d494e", // MIN
              maximumAmount: 10_000_000n,
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d", // ADA-MIN LP
              maximumAmount: 100_000_000n,
            },
          ],
        },
      ],
    },
    [DexVersion.DEX_V2]: {
      standardFee: 1_300_000n,
      reduction: [
        {
          minFee: 1_000_000n,
          startTime: new Date("2024-01-01T00:00:00.000Z"),
          endTime: undefined,
          assets: [
            {
              asset:
                "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72.4d494e", // MIN
              maximumAmount: 10_000_000n,
            },
            {
              asset:
                "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86.3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d", // ADA-MIN LP
              maximumAmount: 100_000_000n,
            },
          ],
        },
      ],
    },
  },
};
