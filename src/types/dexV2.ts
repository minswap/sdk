import { Address, UTxO } from "lucid-cardano";

import { Asset } from "./asset";
import { NetworkEnvironment } from "./network";
import { OrderV2 } from "./order";

export type BulkOrdersOption = {
  networkEnv: NetworkEnvironment;
  sender: Address;
  orderOptions: OrderOptions[];
  expiredOptions?: OrderV2.ExpirySetting;
  availableUtxos: UTxO[];
};

export type PoolV2BaseFee = {
  feeANumerator: bigint;
  feeBNumerator: bigint;
};

export type OrderV2SwapRouting = {
  lpAsset: Asset;
  direction: OrderV2.Direction;
};
export type DepositOptions = {
  type: OrderV2.StepType.DEPOSIT;
  assetA: Asset;
  assetB: Asset;
  amountA: bigint;
  amountB: bigint;
  minimumLPReceived: bigint;
  killOnFailed: boolean;
  poolFee?: PoolV2BaseFee;
};

export type WithdrawOptions = {
  type: OrderV2.StepType.WITHDRAW;
  lpAmount: bigint;
  minimumAssetAReceived: bigint;
  minimumAssetBReceived: bigint;
  killOnFailed: boolean;
};

export type SwapExactInOptions = {
  type: OrderV2.StepType.SWAP_EXACT_IN;
  assetIn: Asset;
  amountIn: bigint;
  minimumAmountOut: bigint;
  direction: OrderV2.Direction;
  killOnFailed: boolean;
  isLimitOrder: boolean;
};

export type SwapExactOutOptions = {
  type: OrderV2.StepType.SWAP_EXACT_OUT;
  assetIn: Asset;
  maximumAmountIn: bigint;
  expectedReceived: bigint;
  direction: OrderV2.Direction;
  killOnFailed: boolean;
};

export type StopOptions = {
  type: OrderV2.StepType.STOP;
  assetIn: Asset;
  amountIn: bigint;
  stopAmount: bigint;
  direction: OrderV2.Direction;
};

export type OCOOptions = {
  type: OrderV2.StepType.OCO;
  assetIn: Asset;
  amountIn: bigint;
  limitAmount: bigint;
  stopAmount: bigint;
  direction: OrderV2.Direction;
};

export type ZapOutOptions = {
  type: OrderV2.StepType.ZAP_OUT;
  lpAmount: bigint;
  direction: OrderV2.Direction;
  minimumReceived: bigint;
  killOnFailed: boolean;
};

export type PartialSwapOptions = {
  type: OrderV2.StepType.PARTIAL_SWAP;
  assetIn: Asset;
  amountIn: bigint;
  direction: OrderV2.Direction;
  expectedInOutRatio: [bigint, bigint];
  maximumSwapTime: bigint;
  minimumSwapAmountRequired: bigint;
};

export type WithdrawImbalanceOptions = {
  type: OrderV2.StepType.WITHDRAW_IMBALANCE;
  lpAmount: bigint;
  ratioAssetA: bigint;
  ratioAssetB: bigint;
  minimumAssetA: bigint;
  killOnFailed: boolean;
};

export type MultiRoutingOptions = {
  type: OrderV2.StepType.SWAP_ROUTING;
  assetIn: Asset;
  amountIn: bigint;
  routings: OrderV2.Route[];
  minimumReceived: bigint;
};

export type OrderOptions = (
  | DepositOptions
  | WithdrawOptions
  | SwapExactInOptions
  | SwapExactOutOptions
  | StopOptions
  | OCOOptions
  | ZapOutOptions
  | PartialSwapOptions
  | WithdrawImbalanceOptions
  | MultiRoutingOptions
) & {
  lpAsset: Asset;
};
