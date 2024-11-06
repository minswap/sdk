import { NetworkEnvironment } from "../types/network";

export type BatcherFeeAssetConfig = {
  asset: string;
  maximumAmount: bigint;
};

export enum DexVersion {
  DEX_V1 = "DEX_V1",
  DEX_V2 = "DEX_V2",
  STABLESWAP = "STABLESWAP",
}

export type BatcherFeeReductionConfig = {
  // Maximum Fee users have to pay for Batcher
  maxFee: bigint;
  // Minimum Fee users have to pay for Batcher
  minFee: bigint;
  // The time that the system starts applying the reduction
  startTime: Date;
  // The condition that the system stops applying the reduction
  endCondition?: {
    // The time that the system stops applying the reduction
    endTime: Date;
  };
  assets: BatcherFeeAssetConfig[];
};

export type BatcherFeeConfig = {
  /**
   * The Fee that the system will choose if there is no active reduction configurations
   * It's 2 ADA in almost cases until now
   */
  defaultFee: bigint;
  reduction: BatcherFeeReductionConfig[];
};

export const FIXED_BATCHER_FEE = 2_000_000n;

const MIN_TESTNET =
  "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e";
const ADA_MIN_LP_V1_TESTNET =
  "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d863bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";
const ADA_MIN_LP_V2_TESTNET =
  "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200";

const MIN_MAINNET =
  "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e";
const ADA_MIN_LP_V1_MAINNET =
  "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d866aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2";
const ADA_MIN_LP_V2_MAINNET =
  "f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c82e2b1fd27a7712a1a9cf750dfbea1a5778611b20e06dd6a611df7a643f8cb75";

