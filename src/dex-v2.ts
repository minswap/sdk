import invariant from "@minswap/tiny-invariant";
import {
  Address,
  Assets,
  Constr,
  Credential,
  Data,
  Lucid,
  OutRef,
  Tx,
  TxComplete,
  UTxO,
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

export type BulkOrdersOption = {
  sender: Address;
  orderOptions: OrderOptions[];
  expiredOptions?: OrderV2.ExpirySetting;
  availableUtxos: UTxO[];
  composeTx?: Tx;
  AuthorizationMethodType? : OrderV2.AuthorizationMethodType;
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
  maximumSwapTime: number;
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

export type CancelBulkOrdersOptions = {
  orderOutRefs: OutRef[];
  composeTx? : Tx,
  AuthorizationMethodType? : OrderV2.AuthorizationMethodType;
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
      PoolV2.MAX_LIQUIDITY - (initialLiquidity - PoolV2.MINIMUM_LIQUIDITY);
    const lpAssetName = PoolV2.computeLPAssetName(sortedAssetA, sortedAssetB);
    const lpAsset: Asset = {
      policyId: config.lpPolicyId,
      tokenName: lpAssetName,
    };
    const poolBatchingStakeCredential = this.lucid.utils.getAddressDetails(
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
      lovelace: PoolV2.DEFAULT_POOL_ADA,
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
          [Asset.toString(lpAsset)]: PoolV2.MAX_LIQUIDITY,
          [config.factoryAsset]: 1n,
          [config.poolAuthenAsset]: 1n,
        },
        Data.to(new Constr(1, []))
      )
      .attachMetadata(674, { msg: [MetadataMessage.CREATE_POOL] })
      .complete();
  }

  private buildOrderValue(options: OrderOptions): Record<string, bigint> {
    const orderAssets: Assets = {};
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
        break;
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
        break;
      }
      case OrderV2.StepType.SWAP_EXACT_IN: {
        const { assetIn, amountIn, minimumAmountOut } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(minimumAmountOut > 0n, "minimum amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        break;
      }
      case OrderV2.StepType.SWAP_EXACT_OUT: {
        const { assetIn, maximumAmountIn, expectedReceived } = options;
        invariant(maximumAmountIn > 0n, "amount in must be positive");
        invariant(expectedReceived > 0n, "minimum amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = maximumAmountIn;
        break;
      }
      case OrderV2.StepType.STOP: {
        const { assetIn, amountIn, stopAmount } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(stopAmount > 0n, "stop amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        break;
      }
      case OrderV2.StepType.OCO: {
        const { assetIn, amountIn, stopAmount, limitAmount } = options;
        invariant(amountIn > 0n, "amount in must be positive");
        invariant(stopAmount > 0n, "stop amount out must be positive");
        invariant(limitAmount > 0n, "limit amount out must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        break;
      }
      case OrderV2.StepType.ZAP_OUT: {
        const { lpAsset, lpAmount, minimumReceived } = options;
        invariant(lpAmount > 0n, "lp amount in must be positive");
        invariant(minimumReceived > 0n, "minimum amount out must be positive");
        orderAssets[Asset.toString(lpAsset)] = lpAmount;
        break;
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
        break;
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
        break;
      }
      case OrderV2.StepType.SWAP_ROUTING: {
        const { assetIn, amountIn } = options;
        invariant(amountIn > 0n, "Amount must be positive");
        orderAssets[Asset.toString(assetIn)] = amountIn;
        break;
      }
    }
    if ("lovelace" in orderAssets) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA;
    } else {
      orderAssets["lovelace"] = FIXED_DEPOSIT_ADA;
    }
    return orderAssets;
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
          hops: BigInt(maximumSwapTime),
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

  private buildOrderAddress(senderAddressStakeCred: Credential): string {
    const orderAddress =
      DexV2Constant.CONFIG[this.networkId].orderEnterpriseAddress;
    const orderAddressPaymentCred =
      this.lucid.utils.getAddressDetails(orderAddress).paymentCredential;
    invariant(
      orderAddressPaymentCred,
      "order address payment credentials not found"
    );
    return this.lucid.utils.credentialToAddress(
      orderAddressPaymentCred,
      senderAddressStakeCred
    );
  }

  private getOrderScriptHash(): string | undefined {
    const orderAddress =
      DexV2Constant.CONFIG[this.networkId].orderEnterpriseAddress;
    const addrDetails = this.lucid.utils.getAddressDetails(orderAddress);
    invariant(
      addrDetails.paymentCredential?.type === "Script",
      "order address should be a script address"
    );
    return addrDetails.paymentCredential.hash;
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
    composeTx,
    AuthorizationMethodType
  }: BulkOrdersOption): Promise<TxComplete > {
    // calculate total order value
    const totalOrderAssets: Record<string, bigint> = {};
    for (const option of orderOptions) {
      const orderAssets = this.buildOrderValue(option);
      for (const [asset, amt] of Object.entries(orderAssets)) {
        if (asset in totalOrderAssets) {
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
    const lucidTx = this.lucid.newTx();
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
        totalBatcherFee = batcherFee * BigInt(option.maximumSwapTime);
      } else {
        totalBatcherFee = batcherFee;
      }
      if ("lovelace" in orderAssets) {
        orderAssets["lovelace"] += totalBatcherFee;
      } else {
        orderAssets["lovelace"] = totalBatcherFee;
      }

      const senderPaymentCred = this.lucid.utils.getAddressDetails(sender).paymentCredential;
      invariant( senderPaymentCred, "sender address payment credentials not found");

      const canceller = AuthorizationMethodType ? { 
        type: AuthorizationMethodType,
        hash: senderPaymentCred.hash,
      } : {
        type: OrderV2.AuthorizationMethodType.SIGNATURE,
        hash: senderPaymentCred.hash,
      };
      const orderDatum: OrderV2.Datum = {
        canceller: canceller,
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
      let orderAddress: string;
      try {
        const senderStakeAddress = this.lucid.utils.stakeCredentialOf(sender);
        orderAddress = this.buildOrderAddress(senderStakeAddress);
      } catch (e) {
        // if fails then sender address doesn't have stake credentials
        orderAddress =
          DexV2Constant.CONFIG[this.networkId].orderEnterpriseAddress;
      }
      lucidTx.payToContract(
        orderAddress,
        {
          inline: Data.to(OrderV2.Datum.toPlutusData(orderDatum)),
        },
        orderAssets
      );
    }

    const metadata =
      orderOptions.length > 1
        ? MetadataMessage.MIXED_ORDERS
        : this.getOrderMetadata(orderOptions[0]);

    const limitOrderMessage = limitOrders.length > 0 ? limitOrders : undefined;
    lucidTx.attachMetadata(674, {
      msg: [metadata],
      limitOrders: limitOrderMessage,
    });
    lucidTx.payToAddress(sender, reductionAssets);
    if (composeTx){
      lucidTx.compose(composeTx);
    }
    return lucidTx.complete();
    
  }

  async cancelOrder({
    orderOutRefs,
    composeTx,

  }: CancelBulkOrdersOptions): Promise<TxComplete> {
    const v2OrderScriptHash = this.getOrderScriptHash();
    const orderUtxos = await this.lucid.utxosByOutRef(orderOutRefs);
    if (orderUtxos.length === 0) {
      throw new Error("Order Utxos are empty");
    }
    const requiredPubKeyHashSet = new Set<string>();
    const orderRefs = await this.lucid.utxosByOutRef([
      DexV2Constant.DEPLOYED_SCRIPTS[this.networkId].order,
    ]);
    invariant(
      orderRefs.length === 1,
      "cannot find deployed script for V2 Order"
    );

    const orderRef = orderRefs[0];
    const lucidTx = this.lucid.newTx().readFrom([orderRef]);
    for (const utxo of orderUtxos) {
      const orderAddr = utxo.address;
      const orderScriptPaymentCred =
        this.lucid.utils.getAddressDetails(orderAddr).paymentCredential;
      invariant(
        orderScriptPaymentCred?.type === "Script" &&
          orderScriptPaymentCred.hash === v2OrderScriptHash,
        `Utxo is not belonged Minswap's order address, utxo: ${utxo.txHash}`
      );
      let datum: OrderV2.Datum;
      if (utxo.datum) {
        const rawDatum = utxo.datum;
        datum = OrderV2.Datum.fromPlutusData(
          this.networkId,
          Data.from(rawDatum) as Constr<Data>
        );
      } else if (utxo.datumHash) {
        const rawDatum = await this.lucid.datumOf(utxo);
        datum = OrderV2.Datum.fromPlutusData(
          this.networkId,
          rawDatum as Constr<Data>
        );
      } else {
        throw new Error(
          "Utxo without Datum Hash or Inline Datum can not be spent"
        );
      }

      if(datum.canceller.type === OrderV2.AuthorizationMethodType.SIGNATURE) 
          requiredPubKeyHashSet.add(datum.canceller.hash);
    }
    const redeemer = Data.to(
      new Constr(OrderV2.Redeemer.CANCEL_ORDER_BY_OWNER, [])
    );
    lucidTx.collectFrom(orderUtxos, redeemer);

    for (const hash of requiredPubKeyHashSet.keys()) {
      lucidTx.addSignerKey(hash);
    }
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.CANCEL_ORDER],
    });
    if (composeTx){
      lucidTx.compose(composeTx);
    }
    return lucidTx.complete();
  }
}
