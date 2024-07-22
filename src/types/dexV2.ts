import { Address, UTxO } from "lucid-cardano";

import { Asset } from "./asset";
import { NetworkEnvironment } from "./network";

export type OrderV2ExpirySetting = {
  expiredTime: bigint;
  maxCancellingTip: bigint;
};

/**
 * Options to build DEX transaction with Batcher fee reduction
 */
export type CommonBatcherFeeReductionOptions = {
  inputsToChoose: UTxO[];
  // Have to use server time
  currentTime: bigint;
};

export type BulkOrdersOption = {
  networkEnv: NetworkEnvironment;
  sender: Address;
  orderOptions: OrderOptions[];
  expiredOptions?: OrderV2ExpirySetting;
  batcherFeeReductionOptions?: CommonBatcherFeeReductionOptions;
  availableUtxos: UTxO[];
};

export enum OrderV2StepType {
  SWAP_EXACT_IN = 0,
  STOP_LOSS,
  OCO,
  SWAP_EXACT_OUT,
  DEPOSIT,
  WITHDRAW,
  ZAP_OUT,
  PARTIAL_SWAP,
  WITHDRAW_IMBALANCE,
  SWAP_MULTI_ROUTING,
  DONATION,
}

export type PoolV2BaseFee = {
  feeANumerator: bigint;
  feeBNumerator: bigint;
};

export type OrderV2SwapRouting = {
  lpAsset: Asset;
  direction: OrderV2Direction;
};

export enum OrderV2Direction {
  B_TO_A = 0,
  A_TO_B,
}

export type DepositOptions = {
  type: OrderV2StepType.DEPOSIT;
  assetA: Asset;
  assetB: Asset;
  amountA: bigint;
  amountB: bigint;
  minimumLPReceived: bigint;
  killOnFailed: boolean;
  poolFee?: PoolV2BaseFee;
};

export type WithdrawOptions = {
  type: OrderV2StepType.WITHDRAW;
  lpAmount: bigint;
  minimumAssetAReceived: bigint;
  minimumAssetBReceived: bigint;
  killOnFailed: boolean;
};

export type SwapExactInOptions = {
  type: OrderV2StepType.SWAP_EXACT_IN;
  assetIn: Asset;
  amountIn: bigint;
  minimumAmountOut: bigint;
  direction: OrderV2Direction;
  killOnFailed: boolean;
  isLimitOrder: boolean;
};

export type SwapExactOutOptions = {
  type: OrderV2StepType.SWAP_EXACT_OUT;
  assetIn: Asset;
  maximumAmountIn: bigint;
  expectedReceived: bigint;
  direction: OrderV2Direction;
  killOnFailed: boolean;
};

export type StopOptions = {
  type: OrderV2StepType.STOP_LOSS;
  assetIn: Asset;
  amountIn: bigint;
  stopAmount: bigint;
  direction: OrderV2Direction;
};

export type OCOOptions = {
  type: OrderV2StepType.OCO;
  assetIn: Asset;
  amountIn: bigint;
  limitAmount: bigint;
  stopAmount: bigint;
  direction: OrderV2Direction;
};

export type ZapOutOptions = {
  type: OrderV2StepType.ZAP_OUT;
  lpAmount: bigint;
  direction: OrderV2Direction;
  minimumReceived: bigint;
  killOnFailed: boolean;
};

export type PartialSwapOptions = {
  type: OrderV2StepType.PARTIAL_SWAP;
  assetIn: Asset;
  amountIn: bigint;
  direction: OrderV2Direction;
  expectedInOutRatio: [bigint, bigint];
  maximumSwapTime: bigint;
  minimumSwapAmountRequired: bigint;
};

export type WithdrawImbalanceOptions = {
  type: OrderV2StepType.WITHDRAW_IMBALANCE;
  lpAmount: bigint;
  ratioAssetA: bigint;
  ratioAssetB: bigint;
  minimumAssetA: bigint;
  killOnFailed: boolean;
};

