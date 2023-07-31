import invariant from "@minswap/tiny-invariant";
import {
  Address,
  Assets,
  Constr,
  Data,
  Lucid,
  Network,
  SpendingValidator,
  TxComplete,
  UTxO,
} from "lucid-cardano";

import { getBatcherFee } from "./batcher-fee-reduction/configs.internal";
import {
  BATCHER_FEE_REDUCTION_SUPPORTED_ASSET,
  FIXED_DEPOSIT_ADA,
  MetadataMessage,
  ORDER_BASE_ADDRESS,
  orderScript,
} from "./constants";
import { Asset } from "./types/asset";
import { NetworkId } from "./types/network";
import { OrderDatum, OrderRedeemer, OrderStepType } from "./types/order";

/**
 * Common options for build Minswap transaction
 * @sender The owner of this order, it will be used for cancelling this order
 * @availableUtxos Available UTxOs can be used in transaction
 */
type CommonOptions = {
  sender: Address;
  availableUtxos: UTxO[];
};

/**
 * Options for building cancel Order
 * @orderTxId Transaction ID which order is created
 * @sender The owner of this order. The @sender must be matched with data in Order's Datum
 */
export type BuildCancelOrderOptions = {
  orderUtxo: UTxO;
  sender: Address;
};

/**
 * Options for building Deposit Order
 * @assetA @assetB Define pair which you want to deposit to
 * @amountA @amountB Define amount which you want to deposit to
 * @minimumLPReceived Minimum Received Amount you can accept after order is executed
 */
export type BuildDepositTxOptions = CommonOptions & {
  // sender: Address;
  assetA: Asset;
  assetB: Asset;
  amountA: bigint;
  amountB: bigint;
  minimumLPReceived: bigint;
};

/**
 * Options for building Zap In Order
 * @assetIn Asset you want to Zap
 * @assetOut The remaining asset of Pool which you want to Zap.
 *      For eg, in Pool ADA-MIN, if @assetIn is ADA then @assetOut will be MIN and vice versa
 * @minimumLPReceived Minimum Received Amount you can accept after order is executed
 */
export type BuildZapInTxOptions = CommonOptions & {
  sender: Address;
  assetIn: Asset;
  amountIn: bigint;
  assetOut: Asset;
  minimumLPReceived: bigint;
};

/**
 * Options for building Withdrawal Order
 * @lpAsset LP Asset will be withdrawed
 * @lpAmount LP Asset amount will be withdrawed
 * @minimumAssetAReceived Minimum Received of Asset A in the Pool you can accept after order is executed
 * @minimumAssetBReceived Minimum Received of Asset A in the Pool you can accept after order is executed
 */
export type BuildWithdrawTxOptions = CommonOptions & {
  sender: Address;
  lpAsset: Asset;
  lpAmount: bigint;
  minimumAssetAReceived: bigint;
  minimumAssetBReceived: bigint;
};

/**
 * Options for building Swap Exact Out Order
 * @assetIn Asset you want to Swap
 * @assetOut Asset you want to receive
 * @maximumAmountIn The maximum Amount of Asset In which will be spent after order is executed
 * @expectedAmountOut The expected Amount of Asset Out you want to receive after order is executed
 */
export type BuildSwapExactOutTxOptions = CommonOptions & {
  sender: Address;
  assetIn: Asset;
  assetOut: Asset;
  maximumAmountIn: bigint;
  expectedAmountOut: bigint;
};

/**
 * Options for building Swap Exact In Order
 * @assetIn Asset and its amount you want to Swap
 * @amountIn Amount of Asset In you want to Swap
 * @assetOut Asset and you want to receive
 * @minimumAmountOut The minimum Amount of Asset Out you can accept after order is executed
 * @isLimitOrder Define this order is Limit Order or not
 */
export type BuildSwapExactInTxOptions = CommonOptions & {
  sender: Address;
  assetIn: Asset;
  amountIn: bigint;
  assetOut: Asset;
  minimumAmountOut: bigint;
  isLimitOrder: boolean;
};

export class Dex {
  private readonly lucid: Lucid;
  private readonly network: Network;
  private readonly networkId: NetworkId;