export namespace BatcherFeeConfig {
  export const CONFIG: Record<
    NetworkEnvironment,
    Record<DexVersion, BatcherFeeConfig>
  > = {
    [NetworkEnvironment.MAINNET]: {
      [DexVersion.DEX_V1]: {
        defaultFee: 2_000_000n,
        reduction: [
          {
            maxFee: 2_000_000n,
            minFee: 1_500_000n,
            startTime: new Date("2022-09-14T07:00:00.000Z"),
            endCondition: undefined,
            assets: [
              {
                asset: MIN_MAINNET, // MIN
                maximumAmount: 50_000_000_000n, // 50K MIN
              },
              {
                asset: ADA_MIN_LP_V1_MAINNET, // ADA-MIN LP
                maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP
              },
            ],
          },
        ],
      },
      [DexVersion.STABLESWAP]: {
        defaultFee: 2_000_000n,
        reduction: [
          {
            maxFee: 2_000_000n,
            minFee: 1_500_000n,
            startTime: new Date("2022-09-14T07:00:00.000Z"),
            endCondition: undefined,
            assets: [
              {
                asset: MIN_MAINNET, // MIN
                maximumAmount: 50_000_000_000n, // 50K MIN
              },
              {
                asset: ADA_MIN_LP_V1_MAINNET, // ADA-MIN LP
                maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP
              },
            ],
          },
        ],
      },
      [DexVersion.DEX_V2]: {
        defaultFee: 2_000_000n,
        reduction: [
          {
            maxFee: 1_000_000n,
            minFee: 750_000n,
            startTime: new Date("2024-07-01T05:00:00.000Z"),
            endCondition: {
              endTime: new Date("2024-10-10T08:00:00.000Z"),
            },
            assets: [
              {
                asset: MIN_MAINNET, // MIN
                maximumAmount: 50_000_000_000n, // 50K MIN
              },
              {
                asset: ADA_MIN_LP_V1_MAINNET, // ADA-MIN LP V1
                maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP
              },
              {
                asset: ADA_MIN_LP_V2_MAINNET, // ADA-MIN LP V2
                maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP V2
              },
            ],
          },
          {
            maxFee: 2_000_000n,
            minFee: 1_500_000n,
            startTime: new Date("2024-10-10T08:00:00.000Z"),
            endCondition: undefined,
            assets: [
              {
                asset: MIN_MAINNET, // MIN
                maximumAmount: 50_000_000_000n, // 50K MIN
              },
              {
                asset: ADA_MIN_LP_V1_MAINNET, // ADA-MIN LP V1
                maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP
              },
              {
                asset: ADA_MIN_LP_V2_MAINNET, // ADA-MIN LP V2
                maximumAmount: 5_000_000_000n, // 5B ADA-MIN LP V2
              },
            ],
          },
        ],
      },
    },
    [NetworkEnvironment.TESTNET_PREPROD]: {
      [DexVersion.DEX_V1]: {
        defaultFee: 2_000_000n,
        reduction: [
          {
            maxFee: 2_000_000n,
            minFee: 1_500_000n,
            startTime: new Date("2022-09-01T00:00:00.000Z"),
            endCondition: {
              endTime: new Date("2024-06-24T00:00:00.000Z"),
            },
            assets: [
              {
                asset: MIN_TESTNET, // MIN
                maximumAmount: 10_000_000n,
              },
              {
                asset: ADA_MIN_LP_V1_TESTNET, // ADA-MIN LP V1
                maximumAmount: 100_000_000n,
              },
            ],
          },
          {
            maxFee: 2_000_000n,
            minFee: 1_500_000n,
            startTime: new Date("2024-06-24T00:00:00.000Z"),
            endCondition: { endTime: new Date("2024-11-04T11:00:00.000Z") },
            assets: [
              {
                asset: MIN_TESTNET, // MIN
                maximumAmount: 10_000_000n,
              },
              {
                asset: ADA_MIN_LP_V1_TESTNET, // ADA-MIN LP V1
                maximumAmount: 100_000_000n,
              },
              {
                asset: ADA_MIN_LP_V2_TESTNET, // ADA-MIN LP V2
                maximumAmount: 100_000_000n,
              },
            ],
          },
          {
            maxFee: 2_000_000n,
            minFee: 1_500_000n,
            startTime: new Date("2024-11-04T11:00:00.000Z"),
            endCondition: undefined,
            assets: [
              {
                asset: MIN_TESTNET, // MIN
                maximumAmount: 10_000_000n,
              },
              {
                asset: ADA_MIN_LP_V1_TESTNET, // ADA-MIN LP V1
                maximumAmount: 100_000_000n,
              },
            ],
          },
        ],
      },
      [DexVersion.STABLESWAP]: {
        defaultFee: 2_000_000n,
        reduction: [
          {
            maxFee: 2_000_000n,
            minFee: 1_500_000n,
            startTime: new Date("2022-09-01T00:00:00.000Z"),
            endCondition: {
              endTime: new Date("2024-06-24T00:00:00.000Z"),
            },
            assets: [
              {
                asset: MIN_TESTNET, // MIN
                maximumAmount: 10_000_000n,
              },
              {
                asset: ADA_MIN_LP_V1_TESTNET, // ADA-MIN LP
                maximumAmount: 100_000_000n,
              },
            ],
          },
          {
            maxFee: 2_000_000n,
            minFee: 1_500_000n,
            startTime: new Date("2024-06-24T00:00:00.000Z"),
            endCondition: { endTime: new Date("2024-11-04T11:00:00.000Z") },
            assets: [
              {
                asset: MIN_TESTNET, // MIN
                maximumAmount: 10_000_000n,
              },
              {
                asset: ADA_MIN_LP_V1_TESTNET, // ADA-MIN LP V1
                maximumAmount: 100_000_000n,
              },
              {
                asset: ADA_MIN_LP_V2_TESTNET, // ADA-MIN LP V2
                maximumAmount: 100_000_000n,
              },
            ],
          },
          {
            maxFee: 2_000_000n,
            minFee: 1_500_000n,
            startTime: new Date("2024-11-04T11:00:00.000Z"),
            endCondition: undefined,
            assets: [
              {
                asset: MIN_TESTNET, // MIN
                maximumAmount: 10_000_000n,
              },
              {
                asset: ADA_MIN_LP_V1_TESTNET, // ADA-MIN LP V1
                maximumAmount: 100_000_000n,
              },
            ],
          },
        ],
      },
      [DexVersion.DEX_V2]: {
        defaultFee: 2_000_000n,
        reduction: [
          {
            maxFee: 1_300_000n,
            minFee: 1_000_000n,
            startTime: new Date("2024-04-23T00:00:00.000Z"),
            endCondition: {
              endTime: new Date("2024-06-24T00:00:00.000Z"),
            },
            assets: [
              {
                asset: MIN_TESTNET, // MIN
                maximumAmount: 10_000_000n,
              },
              {
                asset: ADA_MIN_LP_V1_TESTNET, // ADA-MIN LP V1
                maximumAmount: 100_000_000n,
              },
            ],
          },
          {
            maxFee: 1_300_000n,
            minFee: 1_000_000n,
            startTime: new Date("2024-06-24T00:00:00.000Z"),
            endCondition: undefined,
            assets: [
              {
                asset: MIN_TESTNET, // MIN
                maximumAmount: 10_000_000n,
              },
              {
                asset: ADA_MIN_LP_V1_TESTNET, // ADA-MIN LP V1
                maximumAmount: 100_000_000n,
              },
              {
                asset: ADA_MIN_LP_V2_TESTNET, // ADA-MIN LP V2
                maximumAmount: 100_000_000n,
              },
            ],
          },
        ],
      },
    },
    [NetworkEnvironment.TESTNET_PREVIEW]: {
      [DexVersion.DEX_V1]: {
        defaultFee: 2_000_000n,
        reduction: [],
      },
      [DexVersion.STABLESWAP]: {
        defaultFee: 2_000_000n,
        reduction: [],
      },
      [DexVersion.DEX_V2]: {
        defaultFee: 2_000_000n,
        reduction: [],
      },
    },
  };

  export function getActiveConfig({
    networkEnv,
    dexVersion,
    currentDate,
  }: {
    networkEnv: NetworkEnvironment;
    dexVersion: DexVersion;
    currentDate: Date;
  }): BatcherFeeReductionConfig | undefined {
    const batcherFeeConfig = CONFIG[networkEnv][dexVersion];
    let activeReductionConfig: BatcherFeeReductionConfig | undefined;
    for (const config of batcherFeeConfig.reduction) {
      const { startTime, endCondition } = config;
      const isAfterStart = startTime.getTime() <= currentDate.getTime();
      let isBeforeEnd: boolean;
      if (endCondition) {
        isBeforeEnd = currentDate.getTime() <= endCondition.endTime.getTime();
      } else {
        isBeforeEnd = true;
      }
      if (isAfterStart && isBeforeEnd) {
        activeReductionConfig = config;
      }
    }
    return activeReductionConfig;
  }
}
