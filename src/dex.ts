import {
  Assets,
  Blockfrost,
  Constr,
  Data,
  Lucid,
  Network,
  SpendingValidator,
  TxComplete,
  UTxO,
} from "lucid-cardano";

import { BlockfrostAdapter } from "./adapter";
import { Address, BlockfrostUtxo, NetworkId, OrderRedeemer } from "./types";
import {
  MetadataMessage,
  ORDER_BASE_ADDRESS,
  orderScript,
  FIXED_DEPOSIT_ADA,
  BATCHER_FEE_REDUCTION_SUPPORTED_ASSET,
} from "./constants";
import { getBatcherFee } from "./batcher-fee-reduction/configs";
import invariant from "@minswap/tiny-invariant";
import { OrderDatum, OrderStepType } from "./order";

/**
 * Options for building cancel Order
 * @orderTxId Transaction ID which order is created
 * @sender The owner of this order. The @sender must be matched with data in Order's Datum
 */
export type BuildCancelOrderOptions = {
  orderTxId: string;
  sender: Address;
};

/**
 * Options for building Deposit Order
 * @sender The owner of this order, it will be used for cancelling this order
 * @assetA @assetB Define pair which you want to deposit to
 * @amountA @amountB Define amount which you want to deposit to
 * @minimumLPReceived Minimum Received Amount you can accept after order is executed
 */
export type BuildDepositTxOptions = {
  sender: Address;
  assetA: string;
  assetB: string;
  amountA: bigint;
  amountB: bigint;
  minimumLPReceived: bigint;
};

/**
 * Options for building Zap In Order
 * @sender The owner of this order, it will be used for cancelling this order
 * @assetIn Asset you want to Zap
 * @assetOut The remaining asset of Pool which you want to Zap.
 *      For eg, in Pool ADA-MIN, if @assetIn is ADA then @assetOut will be MIN and vice versa
 * @minimumLPReceived Minimum Received Amount you can accept after order is executed
 */
export type BuildZapInTxOptions = {
  sender: Address;
  assetIn: string;
  amountIn: bigint;
  assetOut: string;
  minimumLPReceived: bigint;
};

/**
 * Options for building Withdrawal Order
 * @sender The owner of this order, it will be used for cancelling this order
 * @lpAsset LP Asset will be withdrawed
 * @lpAmount LP Asset amount will be withdrawed
 * @minimumAssetAReceived Minimum Received of Asset A in the Pool you can accept after order is executed
 * @minimumAssetBReceived Minimum Received of Asset A in the Pool you can accept after order is executed
 */
export type BuildWithdrawTxOptions = {
  sender: Address;
  lpAsset: string;
  lpAmount: bigint;
  minimumAssetAReceived: bigint;
  minimumAssetBReceived: bigint;
};

/**
 * Options for building Swap Exact Out Order
 * @sender The owner of this order, it will be used for cancelling this order
 * @assetIn Asset you want to Swap
 * @assetOut Asset you want to receive
 * @maximumAmountIn The maximum Amount of Asset In which will be spent after order is executed
 * @expectedAmountOut The expected Amount of Asset Out you want to receive after order is executed
 */
export type BuildSwapExactOutTxOptions = {
  sender: Address;
  assetIn: string;
  assetOut: string;
  maximumAmountIn: bigint;
  expectedAmountOut: bigint;
};

/**
 * Options for building Swap Exact In Order
 * @sender The owner of this order, it will be used for cancelling this order
 * @assetIn Asset and its amount you want to Swap
 * @amountIn Amount of Asset In you want to Swap
 * @assetOut Asset and you want to receive
 * @minimumAmountOut The minimum Amount of Asset Out you can accept after order is executed
 * @isLimitOrder Define this order is Limit Order or not
 */
export type BuildSwapExactInTxOptions = {
  sender: Address;
  assetIn: string;
  amountIn: bigint;
  assetOut: string;
  minimumAmountOut: bigint;
  isLimitOrder: boolean;
};

export function blockfrostUtxosToUtxos(u: BlockfrostUtxo): UTxO {
  return {
    txHash: u.tx_hash,
    outputIndex: u.output_index,
    assets: (() => {
      const a: Assets = {};
      u.amount.forEach((am) => {
        a[am.unit] = BigInt(am.quantity);
      });
      return a;
    })(),
    address: u.address,
    datumHash: !u.inline_datum ? u.data_hash : undefined,
    datum: u.inline_datum,
    scriptRef: undefined, // TODO: not support yet
  };
}

