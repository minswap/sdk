import invariant from "@minswap/tiny-invariant";
import { Addresses, Assets, Constr, Lucid, TxComplete } from "@spacebudz/lucid";
import { Utxo } from "@spacebudz/lucid";

import { DataObject, DataType } from ".";
import { BATCHER_FEE_DEX_V1, DexVersion } from "./batcher-fee/configs.internal";
import { Asset } from "./types/asset";
import {
  DexV1Constant,
  FIXED_DEPOSIT_ADA,
  MetadataMessage,
} from "./types/constants";
import { NetworkEnvironment, NetworkId } from "./types/network";
import { OrderV1 } from "./types/order";
import { lucidToNetworkEnv } from "./utils/network.internal";
import { buildUtxoToStoreDatum } from "./utils/tx.internal";

export type V1AndStableswapCustomReceiver = {
  receiver: string;
  receiverDatum?: {
    hash: string;
    datum: string;
  };
};

/**
 * Common options for build Minswap transaction
 * @sender The owner of this order, it will be used for cancelling this order
 * @availableUtxos Available UTxOs can be used in transaction
 */
type CommonOptions = {
  sender: string;
  availableUtxos: Utxo[];
};

/**
 * Options for building cancel Order
 * @orderTxId Transaction ID which order is created
 * @sender The owner of this order. The @sender must be matched with data in Order's Datum
 */
export type BuildCancelOrderOptions = {
  orderUtxo: Utxo;
  sender: string;
};

/**
 * Options for building Deposit Order
 * @assetA @assetB Define pair which you want to deposit to
 * @amountA @amountB Define amount which you want to deposit to
 * @minimumLPReceived Minimum Received Amount you can accept after order is executed
 */
export type BuildDepositTxOptions = CommonOptions & {
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
  sender: string;
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
  customReceiver?: V1AndStableswapCustomReceiver;
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
  customReceiver?: V1AndStableswapCustomReceiver;
  assetIn: Asset;
  amountIn: bigint;
  assetOut: Asset;
  minimumAmountOut: bigint;
  isLimitOrder: boolean;
};

export class Dex {
  private readonly lucid: Lucid;
  private readonly networkId: NetworkId;
  private readonly networkEnv: NetworkEnvironment;
  private readonly dexVersion = DexVersion.DEX_V1;

  constructor(lucid: Lucid) {
    this.lucid = lucid;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
    this.networkEnv = lucidToNetworkEnv(lucid.network);
  }

