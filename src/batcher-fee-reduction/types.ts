export type BatcherFeeAssetConfig = {
    asset: string;
    maximumAmount: bigint;
};

export type BatcherFeeConfig = {
    maximumReduction: number;
    startTime: Date;
    endTime?: Date;
    maximumAmountMIN: bigint;
    maximumAmountADAMINLP: bigint;
};