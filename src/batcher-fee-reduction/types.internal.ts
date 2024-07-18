export type BatcherFeeAssetConfig = {
  asset: string;
  maximumAmount: bigint;
};

export type BatcherFeeReductionConfig = {
  minFee: bigint;
  startTime: Date;
  endTime?: Date;
  assets: BatcherFeeAssetConfig[];
};

export type BatcherFeeConfig = {
  standardFee: bigint;
  reduction: BatcherFeeReductionConfig[];
};

export enum DexVersion {
  DEX_V1 = "DEX_V1",
  DEX_V2 = "DEX_V2",
  STABLESWAP = "STABLESWAP",
}