  async buildSwapExactInTx(
    options: BuildSwapExactInTxOptions
  ): Promise<TxComplete> {
    const {
      sender,
      customReceiver,
      assetIn,
      amountIn,
      assetOut,
      minimumAmountOut,
      isLimitOrder,
    } = options;
    invariant(amountIn > 0n, "amount in must be positive");
    invariant(minimumAmountOut > 0n, "minimum amount out must be positive");
    const orderAssets: Assets = { [Asset.toString(assetIn)]: amountIn };
    const batcherFee = BATCHER_FEE_DEX_V1[OrderV1.StepType.SWAP_EXACT_IN]
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    } else {
      orderAssets["lovelace"] = FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderV1.Datum = {
      sender: sender,
      receiver: customReceiver ? customReceiver.receiver : sender,
      receiverDatumHash: customReceiver?.receiverDatum?.hash,
      step: {
        type: OrderV1.StepType.SWAP_EXACT_IN,
        desiredAsset: assetOut,
        minimumReceived: minimumAmountOut,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };
    const tx = this.lucid
      .newTx()
      .payToContract(
        DexV1Constant.ORDER_BASE_ADDRESS[this.networkId],
        DataObject.to(OrderV1.Datum.toPlutusData(datum)),
        orderAssets
      )
      .addSigner(Addresses.addressToCredential(sender).hash);
    if (isLimitOrder) {
      tx.attachMetadata(674, {
        msg: [MetadataMessage.SWAP_EXACT_IN_LIMIT_ORDER],
      });
    } else {
      tx.attachMetadata(674, { msg: [MetadataMessage.SWAP_EXACT_IN_ORDER] });
    }
    if (customReceiver && customReceiver.receiverDatum) {
      const utxoForStoringDatum = buildUtxoToStoreDatum(
        sender,
        customReceiver.receiver,
        customReceiver.receiverDatum.datum
      );
      if (utxoForStoringDatum) {
        tx.payToWithData(
          utxoForStoringDatum.address,
          utxoForStoringDatum.outputData,
          utxoForStoringDatum.assets
        );
      }
    }
    return await tx.commit();
  }

  async buildSwapExactOutTx(
    options: BuildSwapExactOutTxOptions
  ): Promise<TxComplete> {
    const {
      sender,
      customReceiver,
      assetIn,
      assetOut,
      maximumAmountIn,
      expectedAmountOut,
    } = options;
    invariant(
      maximumAmountIn > 0n && expectedAmountOut > 0n,
      "amount in and out must be positive"
    );
    const orderAssets: Assets = { [Asset.toString(assetIn)]: maximumAmountIn };
    const batcherFee = BATCHER_FEE_DEX_V1[OrderV1.StepType.SWAP_EXACT_OUT]
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    } else {
      orderAssets["lovelace"] = FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderV1.Datum = {
      sender: sender,
      receiver: customReceiver ? customReceiver.receiver : sender,
      receiverDatumHash: customReceiver?.receiverDatum?.hash,
      step: {
        type: OrderV1.StepType.SWAP_EXACT_OUT,
        desiredAsset: assetOut,
        expectedReceived: expectedAmountOut,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };

    const tx = this.lucid
      .newTx()
      .payToContract(
        DexV1Constant.ORDER_BASE_ADDRESS[this.networkId],
        DataObject.to(OrderV1.Datum.toPlutusData(datum)),
        orderAssets
      )
      .addSigner(Addresses.addressToCredential(sender).hash)
      .attachMetadata(674, { msg: [MetadataMessage.SWAP_EXACT_OUT_ORDER] });

    if (customReceiver && customReceiver.receiverDatum) {
      const utxoForStoringDatum = buildUtxoToStoreDatum(
        sender,
        customReceiver.receiver,
        customReceiver.receiverDatum.datum
      );
      if (utxoForStoringDatum) {
        tx.payToWithData(
          utxoForStoringDatum.address,
          utxoForStoringDatum.outputData,
          utxoForStoringDatum.assets
        );
      }
    }

    return await tx.commit();
  }

  async buildWithdrawTx(options: BuildWithdrawTxOptions): Promise<TxComplete> {
    const {
      sender,
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
    const orderAssets: Assets = { [Asset.toString(lpAsset)]: lpAmount };
    const batcherFee = BATCHER_FEE_DEX_V1[OrderV1.StepType.WITHDRAW]
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    } else {
      orderAssets["lovelace"] = FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderV1.Datum = {
      sender: sender,
      receiver: sender,
      receiverDatumHash: undefined,
      step: {
        type: OrderV1.StepType.WITHDRAW,
        minimumAssetA: minimumAssetAReceived,
        minimumAssetB: minimumAssetBReceived,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };
    return await this.lucid
      .newTx()
      .payToContract(
        DexV1Constant.ORDER_BASE_ADDRESS[this.networkId],
        DataObject.to(OrderV1.Datum.toPlutusData(datum)),
        orderAssets
      )
      .addSigner(Addresses.addressToCredential(sender).hash)
      .attachMetadata(674, { msg: [MetadataMessage.WITHDRAW_ORDER] })
      .commit();
  }

  async buildZapInTx(options: BuildZapInTxOptions): Promise<TxComplete> {
    const {
      sender,
      assetIn,
      amountIn,
      assetOut,
      minimumLPReceived,
    } = options;
    invariant(amountIn > 0n, "amount in must be positive");
    invariant(minimumLPReceived > 0n, "minimum LP received must be positive");
    const orderAssets: Assets = { [Asset.toString(assetIn)]: amountIn };
    const batcherFee = BATCHER_FEE_DEX_V1[OrderV1.StepType.ZAP_IN];
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    } else {
      orderAssets["lovelace"] = FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderV1.Datum = {
      sender: sender,
      receiver: sender,
      receiverDatumHash: undefined,
      step: {
        type: OrderV1.StepType.ZAP_IN,
        desiredAsset: assetOut,
        minimumLP: minimumLPReceived,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };

    return await this.lucid
      .newTx()
      .payToContract(
        DexV1Constant.ORDER_BASE_ADDRESS[this.networkId],
        DataObject.to(OrderV1.Datum.toPlutusData(datum)),
        orderAssets
      )
      .addSigner(Addresses.addressToCredential(sender).hash)
      .attachMetadata(674, { msg: [MetadataMessage.ZAP_IN_ORDER] })
      .commit();
  }

  async buildDepositTx(options: BuildDepositTxOptions): Promise<TxComplete> {
    const {
      sender,
      assetA,
      assetB,
      amountA,
      amountB,
      minimumLPReceived,
    } = options;
    invariant(amountA > 0n && amountB > 0n, "amount must be positive");
    invariant(minimumLPReceived > 0n, "minimum LP received must be positive");
    const orderAssets = {
      [Asset.toString(assetA)]: amountA,
      [Asset.toString(assetB)]: amountB,
    };
    const batcherFee = BATCHER_FEE_DEX_V1[OrderV1.StepType.DEPOSIT];
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    } else {
      orderAssets["lovelace"] = FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: OrderV1.Datum = {
      sender: sender,
      receiver: sender,
      receiverDatumHash: undefined,
      step: {
        type: OrderV1.StepType.DEPOSIT,
        minimumLP: minimumLPReceived,
      },
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };
    return await this.lucid
      .newTx()
      .payToContract(
        DexV1Constant.ORDER_BASE_ADDRESS[this.networkId],
        DataObject.to(OrderV1.Datum.toPlutusData(datum)),
        orderAssets
      )
      .addSigner(Addresses.addressToCredential(sender).hash)
      .attachMetadata(674, { msg: [MetadataMessage.DEPOSIT_ORDER] })
      .commit();
  }

  async buildCancelOrder(
    options: BuildCancelOrderOptions
  ): Promise<TxComplete> {
    const { orderUtxo } = options;
    const redeemer = DataObject.to(
      new Constr(OrderV1.Redeemer.CANCEL_ORDER, [])
    );
    const rawDatum = orderUtxo.datum;
    invariant(
      rawDatum,
      `Cancel Order requires Order UTxOs along with its CBOR Datum`
    );
    const orderDatum = OrderV1.Datum.fromPlutusData(
      this.networkId,
      DataObject.from(rawDatum) as Constr<DataType>
    );
    return await this.lucid
      .newTx()
      .collectFrom([orderUtxo], redeemer)
      .addSigner(Addresses.addressToCredential(orderDatum.sender).hash)
      .attachScript(DexV1Constant.ORDER_SCRIPT)
      .attachMetadata(674, { msg: [MetadataMessage.CANCEL_ORDER] })
      .commit();
  }
}
