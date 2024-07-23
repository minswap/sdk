import invariant from "@minswap/tiny-invariant";
import { Assets, C, Data, Lucid, TxComplete } from "lucid-cardano";

import { calculateBatcherFee } from "./batcher-fee-reduction/calculate";
import { DexVersion } from "./batcher-fee-reduction/types.internal";
import { Asset } from "./types/asset";
import {
  DexV2Constant,
  FIXED_DEPOSIT_ADA,
  MetadataMessage,
} from "./types/constants";
import { BulkOrdersOption, OrderOptions } from "./types/dexV2";
import { NetworkEnvironment, NetworkId } from "./types/network";
import { OrderV2 } from "./types/order";
import { lucidToNetworkEnv } from "./utils/network.internal";

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
      case OrderV2.StepType.DEPOSIT: {
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
      case OrderV2.StepType.WITHDRAW: {
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
      case OrderV2.StepType.SWAP_EXACT_IN: {
        const { assetIn, amountIn, minimumAmountOut } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(minimumAmountOut > 0n, "minimum amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        return orderAssets;
      }
      case OrderV2.StepType.SWAP_EXACT_OUT: {
        const { assetIn, maximumAmountIn, expectedReceived } = options;
        invariant(maximumAmountIn > 0n, "amount in must be positive");
        invariant(expectedReceived > 0n, "minimum amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = maximumAmountIn;
        return orderAssets;
      }
      case OrderV2.StepType.STOP: {
        const { assetIn, amountIn, stopAmount } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(stopAmount > 0n, "stop amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        return orderAssets;
      }
      case OrderV2.StepType.OCO: {
        const { assetIn, amountIn, stopAmount, limitAmount } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(stopAmount > 0n, "stop amount out must be positive");
        invariant(limitAmount > 0n, "limit amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        return orderAssets;
      }
      case OrderV2.StepType.ZAP_OUT: {
        const { lpAsset, lpAmount, minimumReceived } = options;
        invariant(lpAmount > 0n, "lp amount in must be positive");
        invariant(minimumReceived > 0n, "minimum amount out must be positive");
        orderAssets[Asset.toString(lpAsset)] = lpAmount;
        return orderAssets;
      }
      case OrderV2.StepType.PARTIAL_SWAP: {
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
      case OrderV2.StepType.WITHDRAW_IMBALANCE: {
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
      case OrderV2.StepType.SWAP_ROUTING: {
        const { assetIn, amountIn } = options;
        invariant(amountIn > 0n, "Amount must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        return orderAssets;
      }
    }
  }

  buildOrderStep(options: OrderOptions, finalBatcherFee: bigint): OrderV2.Step {
    switch (options.type) {
      case OrderV2.StepType.DEPOSIT: {
        const { amountA, amountB, minimumLPReceived, killOnFailed } = options;
        invariant(
          amountA >= 0n && amountB >= 0n && amountA + amountB > 0n,
          "amount must be positive"
        );
        invariant(
          minimumLPReceived > 0n,
          "minimum LP received must be positive"
        );
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.DEPOSIT,
          depositAmount: {
            type: OrderV2.AmountType.SPECIFIC_AMOUNT,
            depositAmountA: amountA,
            depositAmountB: amountB,
          },
          minimumLP: minimumLPReceived,
          killable: killOnFailed
            ? OrderV2.Killable.KILL_ON_FAILED
            : OrderV2.Killable.PENDING_ON_FAILED,
        };
        return orderStep;
      }
      case OrderV2.StepType.WITHDRAW: {
        const {
          lpAmount,
          minimumAssetAReceived,
          minimumAssetBReceived,
          killOnFailed,
        } = options;
        invariant(lpAmount > 0n, "LP amount must be positive");
        invariant(
          minimumAssetAReceived > 0n && minimumAssetBReceived > 0n,
          "minimum asset received must be positive"
        );
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.WITHDRAW,
          withdrawalAmount: {
            type: OrderV2.AmountType.SPECIFIC_AMOUNT,
            withdrawalLPAmount: lpAmount,
          },
          minimumAssetA: minimumAssetAReceived,
          minimumAssetB: minimumAssetBReceived,
          killable: killOnFailed
            ? OrderV2.Killable.KILL_ON_FAILED
            : OrderV2.Killable.PENDING_ON_FAILED,
        };
        return orderStep;
      }
      case OrderV2.StepType.SWAP_EXACT_IN: {
        const { amountIn, direction, minimumAmountOut, killOnFailed } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(minimumAmountOut > 0n, "minimum amount out must be positive");
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.SWAP_EXACT_IN,
          direction: direction,
          swapAmount: {
            type: OrderV2.AmountType.SPECIFIC_AMOUNT,
            swapAmount: amountIn,
          },
          minimumReceived: minimumAmountOut,
          killable: killOnFailed
            ? OrderV2.Killable.KILL_ON_FAILED
            : OrderV2.Killable.PENDING_ON_FAILED,
        };
        return orderStep;
      }
      case OrderV2.StepType.SWAP_EXACT_OUT: {
        const { maximumAmountIn, expectedReceived, direction, killOnFailed } =
          options;
        invariant(maximumAmountIn > 0n, "amount in must be positive");
        invariant(expectedReceived > 0n, "minimum amount out must be positive");
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.SWAP_EXACT_OUT,
          direction: direction,
          maximumSwapAmount: {
            type: OrderV2.AmountType.SPECIFIC_AMOUNT,
            swapAmount: maximumAmountIn,
          },
          expectedReceived: expectedReceived,
          killable: killOnFailed
            ? OrderV2.Killable.KILL_ON_FAILED
            : OrderV2.Killable.PENDING_ON_FAILED,
        };
        return orderStep;
      }
      case OrderV2.StepType.STOP: {
        const { amountIn, direction, stopAmount } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(stopAmount > 0n, "stop amount out must be positive");
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.STOP,
          direction: direction,
          swapAmount: {
            type: OrderV2.AmountType.SPECIFIC_AMOUNT,
            swapAmount: amountIn,
          },
          stopReceived: stopAmount,
        };
        return orderStep;
      }
      case OrderV2.StepType.OCO: {
        const { amountIn, direction, stopAmount, limitAmount } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(stopAmount > 0n, "stop amount out must be positive");
        invariant(limitAmount > 0n, "limit amount out must be positive");
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.OCO,
          direction: direction,
          swapAmount: {
            type: OrderV2.AmountType.SPECIFIC_AMOUNT,
            swapAmount: amountIn,
          },
          stopReceived: stopAmount,
          minimumReceived: limitAmount,
        };
        return orderStep;
      }
      case OrderV2.StepType.ZAP_OUT: {
        const { lpAmount, minimumReceived, direction, killOnFailed } = options;
        invariant(lpAmount > 0n, "lp amount in must be positive");
        invariant(minimumReceived > 0n, "minimum amount out must be positive");
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.ZAP_OUT,
          direction: direction,
          withdrawalAmount: {
            type: OrderV2.AmountType.SPECIFIC_AMOUNT,
            withdrawalLPAmount: lpAmount,
          },
          minimumReceived: minimumReceived,
          killable: killOnFailed
            ? OrderV2.Killable.KILL_ON_FAILED
            : OrderV2.Killable.PENDING_ON_FAILED,
        };
        return orderStep;
      }
      case OrderV2.StepType.PARTIAL_SWAP: {
        const {
          amountIn,
          direction,
          expectedInOutRatio,
          maximumSwapTime,
          minimumSwapAmountRequired,
        } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        const [expectedInOutRatioNumerator, expectedInOutRatioDenominator] =
          expectedInOutRatio;
        invariant(
          expectedInOutRatioNumerator > 0n &&
            expectedInOutRatioDenominator > 0n,
          "expected input and output ratio must be positive"
        );
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.PARTIAL_SWAP,
          direction: direction,
          totalSwapAmount: amountIn,
          ioRatioNumerator: expectedInOutRatioNumerator,
          ioRatioDenominator: expectedInOutRatioDenominator,
          hops: maximumSwapTime,
          minimumSwapAmountRequired: minimumSwapAmountRequired,
          maxBatcherFeeEachTime: finalBatcherFee,
        };
        return orderStep;
      }
      case OrderV2.StepType.WITHDRAW_IMBALANCE: {
        const {
          lpAmount,
          ratioAssetA,
          ratioAssetB,
          minimumAssetA,
          killOnFailed,
        } = options;
        invariant(lpAmount > 0n, "LP amount must be positive");
        invariant(
          ratioAssetA > 0n && ratioAssetB > 0n && minimumAssetA > 0n,
          "minimum asset and ratio received must be positive"
        );
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.WITHDRAW_IMBALANCE,
          withdrawalAmount: {
            type: OrderV2.AmountType.SPECIFIC_AMOUNT,
            withdrawalLPAmount: lpAmount,
          },
          ratioAssetA: ratioAssetA,
          ratioAssetB: ratioAssetB,
          minimumAssetA: minimumAssetA,
          killable: killOnFailed
            ? OrderV2.Killable.KILL_ON_FAILED
            : OrderV2.Killable.PENDING_ON_FAILED,
        };
        return orderStep;
      }
      case OrderV2.StepType.SWAP_ROUTING: {
        const { amountIn, routings, minimumReceived } = options;
        invariant(amountIn > 0n, "Amount must be positive");
        const orderStep: OrderV2.Step = {
          type: OrderV2.StepType.SWAP_ROUTING,
          routings: routings,
          swapAmount: {
            type: OrderV2.AmountType.SPECIFIC_AMOUNT,
            swapAmount: amountIn,
          },
          minimumReceived: minimumReceived,
        };
        return orderStep;
      }
    }
  }

  private buildDexV2OrderAddress(senderStakeAddress: C.RewardAddress): string {
    const orderAddress =
      DexV2Constant.CONFIG[this.networkId].orderEnterpriseAddress;
    const stakeKeyHash = senderStakeAddress.payment_cred().to_keyhash();
    invariant(stakeKeyHash, "stake keyhash not found");
    return C.BaseAddress.new(
      this.networkId,
      C.StakeCredential.from_keyhash(
        C.Ed25519KeyHash.from_bech32(orderAddress)
      ),
      C.StakeCredential.from_keyhash(stakeKeyHash)
    )
      .to_address()
      .to_bech32("addr");
  }

  private getOrderMetadata(orderOption: OrderOptions): string {
    switch (orderOption.type) {
      case OrderV2.StepType.SWAP_EXACT_IN: {
        if (orderOption.isLimitOrder) {
          return MetadataMessage.SWAP_EXACT_IN_LIMIT_ORDER;
        } else {
          return MetadataMessage.SWAP_EXACT_IN_ORDER;
        }
      }
      case OrderV2.StepType.STOP: {
        return MetadataMessage.STOP_ORDER;
      }
      case OrderV2.StepType.OCO: {
        return MetadataMessage.OCO_ORDER;
      }
      case OrderV2.StepType.SWAP_EXACT_OUT: {
        return MetadataMessage.SWAP_EXACT_OUT_ORDER;
      }
      case OrderV2.StepType.DEPOSIT: {
        const isZapIn =
          orderOption.amountA === 0n || orderOption.amountB === 0n;
        if (isZapIn) {
          return MetadataMessage.ZAP_IN_ORDER;
        } else {
          return MetadataMessage.DEPOSIT_ORDER;
        }
      }
      case OrderV2.StepType.WITHDRAW: {
        return MetadataMessage.WITHDRAW_ORDER;
      }
      case OrderV2.StepType.ZAP_OUT: {
        return MetadataMessage.ZAP_OUT_ORDER;
      }
      case OrderV2.StepType.PARTIAL_SWAP: {
        return MetadataMessage.PARTIAL_SWAP_ORDER;
      }
      case OrderV2.StepType.WITHDRAW_IMBALANCE: {
        return MetadataMessage.WITHDRAW_ORDER;
      }
      case OrderV2.StepType.SWAP_ROUTING: {
        return MetadataMessage.ROUTING_ORDER;
      }
    }
  }

  async createBulkOrdersTx({
    sender,
    orderOptions,
    expiredOptions,
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
    const limitOrders: string[] = [];
    const requireSignerSet = new Set<string>();
    const lucidTx = await this.lucid.newTx();
    for (let i = 0; i < orderOptions.length; i++) {
      const option = orderOptions[i];
      const { type, lpAsset } = option;
      const orderAssets = this.buildOrderValue(option);
      const orderStep = this.buildOrderStep(option, batcherFee);
      if (type === OrderV2.StepType.SWAP_EXACT_IN && option.isLimitOrder) {
        limitOrders.push(i.toString());
      }
      let totalBatcherFee: bigint;
      if (type === OrderV2.StepType.PARTIAL_SWAP) {
        totalBatcherFee = batcherFee * option.maximumSwapTime;
      } else {
        totalBatcherFee = batcherFee;
      }
      if ("lovelace" in orderAssets) {
        orderAssets["lovelace"] += totalBatcherFee;
      } else {
        orderAssets["lovelace"] = totalBatcherFee;
      }
      const orderDatum: OrderV2.Datum = {
        canceller: {
          type: OrderV2.AuthorizationMethodType.SIGNATURE,
          hash: C.Ed25519KeyHash.from_bech32(sender).to_hex(),
        },
        refundReceiver: sender,
        refundReceiverDatum: {
          type: OrderV2.ExtraDatumType.NO_DATUM,
        },
        successReceiver: sender,
        successReceiverDatum: {
          type: OrderV2.ExtraDatumType.NO_DATUM,
        },
        step: orderStep,
        lpAsset: lpAsset,
        maxBatcherFee: totalBatcherFee,
        expiredOptions: expiredOptions,
      };
      const senderStakeAddress = C.RewardAddress.from_address(
        C.Address.from_bech32(sender)
      );
      const orderAddress = senderStakeAddress
        ? this.buildDexV2OrderAddress(senderStakeAddress)
        : DexV2Constant.CONFIG[this.networkId].orderEnterpriseAddress;
      lucidTx.payToContract(
        orderAddress,
        Data.to(OrderV2.Datum.toPlutusData(orderDatum)),
        orderAssets
      );
    }

    const metadata =
      orderOptions.length > 1
        ? MetadataMessage.MIXED_ORDERS
        : this.getOrderMetadata(orderOptions[0]);

    const limitOrderMessage = limitOrders.length > 0 ? limitOrders : undefined;
    if (requireSignerSet.size > 0) {
      for (const requireSigner of requireSignerSet.keys()) {
        lucidTx.addSignerKey(requireSigner);
      }
    }
    lucidTx.attachMetadata(674, {
      sgs: [metadata],
      limitOrders: limitOrderMessage,
    });

    return await lucidTx.payToAddress(sender, reductionAssets).complete();
  }
}
