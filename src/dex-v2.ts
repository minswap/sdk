import invariant from "@minswap/tiny-invariant";
import {
  Assets,
  C,
  Constr,
  coreToUtxo,
  Data,
  getAddressDetails,
  Lucid,
  TxComplete,
} from "lucid-cardano";

import {
  Asset,
  BlockfrostAdapter,
  DexV2Calculation,
  DexV2Constant,
  FIXED_DEPOSIT_ADA,
  MetadataMessage,
  OrderV2,
  PoolV2,
} from ".";
import { calculateBatcherFee } from "./batcher-fee-reduction/calculate";
import { DexVersion } from "./batcher-fee-reduction/types.internal";
import {
  BulkOrdersOption,
  CancelBulkOrdersOptions,
  OrderOptions,
} from "./types/dexV2";
import { FactoryV2 } from "./types/factory";
import { NetworkEnvironment, NetworkId } from "./types/network";
import { lucidToNetworkEnv } from "./utils/network.internal";

/**
 * Options for building Pool V2 Creation transaction
 * @assetA
 * @assetB
 * @amountA
 * @amountB
 * @tradingFeeNumerator numerator of Pool's trading fee with denominator 10000
 *    Eg:
 *      - fee 0.05% -> tradingFeeNumerator 5
 *      - fee 0.3% -> tradingFeeNumerator 30
 *      - fee 1% -> tradingFeeNumerator 100
 */
export type CreatePoolV2Options = {
  assetA: Asset;
  assetB: Asset;
  amountA: bigint;
  amountB: bigint;
  tradingFeeNumerator: bigint;
};

export class DexV2 {
  private readonly lucid: Lucid;
  private readonly networkId: NetworkId;
  private readonly adapter: BlockfrostAdapter;
  private readonly networkEnv: NetworkEnvironment;
  private readonly dexVersion = DexVersion.DEX_V2;

  constructor(lucid: Lucid, adapter: BlockfrostAdapter) {
    this.lucid = lucid;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
    this.adapter = adapter;
    this.networkEnv = lucidToNetworkEnv(lucid.network);
  }

