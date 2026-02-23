import { OrderV1, OrderV2, StableOrder } from "../types/order";

export enum DexVersion {
  DEX_V1 = "DEX_V1",
  DEX_V2 = "DEX_V2",
  STABLESWAP = "STABLESWAP",
}

export const BATCHER_FEE_DEX_V1: Record<OrderV1.StepType, bigint> = {
  [OrderV1.StepType.SWAP_EXACT_IN]: 2_000_000n,
  [OrderV1.StepType.SWAP_EXACT_OUT]: 2_000_000n,
  [OrderV1.StepType.DEPOSIT]: 2_000_000n,
  [OrderV1.StepType.WITHDRAW]: 2_000_000n,
  [OrderV1.StepType.ZAP_IN]: 2_000_000n,
};

export const BATCHER_FEE_STABLESWAP: Record<StableOrder.StepType, bigint> = {
  [StableOrder.StepType.SWAP]: 2_000_000n,
  [StableOrder.StepType.DEPOSIT]: 2_000_000n,
  [StableOrder.StepType.WITHDRAW]: 2_000_000n,
  [StableOrder.StepType.WITHDRAW_IMBALANCE]: 2_000_000n,
  [StableOrder.StepType.ZAP_OUT]: 2_000_000n,
};

export const BATCHER_FEE_DEX_V2: Record<OrderV2.StepType, bigint> = {
  [OrderV2.StepType.SWAP_EXACT_IN]: 2_000_000n,
  [OrderV2.StepType.STOP]: 2_000_000n,
  [OrderV2.StepType.OCO]: 2_000_000n,
  [OrderV2.StepType.SWAP_EXACT_OUT]: 2_000_000n,
  [OrderV2.StepType.DEPOSIT]: 2_000_000n,
  [OrderV2.StepType.WITHDRAW]: 2_000_000n,
  [OrderV2.StepType.ZAP_OUT]: 2_000_000n,
  [OrderV2.StepType.PARTIAL_SWAP]: 2_000_000n,
  [OrderV2.StepType.WITHDRAW_IMBALANCE]: 2_000_000n,
  [OrderV2.StepType.SWAP_ROUTING]: 2_000_000n,
  [OrderV2.StepType.DONATION]: 2_000_000n,
};

export const BATCHER_FEE = {
  [DexVersion.DEX_V1]: BATCHER_FEE_DEX_V1,
  [DexVersion.STABLESWAP]: BATCHER_FEE_STABLESWAP,
  [DexVersion.DEX_V2]: BATCHER_FEE_DEX_V2,
};