  constructor(lucid: Lucid) {
    this.lucid = lucid;
    this.network = lucid.network;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
  }

  async buildSwapExactInTx(
    options: BuildSwapExactInTxOptions
  ): Promise<TxComplete> {
    const {
      sender,
      assetIn,
      amountIn,
      assetOut,
      minimumAmountOut,
      isLimitOrder,
      availableUtxos,
    } = options;
    invariant(amountIn > 0n, "amount in must be positive");
    invariant(minimumAmountOut > 0n, "minimum amount out must be positive");
    const orderAssets: Assets = { [Asset.toString(assetIn)]: amountIn };
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      availableUtxos,
      orderAssets
    );
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderDatum = {
      sender: sender,
      receiver: sender,
      receiverDatumHash: undefined,
      step: {
        type: OrderStepType.SWAP_EXACT_IN,
        desiredAsset: assetOut,
        minimumReceived: minimumAmountOut,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };
    const tx = this.lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        Data.to(OrderDatum.toPlutusData(datum)),
        orderAssets
      )
      .payToAddress(sender, reductionAssets)
      .addSigner(sender);
    if (isLimitOrder) {
      tx.attachMetadata(674, {
        msg: [MetadataMessage.SWAP_EXACT_IN_LIMIT_ORDER],
      });
    } else {
      tx.attachMetadata(674, { msg: [MetadataMessage.SWAP_EXACT_IN_ORDER] });
    }
    return await tx.complete();
  }

  async buildSwapExactOutTx(
    options: BuildSwapExactOutTxOptions
  ): Promise<TxComplete> {
    const {
      sender,
      assetIn,
      assetOut,
      maximumAmountIn,
      expectedAmountOut,
      availableUtxos,
    } = options;
    invariant(
      maximumAmountIn > 0n && expectedAmountOut > 0n,
      "amount in and out must be positive"
    );
    const orderAssets: Assets = { [Asset.toString(assetIn)]: maximumAmountIn };
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      availableUtxos,
      orderAssets
    );
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderDatum = {
      sender: sender,
      receiver: sender,
      receiverDatumHash: undefined,
      step: {
        type: OrderStepType.SWAP_EXACT_OUT,
        desiredAsset: assetOut,
        expectedReceived: expectedAmountOut,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };

    return await this.lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        Data.to(OrderDatum.toPlutusData(datum)),
        orderAssets
      )
      .payToAddress(sender, reductionAssets)
      .addSigner(sender)
      .attachMetadata(674, { msg: [MetadataMessage.SWAP_EXACT_OUT_ORDER] })
      .complete();
  }

  async buildWithdrawTx(options: BuildWithdrawTxOptions): Promise<TxComplete> {
    const {
      sender,
      lpAsset,
      lpAmount,
      minimumAssetAReceived,
      minimumAssetBReceived,
      availableUtxos,
    } = options;
    invariant(lpAmount > 0n, "LP amount must be positive");
    invariant(
      minimumAssetAReceived > 0n && minimumAssetBReceived > 0n,
      "minimum asset received must be positive"
    );
    const orderAssets: Assets = { [Asset.toString(lpAsset)]: lpAmount };
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      availableUtxos,
      orderAssets
    );
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderDatum = {
      sender: sender,
      receiver: sender,
      receiverDatumHash: undefined,
      step: {
        type: OrderStepType.WITHDRAW,
        minimumAssetA: minimumAssetAReceived,
        minimumAssetB: minimumAssetBReceived,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };
    return await this.lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        Data.to(OrderDatum.toPlutusData(datum)),
        orderAssets
      )
      .payToAddress(sender, reductionAssets)
      .addSigner(sender)
      .attachMetadata(674, { msg: [MetadataMessage.WITHDRAW_ORDER] })
      .complete();
  }

  async buildZapInTx(options: BuildZapInTxOptions): Promise<TxComplete> {
    const {
      sender,
      assetIn,
      amountIn,
      assetOut,
      minimumLPReceived,
      availableUtxos,
    } = options;
    invariant(amountIn > 0n, "amount in must be positive");
    invariant(minimumLPReceived > 0n, "minimum LP received must be positive");
    const orderAssets: Assets = { [Asset.toString(assetIn)]: amountIn };
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      availableUtxos,
      orderAssets
    );
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderDatum = {
      sender: sender,
      receiver: sender,
      receiverDatumHash: undefined,
      step: {
        type: OrderStepType.ZAP_IN,
        desiredAsset: assetOut,
        minimumLP: minimumLPReceived,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };

    return await this.lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        Data.to(OrderDatum.toPlutusData(datum)),
        orderAssets
      )
      .payToAddress(sender, reductionAssets)
      .addSigner(sender)
      .attachMetadata(674, { msg: [MetadataMessage.ZAP_IN_ORDER] })
      .complete();
  }

  async buildDepositTx(options: BuildDepositTxOptions): Promise<TxComplete> {
    const {
      sender,
      assetA,
      assetB,
      amountA,
      amountB,
      minimumLPReceived,
      availableUtxos,
    } = options;
    invariant(amountA > 0n && amountB > 0n, "amount must be positive");
    invariant(minimumLPReceived > 0n, "minimum LP received must be positive");
    const orderAssets = {
      [Asset.toString(assetA)]: amountA,
      [Asset.toString(assetB)]: amountB,
    };
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      availableUtxos,
      orderAssets
    );
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderDatum = {
      sender: sender,
      receiver: sender,
      receiverDatumHash: undefined,
      step: {
        type: OrderStepType.DEPOSIT,
        minimumLP: minimumLPReceived,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };
    return await this.lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        Data.to(OrderDatum.toPlutusData(datum)),
        orderAssets
      )
      .payToAddress(sender, reductionAssets)
      .addSigner(sender)
      .attachMetadata(674, { msg: [MetadataMessage.DEPOSIT_ORDER] })
      .complete();
  }

  async buildCancelOrder(
    options: BuildCancelOrderOptions
  ): Promise<TxComplete> {
    const { orderUtxo } = options;
    const redeemer = Data.to(new Constr(OrderRedeemer.CANCEL_ORDER, []));
    const rawDatum = orderUtxo.datum;
    invariant(
      rawDatum,
      `Cancel Order requires Order UTxOs along with its CBOR Datum`
    );
    const orderDatum = OrderDatum.fromPlutusData(
      this.networkId,
      Data.from(rawDatum) as Constr<Data>
    );
    return await this.lucid
      .newTx()
      .collectFrom([orderUtxo], redeemer)
      .addSigner(orderDatum.sender)
      .attachSpendingValidator(<SpendingValidator>orderScript)
      .attachMetadata(674, { msg: [MetadataMessage.CANCEL_ORDER] })
      .complete();
  }

  private calculateBatcherFee(
    utxos: UTxO[],
    orderAssets: Assets
  ): {
    batcherFee: bigint;
    reductionAssets: Assets;
  } {
    const [minAsset, adaMINLPAsset] =
      BATCHER_FEE_REDUCTION_SUPPORTED_ASSET[this.networkId];
    let amountMIN = 0n;
    let amountADAMINLP = 0n;
    for (const utxo of utxos) {
      if (utxo.assets[minAsset]) {
        amountMIN += utxo.assets[minAsset];
      }
      if (utxo.assets[adaMINLPAsset]) {
        amountADAMINLP += utxo.assets[adaMINLPAsset];
      }
    }
    if (orderAssets[minAsset]) {
      amountMIN -= orderAssets[minAsset];
    }
    if (orderAssets[adaMINLPAsset]) {
      amountADAMINLP -= orderAssets[adaMINLPAsset];
    }
    const reductionAssets: Assets = {};
    if (amountMIN > 0) {
      reductionAssets[minAsset] = amountMIN;
    }
    if (amountADAMINLP > 0) {
      reductionAssets[adaMINLPAsset] = amountADAMINLP;
    }
    return {
      batcherFee: getBatcherFee(this.network, amountMIN, amountADAMINLP),
      reductionAssets: reductionAssets,
    };
  }
}
