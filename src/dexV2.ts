import invariant from "@minswap/tiny-invariant";
import { Address, Assets, Lucid, TxComplete, UTxO } from "lucid-cardano";

import { calculateBatcherFee } from "./batcher-fee-reduction/calculate";
import { DexVersion } from "./batcher-fee-reduction/types.internal";
import { Asset } from "./types/asset";
import { FIXED_DEPOSIT_ADA } from "./types/constants";
import { NetworkEnvironment, NetworkId } from "./types/network";
import { lucidToNetworkEnv } from "./utils/network.internal";

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

export class DexV2 {
  private readonly lucid: Lucid;
  private readonly networkId: NetworkId;
  private readonly networkEnv: NetworkEnvironment;
  private readonly dexVersion = DexVersion.DEX_V2;

  constructor(lucid: Lucid) {
    this.lucid = lucid;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
    this.networkEnv = lucidToNetworkEnv(lucid.network);
  }

  private buildOrderValue(options: OrderOptions): Record<string, bigint> {
    const orderAssets: Assets = {
      lovelace: FIXED_DEPOSIT_ADA,
    };
    switch (options.type) {
      case OrderV2StepType.DEPOSIT: {
        const { assetA, assetB, amountA, amountB, minimumLPReceived } = options;
        invariant(
          amountA >= 0n && amountB >= 0n && amountA + amountB > 0n,
          "amount must be positive"
        );
        invariant(
          minimumLPReceived > 0n,
          "minimum LP received must be positive"
        );
        orderAssets[Asset.toString(assetA)] = amountA;
        orderAssets[Asset.toString(assetB)] = amountB;
        return orderAssets;
      }
      case OrderV2StepType.WITHDRAW: {
        const {
          lpAsset,
          lpAmount,
          minimumAssetAReceived,
          minimumAssetBReceived,
        } = options;
        invariant(lpAmount > 0n, "LP amount must be positive");
        invariant(
          minimumAssetAReceived > 0n && minimumAssetBReceived > 0n,
          "minimum asset received must be positive"
        );
        orderAssets[Asset.toString(lpAsset)] = lpAmount;
        return orderAssets;
      }
      case OrderV2StepType.SWAP_EXACT_IN: {
        const { assetIn, amountIn, minimumAmountOut } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(minimumAmountOut > 0n, "minimum amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        return orderAssets;
      }
      case OrderV2StepType.SWAP_EXACT_OUT: {
        const { assetIn, maximumAmountIn, expectedReceived } = options;
        invariant(maximumAmountIn > 0n, "amount in must be positive");
        invariant(expectedReceived > 0n, "minimum amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = maximumAmountIn;
        return orderAssets;
      }
      case OrderV2StepType.STOP_LOSS: {
        const { assetIn, amountIn, stopAmount } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(stopAmount > 0n, "stop amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        return orderAssets;
      }
      case OrderV2StepType.OCO: {
        const { assetIn, amountIn, stopAmount, limitAmount } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(stopAmount > 0n, "stop amount out must be positive");
        invariant(limitAmount > 0n, "limit amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        return orderAssets;
      }
      case OrderV2StepType.ZAP_OUT: {
        const { lpAsset, lpAmount, minimumReceived } = options;
        invariant(lpAmount > 0n, "lp amount in must be positive");
        invariant(minimumReceived > 0n, "minimum amount out must be positive");
        orderAssets[Asset.toString(lpAsset)] = lpAmount;
        return orderAssets;
      }
      case OrderV2StepType.PARTIAL_SWAP: {
        const { assetIn, amountIn, expectedInOutRatio } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        const [expectedInOutRatioNumerator, expectedInOutRatioDenominator] =
          expectedInOutRatio;
        invariant(
          expectedInOutRatioNumerator > 0n &&
            expectedInOutRatioDenominator > 0n,
          "expected input and output ratio must be positive"
        );
        orderAssets[Asset.toString(assetIn)] = amountIn;
        return orderAssets;
      }
      case OrderV2StepType.WITHDRAW_IMBALANCE: {
        const { lpAsset, lpAmount, ratioAssetA, ratioAssetB, minimumAssetA } =
          options;
        invariant(lpAmount > 0n, "LP amount must be positive");
        invariant(
          ratioAssetA > 0n && ratioAssetB > 0n && minimumAssetA > 0n,
          "minimum asset and ratio received must be positive"
        );
        orderAssets[Asset.toString(lpAsset)] = lpAmount;
        return orderAssets;
      }
      case OrderV2StepType.SWAP_MULTI_ROUTING: {
        const { assetIn, amountIn } = options;
        invariant(amountIn > 0n, "Amount must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        return orderAssets;
      }
    }
  }

  async createBulkOrdersTx({
    networkEnv,
    sender,
    orderOptions,
    expiredOptions,
    batcherFeeReductionOptions,
    availableUtxos,
  }: BulkOrdersOption): Promise<TxComplete> {
    // calculate total order value
    const totalOrderAssets: Record<string, bigint> = {};
    for (const option of orderOptions) {
      const orderAssets = this.buildOrderValue(option);
      for (const [asset, amt] of Object.entries(orderAssets)) {
        if (totalOrderAssets[asset]) {
          totalOrderAssets[asset] += amt;
        } else {
          totalOrderAssets[asset] = amt;
        }
      }
    }
    // calculate batcher fee
    const { batcherFee, reductionAssets } = calculateBatcherFee({
      utxos: availableUtxos,
      orderAssets: totalOrderAssets,
      networkEnv: this.networkEnv,
      dexVersion: this.dexVersion,
    });
  }
}