export type MultiRoutingOptions = {
  type: OrderV2StepType.SWAP_MULTI_ROUTING;
  assetIn: Asset;
  amountIn: bigint;
  routings: OrderV2SwapRouting[];
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

export enum OrderV2AmountType {
  SPECIFIC_AMOUNT = 0,
  ALL,
}

export type OrderV2SwapAmountOption =
  | {
      type: OrderV2AmountType.SPECIFIC_AMOUNT;
      swapAmount: bigint;
    }
  | {
      type: OrderV2AmountType.ALL;
      deductedAmount: bigint;
    };

export enum OrderV2Killable {
  PENDING_ON_FAILED = 0,
  KILL_ON_FAILED,
}

export type OrderV2DepositAmountOption =
  | {
      type: OrderV2AmountType.SPECIFIC_AMOUNT;
      depositAmountA: bigint;
      depositAmountB: bigint;
    }
  | {
      type: OrderV2AmountType.ALL;
      deductedAmountA: bigint;
      deductedAmountB: bigint;
    };

export type OrderV2WithdrawAmountOption =
  | {
      type: OrderV2AmountType.SPECIFIC_AMOUNT;
      withdrawalLPAmount: bigint;
    }
  | {
      type: OrderV2AmountType.ALL;
      deductedLPAmount: bigint;
    };

export type OrderV2SwapExactInStep = {
  type: OrderV2StepType.SWAP_EXACT_IN;
  direction: OrderV2Direction;
  swapAmountOption: OrderV2SwapAmountOption;
  minimumReceived: bigint;
  killable: OrderV2Killable;
};

export type OrderV2StopLossStep = {
  type: OrderV2StepType.STOP_LOSS;
  direction: OrderV2Direction;
  swapAmountOption: OrderV2SwapAmountOption;
  stopLossReceived: bigint;
};

export type OrderV2OcoStep = {
  type: OrderV2StepType.OCO;
  direction: OrderV2Direction;
  swapAmountOption: OrderV2SwapAmountOption;
  minimumReceived: bigint;
  stopLossReceived: bigint;
};

export type OrderV2SwapExactOutStep = {
  type: OrderV2StepType.SWAP_EXACT_OUT;
  direction: OrderV2Direction;
  maximumSwapAmountOption: OrderV2SwapAmountOption;
  expectedReceived: bigint;
  killable: OrderV2Killable;
};

export type OrderV2DepositStep = {
  type: OrderV2StepType.DEPOSIT;
  depositAmountOption: OrderV2DepositAmountOption;
  minimumLP: bigint;
  killable: OrderV2Killable;
};

export type OrderV2WithdrawStep = {
  type: OrderV2StepType.WITHDRAW;
  withdrawalAmountOption: OrderV2WithdrawAmountOption;
  minimumAssetA: bigint;
  minimumAssetB: bigint;
  killable: OrderV2Killable;
};

export type OrderV2ZapOutStep = {
  type: OrderV2StepType.ZAP_OUT;
  direction: OrderV2Direction;
  withdrawalAmountOption: OrderV2WithdrawAmountOption;
  minimumReceived: bigint;
  killable: OrderV2Killable;
};

export type OrderV2PartialSwapStep = {
  type: OrderV2StepType.PARTIAL_SWAP;
  direction: OrderV2Direction;
  totalSwapAmount: bigint;
  ioRatioNumerator: bigint;
  ioRatioDenominator: bigint;
  hops: bigint;
  minimumSwapAmountRequired: bigint;
  maxBatcherFeeEachTime: bigint;
};

export type OrderV2WithdrawImbalanceStep = {
  type: OrderV2StepType.WITHDRAW_IMBALANCE;
  withdrawalAmountOption: OrderV2WithdrawAmountOption;
  ratioAssetA: bigint;
  ratioAssetB: bigint;
  minimumAssetA: bigint;
  killable: OrderV2Killable;
};

export type OrderV2SwapMultiRoutingStep = {
  type: OrderV2StepType.SWAP_MULTI_ROUTING;
  routings: OrderV2SwapRouting[];
  swapAmountOption: OrderV2SwapAmountOption;
  minimumReceived: bigint;
};

export type OrderV2DonationStep = {
  type: OrderV2StepType.DONATION;
};

export type OrderV2Step =
  | OrderV2SwapExactInStep
  | OrderV2StopLossStep
  | OrderV2OcoStep
  | OrderV2SwapExactOutStep
  | OrderV2DepositStep
  | OrderV2WithdrawStep
  | OrderV2ZapOutStep
  | OrderV2PartialSwapStep
  | OrderV2WithdrawImbalanceStep
  | OrderV2SwapMultiRoutingStep
  | OrderV2DonationStep;

export enum OrderV2ExtraDatumType {
  NO_DATUM = 0,
  DATUM_HASH,
  INLINE_DATUM,
}

export enum OrderV2AuthorizationMethodType {
  SIGNATURE = 0,
  SPEND_SCRIPT,
  WITHDRAW_SCRIPT,
  MINT_SCRIPT,
}

export type OrderV2AuthorizationMethod = {
  type: OrderV2AuthorizationMethodType;
  hash: Bytes;
};

export type OrderV2ExtraDatum =
  | {
      type: OrderV2ExtraDatumType.NO_DATUM;
    }
  | {
      type:
        | OrderV2ExtraDatumType.DATUM_HASH
        | OrderV2ExtraDatumType.INLINE_DATUM;
      hash: Bytes;
    };

export type OrderV2Author = {
  canceller: OrderV2AuthorizationMethod;
  refundReceiver: Address;
  refundReceiverDatum: OrderV2ExtraDatum;
  successReceiver: Address;
  successReceiverDatum: OrderV2ExtraDatum;
};

export type OrderV2Datum = {
  author: OrderV2Author;
  lpAsset: Asset;
  step: OrderV2Step;
  maxBatcherFee: bigint;
  expiredOptions?: OrderV2ExpirySetting;
};

export type BuildLPFeeVotingTxOptions = {
  address: Address;
  lpAsset: Asset;
  expectedFee: number;
};

export type LPFeeVote = {
  schemaVersion: "v1";
  addressIdent: string;
  expectedFee: number;
  poolIdent: string;
};