export class Dex {
  private lucid: Lucid | undefined;
  private readonly projectId: string;
  private readonly network: Network;
  private readonly networkId: NetworkId;
  private readonly blockfrostUrl: string;
  private readonly blockfrostAdapter: BlockfrostAdapter;

  constructor(projectId: string, network: Network, blockfrostUrl: string) {
    this.projectId = projectId;
    this.network = network;
    this.blockfrostUrl = blockfrostUrl;
    this.networkId =
      network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
    this.blockfrostAdapter = new BlockfrostAdapter({
      projectId,
      networkId: this.networkId,
    });
  }

  async getLucidInstance(): Promise<Lucid> {
    if (!this.lucid) {
      const provider: Blockfrost = new Blockfrost(
        this.blockfrostUrl,
        this.projectId
      );
      this.lucid = await Lucid.new(provider, this.network);
    }
    return this.lucid;
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
    } = options;
    invariant(amountIn > 0n, "amount in must be positive");
    invariant(minimumAmountOut > 0n, "minimum amount out must be positive");
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const orderAssets: Assets = { [assetIn]: amountIn };
    const utxos = await lucid.utxosAt(sender);
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      utxos,
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
    const tx = lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        OrderDatum.toCborHex(datum),
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
    const { sender, assetIn, assetOut, maximumAmountIn, expectedAmountOut } =
      options;
    invariant(
      maximumAmountIn > 0n && expectedAmountOut > 0n,
      "amount in and out must be positive"
    );
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const orderAssets: Assets = { [assetIn]: maximumAmountIn };
    const utxos = await lucid.utxosAt(sender);
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      utxos,
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

    return await lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        OrderDatum.toCborHex(datum),
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
    } = options;
    invariant(lpAmount > 0n, "LP amount must be positive");
    invariant(
      minimumAssetAReceived > 0n && minimumAssetBReceived > 0n,
      "minimum asset received must be positive"
    );
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const orderAssets: Assets = { [lpAsset]: lpAmount };
    const utxos = await lucid.utxosAt(sender);
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      utxos,
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
    return await lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        OrderDatum.toCborHex(datum),
        orderAssets
      )
      .payToAddress(sender, reductionAssets)
      .addSigner(sender)
      .attachMetadata(674, { msg: [MetadataMessage.WITHDRAW_ORDER] })
      .complete();
  }

  async buildZapInTx(options: BuildZapInTxOptions): Promise<TxComplete> {
    const { sender, assetIn, amountIn, assetOut, minimumLPReceived } = options;
    invariant(amountIn > 0n, "amount in must be positive");
    invariant(minimumLPReceived > 0n, "minimum LP received must be positive");
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const orderAssets: Assets = { [assetIn]: amountIn };
    const utxos = await lucid.utxosAt(sender);
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      utxos,
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

    return await lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        OrderDatum.toCborHex(datum),
        orderAssets
      )
      .payToAddress(sender, reductionAssets)
      .addSigner(sender)
      .attachMetadata(674, { msg: [MetadataMessage.ZAP_IN_ORDER] })
      .complete();
  }

  async buildDepositTx(options: BuildDepositTxOptions): Promise<TxComplete> {
    const { sender, assetA, assetB, amountA, amountB, minimumLPReceived } =
      options;
    invariant(amountA > 0n && amountB > 0n, "amount must be positive");
    invariant(minimumLPReceived > 0n, "minimum LP received must be positive");
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const orderAssets = {
      [assetA]: amountA,
      [assetB]: amountB,
    };
    const utxos = await lucid.utxosAt(sender);
    const { batcherFee, reductionAssets } = this.calculateBatcherFee(
      utxos,
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
    return await lucid
      .newTx()
      .payToContract(
        ORDER_BASE_ADDRESS[this.networkId],
        OrderDatum.toCborHex(datum),
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
    const { orderTxId, sender } = options;
    const orderUTxO = blockfrostUtxosToUtxos(
      await this.blockfrostAdapter.getOrderUTxOByTxId(orderTxId)
    );
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const redeemer = Data.to(new Constr(OrderRedeemer.CANCEL_ORDER, []));
    return await lucid
      .newTx()
      .collectFrom([orderUTxO], redeemer)
      .addSigner(sender)
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
