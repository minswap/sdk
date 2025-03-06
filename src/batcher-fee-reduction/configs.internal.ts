import { OrderV1, OrderV2, StableOrder } from "../types/order";

export enum DexVersion {
  DEX_V1 = "DEX_V1",
  DEX_V2 = "DEX_V2",
  STABLESWAP = "STABLESWAP",
}

export const BATCHER_FEE_DEX_V1: Record<OrderV1.StepType, bigint> = {
  [OrderV1.StepType.SWAP_EXACT_IN]: 900_000n,
  [OrderV1.StepType.SWAP_EXACT_OUT]: 900_000n,
  [OrderV1.StepType.DEPOSIT]: 1_000_000n,
  [OrderV1.StepType.WITHDRAW]: 1_000_000n,
  [OrderV1.StepType.ZAP_IN]: 1_050_000n,
};

export const BATCHER_FEE_STABLESWAP: Record<StableOrder.StepType, bigint> = {
  [StableOrder.StepType.SWAP]: 600_000n,
  [StableOrder.StepType.DEPOSIT]: 600_000n,
  [StableOrder.StepType.WITHDRAW]: 600_000n,
  [StableOrder.StepType.WITHDRAW_IMBALANCE]: 600_000n,
  [StableOrder.StepType.ZAP_OUT]: 600_000n,
};

export const BATCHER_FEE_DEX_V2: Record<OrderV2.StepType, bigint> = {
  [OrderV2.StepType.SWAP_EXACT_IN]: 700_000n,
  [OrderV2.StepType.STOP]: 700_000n,
  [OrderV2.StepType.OCO]: 700_000n,
  [OrderV2.StepType.SWAP_EXACT_OUT]: 700_000n,
  [OrderV2.StepType.DEPOSIT]: 750_000n,
  [OrderV2.StepType.WITHDRAW]: 700_000n,
  [OrderV2.StepType.ZAP_OUT]: 700_000n,
  [OrderV2.StepType.PARTIAL_SWAP]: 720_000n,
  [OrderV2.StepType.WITHDRAW_IMBALANCE]: 750_000n,
  [OrderV2.StepType.SWAP_ROUTING]: 900_000n,
  [OrderV2.StepType.DONATION]: 700_000n,
};

export const BATCHER_FEE = {
  [DexVersion.DEX_V1]: BATCHER_FEE_DEX_V1,
  [DexVersion.STABLESWAP]: BATCHER_FEE_STABLESWAP,
  [DexVersion.DEX_V2]: BATCHER_FEE_DEX_V2,
};