  async createPoolTx({
    assetA,
    assetB,
    amountA,
    amountB,
    tradingFeeNumerator,
  }: CreatePoolV2Options): Promise<TxComplete> {
    const config = DexV2Constant.CONFIG[this.networkId];
    // Sort ascendingly assets and its amount
    const [sortedAssetA, sortedAssetB, sortedAmountA, sortedAmountB] =
      Asset.compare(assetA, assetB) < 0
        ? [assetA, assetB, amountA, amountB]
        : [assetB, assetA, amountB, amountA];

    const factory = await this.adapter.getFactoryV2ByPair(
      sortedAssetA,
      sortedAssetB
    );
    invariant(
      factory,
      `cannot find available Factory V2 Utxo, the liquidity pool might be created before`
    );

    const initialLiquidity = DexV2Calculation.calculateInitialLiquidity({
      amountA: sortedAmountA,
      amountB: sortedAmountB,
    });
    const remainingLiquidity =
      DexV2Calculation.MAX_LIQUIDITY -
      (initialLiquidity - DexV2Calculation.MINIMUM_LIQUIDITY);
    const lpAssetName = PoolV2.computeLPAssetName(sortedAssetA, sortedAssetB);
    const lpAsset: Asset = {
      policyId: config.lpPolicyId,
      tokenName: lpAssetName,
    };
    const poolBatchingStakeCredential = getAddressDetails(
      config.poolBatchingAddress
    )?.stakeCredential;
    invariant(
      poolBatchingStakeCredential,
      `cannot parse Liquidity Pool batching address`
    );
    const poolDatum: PoolV2.Datum = {
      poolBatchingStakeCredential: poolBatchingStakeCredential,
      assetA: sortedAssetA,
      assetB: sortedAssetB,
      totalLiquidity: initialLiquidity,
      reserveA: sortedAmountA,
      reserveB: sortedAmountB,
      baseFee: {
        feeANumerator: tradingFeeNumerator,
        feeBNumerator: tradingFeeNumerator,
      },
      feeSharingNumerator: undefined,
      allowDynamicFee: false,
    };

    const poolValue: Assets = {
      lovelace: DexV2Calculation.DEFAULT_POOL_ADA,
      [Asset.toString(lpAsset)]: remainingLiquidity,
      [config.poolAuthenAsset]: 1n,
    };
    if (poolValue[Asset.toString(sortedAssetA)]) {
      poolValue[Asset.toString(sortedAssetA)] += sortedAmountA;
    } else {
      poolValue[Asset.toString(sortedAssetA)] = sortedAmountA;
    }
    if (poolValue[Asset.toString(sortedAssetB)]) {
      poolValue[Asset.toString(sortedAssetB)] += sortedAmountB;
    } else {
      poolValue[Asset.toString(sortedAssetB)] = sortedAmountB;
    }

    const deployedScripts = DexV2Constant.DEPLOYED_SCRIPTS[this.networkId];

    const factoryRefs = await this.lucid.utxosByOutRef([
      deployedScripts.factory,
    ]);
    invariant(
      factoryRefs.length === 1,
      "cannot find deployed script for Factory Validator"
    );
    const factoryRef = factoryRefs[0];
    const authenRefs = await this.lucid.utxosByOutRef([deployedScripts.authen]);
    invariant(
      authenRefs.length === 1,
      "cannot find deployed script for Authen Minting Policy"
    );
    const authenRef = authenRefs[0];
    const factoryUtxos = await this.lucid.utxosByOutRef([
      {
        txHash: factory.txIn.txHash,
        outputIndex: factory.txIn.index,
      },
    ]);
    invariant(factoryUtxos.length === 1, "cannot find Utxo of Factory");
    const factoryUtxo = factoryUtxos[0];

    const factoryRedeemer: FactoryV2.Redeemer = {
      assetA: sortedAssetA,
      assetB: sortedAssetB,
    };

    const newFactoryDatum1: FactoryV2.Datum = {
      head: factory.head,
      tail: lpAssetName,
    };
    const newFactoryDatum2: FactoryV2.Datum = {
      head: lpAssetName,
      tail: factory.tail,
    };

    return this.lucid
      .newTx()
      .readFrom([factoryRef, authenRef])
      .collectFrom(
        [factoryUtxo],
        Data.to(FactoryV2.Redeemer.toPlutusData(factoryRedeemer))
      )
      .payToContract(
        config.poolCreationAddress,
        {
          inline: Data.to(PoolV2.Datum.toPlutusData(poolDatum)),
        },
        poolValue
      )
      .payToContract(
        config.factoryAddress,
        {
          inline: Data.to(FactoryV2.Datum.toPlutusData(newFactoryDatum1)),
        },
        {
          [config.factoryAsset]: 1n,
        }
      )
      .payToContract(
        config.factoryAddress,
        {
          inline: Data.to(FactoryV2.Datum.toPlutusData(newFactoryDatum2)),
        },
        {
          [config.factoryAsset]: 1n,
        }
      )
      .mintAssets(
        {
          [Asset.toString(lpAsset)]: DexV2Calculation.MAX_LIQUIDITY,
          [config.factoryAsset]: 1n,
          [config.poolAuthenAsset]: 1n,
        },
        Data.to(new Constr(1, []))
      )
      .attachMetadata(674, { msg: [MetadataMessage.CREATE_POOL] })
      .complete();
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

  private getDexV2OrderScriptHash(): string | undefined {
    const orderAddress =
      DexV2Constant.CONFIG[this.networkId].orderEnterpriseAddress;
    return C.EnterpriseAddress.new(
      this.networkId,
      C.StakeCredential.from_keyhash(C.Ed25519KeyHash.from_bech32(orderAddress))
    )
      .payment_cred()
      .to_scripthash()
      ?.to_hex();
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

  async cancelOrder({ orders }: CancelBulkOrdersOptions): Promise<TxComplete> {
    const v2OrderScriptHash = this.getDexV2OrderScriptHash();
    const requiredPubKeyHashSet = new Set<string>();
    const lucidTx = this.lucid.newTx();
    for (const { utxo, rawDatum } of orders) {
      const orderAddr = utxo.address;
      const orderScriptHash = C.EnterpriseAddress.new(
        this.networkId,
        C.StakeCredential.from_keyhash(C.Ed25519KeyHash.from_bech32(orderAddr))
      )
        .payment_cred()
        .to_scripthash()
        ?.to_hex();
      invariant(
        orderScriptHash,
        `Utxo is not belonged Minswap's order address, utxo: ${utxo.txHash}`
      );
      if (orderScriptHash === v2OrderScriptHash) {
        let datum: OrderV2.Datum;
        if (utxo.datum) {
          const rawDatum = utxo.datum;
          datum = OrderV2.Datum.fromPlutusData(
            this.networkId,
            Data.from(rawDatum) as Constr<Data>
          );
        } else {
          invariant(
            utxo.datumHash && rawDatum,
            `Minswap V2 requires datum for the order Utxo that does not contain Inline Datum`
          );
          datum = OrderV2.Datum.fromPlutusData(
            this.networkId,
            Data.from(rawDatum) as Constr<Data>
          );
        }
        invariant(
          datum.canceller.type === OrderV2.AuthorizationMethodType.SIGNATURE,
          "only support PubKey canceller on this function"
        );
        requiredPubKeyHashSet.add(datum.canceller.hash);
        const redeemer = Data.to(
          new Constr(OrderV2.Redeemer.CANCEL_ORDER_BY_OWNER, [])
        );
        const orderRefUtxo =
          "828258208c98f0530cba144d264fbd2731488af25257d7ce6a0cd1586fc7209363724f0300a3005839007290b6e451c55ec417ccf332119a8b735cb44f3dc7dac405b9101cf2bf5b5bced089f4c15e6d937a2bb441ee6988fdef1eedac40f9caded5011a00be85b603d818590a688202590a63590a600100003332323232323232323222222533300832323232533300c3370e900118058008991919299980799b87480000084cc004dd5980a180a980a980a980a980a980a98068030060a99980799b87480080084c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc080cdc3a4000002264646600200200e44a66604c00229404c8c94ccc094cdc78010028a51133004004001302a002375c60500026eb8c094c07800854ccc080cdc3a40040022646464646600200202844a66605000229404c8c94ccc09ccdd798161812981618129816181698128010028a51133004004001302c002302a0013374a9001198131ba90014bd701bae3026001301e002153330203370e900200089980900419ba548000cc090cdd2a400466048604a603c00497ae04bd70099981019b87375a6044604a66446464a66604866e1d200200114bd6f7b63009bab302930220023022001323300100100322533302700114c103d87a800013232323253330283371e00e004266e9520003302c374c00297ae0133006006003375660520066eb8c09c008c0ac008c0a4004c8cc004004030894ccc09400452f5bded8c0264646464a66604c66e3d22100002100313302a337606ea4008dd3000998030030019bab3027003375c604a0046052004604e0026eb8c094c07800920004a0944c078004c08c004c06c060c8c8c8c8c8c8c94ccc08ccdc3a40000022646464646464646464646464646464646464a6660706076004264646464646464649319299981e99b87480000044c8c94ccc108c1140084c92632375a60840046eb4c10000458c8cdd81822000982218228009bac3043001303b0091533303d3370e90010008a999820181d8048a4c2c2c607601064a66607866e1d2000001132323232323232325333047304a002132498c09401458cdc3a400460886ea8c120004c120008dd6982300098230011822000982200119b8748008c0f8dd51821000981d0060a99981e19b87480080044c8c8c8c8c8c94ccc114c1200084c926302300316375a608c002608c0046088002608800466e1d2002303e3754608400260740182a66607866e1d2004001132323232323232325333047304a002132498c09401458dd6982400098240011bad30460013046002304400130440023370e9001181f1baa3042001303a00c1533303c3370e9003000899191919191919192999823982500109924c604a00a2c66e1d200230443754609000260900046eb4c118004c118008c110004c110008cdc3a4004607c6ea8c108004c0e803054ccc0f0cdc3a40100022646464646464a66608a60900042649319299982199b87480000044c8c8c8c94ccc128c13400852616375a609600260960046eb4c124004c10401854ccc10ccdc3a4004002264646464a666094609a0042930b1bad304b001304b002375a6092002608200c2c608200a2c66e1d200230423754608c002608c0046eb4c110004c110008c108004c0e803054ccc0f0cdc3a401400226464646464646464a66608e60940042649318130038b19b8748008c110dd5182400098240011bad30460013046002375a60880026088004608400260740182a66607866e1d200c001132323232323232325333047304a002132498c09801458cdc3a400460886ea8c120004c120008dd6982300098230011822000982200119b8748008c0f8dd51821000981d0060a99981e19b87480380044c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc134c14000852616375a609c002609c0046eb4c130004c130008dd6982500098250011bad30480013048002375a608c002608c0046eb4c110004c110008cdc3a4004607c6ea8c108004c0e803054ccc0f0cdc3a4020002264646464646464646464a66609260980042649318140048b19b8748008c118dd5182500098250011bad30480013048002375a608c002608c0046eb4c110004c110008c108004c0e803054ccc0f0cdc3a40240022646464646464a66608a60900042646493181200219198008008031129998238008a4c2646600600660960046464a66608c66e1d2000001132323232533304d3050002132498c0b400c58cdc3a400460946ea8c138004c138008c130004c11000858c110004c12400458dd698230009823001182200098220011bac3042001303a00c1533303c3370e900a0008a99981f981d0060a4c2c2c6074016603a018603001a603001c602c01e602c02064a66606c66e1d200000113232533303b303e002149858dd7181e000981a0090a99981b19b87480080044c8c94ccc0ecc0f800852616375c607800260680242a66606c66e1d200400113232533303b303e002149858dd7181e000981a0090a99981b19b87480180044c8c94ccc0ecc0f800852616375c607800260680242c60680222c607200260720046eb4c0dc004c0dc008c0d4004c0d4008c0cc004c0cc008c0c4004c0c4008c0bc004c0bc008c0b4004c0b4008c0ac004c0ac008c0a4004c08407858c0840748c94ccc08ccdc3a40000022a66604c60420042930b0a99981199b87480080044c8c94ccc0a0c0ac00852616375c605200260420042a66604666e1d2004001132325333028302b002149858dd7181480098108010b1810800919299981119b87480000044c8c8c8c94ccc0a4c0b00084c8c9263253330283370e9000000899192999816981800109924c64a66605666e1d20000011323253330303033002132498c04400458c0c4004c0a400854ccc0accdc3a40040022646464646464a666068606e0042930b1bad30350013035002375a606600260660046eb4c0c4004c0a400858c0a400458c0b8004c09800c54ccc0a0cdc3a40040022a666056604c0062930b0b181300118050018b18150009815001181400098100010b1810000919299981099b87480000044c8c94ccc098c0a400852616375a604e002603e0042a66604266e1d20020011323253330263029002149858dd69813800980f8010b180f800919299981019b87480000044c8c94ccc094c0a000852616375a604c002603c0042a66604066e1d20020011323253330253028002149858dd69813000980f0010b180f000919299980f99b87480000044c8c8c8c94ccc098c0a400852616375c604e002604e0046eb8c094004c07400858c0740048c94ccc078cdc3a400000226464a666046604c0042930b1bae3024001301c0021533301e3370e900100089919299981198130010a4c2c6eb8c090004c07000858c070004dd618100009810000980f8011bab301d001301d001301c00237566034002603400260320026030002602e0046eb0c054004c0340184cc004dd5980a180a980a980a980a980a980a980680300591191980080080191299980a8008a50132323253330153375e00c00229444cc014014008c054008c064008c05c004c03001cc94ccc034cdc3a40000022a666020601600e2930b0a99980699b874800800454ccc040c02c01c526161533300d3370e90020008a99980818058038a4c2c2c601600c2c60200026020004601c002600c00229309b2b118029baa001230033754002ae6955ceaab9e5573eae815d0aba24c126d8799fd87a9f581cfb39ea6bb975ea6de4a2c51572234dc584c89beccc09a49934389e51ffff004c0126d8799fd87a9f581cc8b0cc61374d409ff9c8512317003e7196a3e4d48553398c656cc124ffff0001";
        lucidTx
          .collectFrom([utxo], redeemer)
          .readFrom([
            coreToUtxo(
              C.TransactionUnspentOutput.from_bytes(
                Buffer.from(orderRefUtxo, "hex")
              )
            ),
          ]);
      }
    }
    for (const hash of requiredPubKeyHashSet.keys()) {
      lucidTx.addSignerKey(hash);
    }
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.CANCEL_ORDER],
    });
    return lucidTx.complete();
  }
}
