import { Assets, Blockfrost, Constr, Data, Lucid, Network, SpendingValidator, UTxO } from "lucid-cardano";

import { BlockfrostAdapter } from "./adapter";
import { Address, Asset, BlockfrostUtxo, NetworkId, OrderRedeemer } from "./types";
import { BATCHER_FEE, MetadataMessage, orderScript, OUTPUT_ADA, STAKE_ORDER_ADDRESS, StepType } from "./constants";
import invariant from "@minswap/tiny-invariant";
import { AddressPlutusData } from "./plutus";

export type BuildCancelOrderOptions = {
  orderId: string;
  sender: Address;
}

export type BuildDepositTxOptions = {
  sender: Address;
  assets: Assets,
  minimumLPReceived: bigint;
};

export type BuildOneSideDepositTxOptions = {
  sender: Address;
  assetIn: Asset;
  desiredAsset: Asset;
  minimumLPReceived: bigint;
}

export type BuildWithdrawTxOptions = {
  sender: Address;
  lpAsset: Asset;
  minimumAssetAReceived: bigint;
  minimumAssetBReceived: bigint;
}

export type BuildSwapExactOutTxOptions = {
  sender: Address;
  assetIn: string;
  maximumAmountIn: bigint;
  assetOut: Asset;
}

export type BuildSwapExactInTxOptions = {
  sender: Address;
  assetIn: Asset;
  assetOut: string;
  minimumAmountOut: bigint;
  isLimitOrder: boolean;
}

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
    this.networkId = network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
    this.blockfrostAdapter = new BlockfrostAdapter({ projectId, networkId: this.networkId });
  }

  async getLucidInstance(): Promise<Lucid> {
    if (!this.lucid) {
      const provider: Blockfrost = new Blockfrost(this.blockfrostUrl, this.projectId);
      this.lucid = await Lucid.new(provider, this.network);
    }
    return this.lucid;
  }

  async buildSwapExactInTx(options: BuildSwapExactInTxOptions): Promise<string> {
    const { sender, assetIn, assetOut, minimumAmountOut, isLimitOrder } = options;
    invariant(assetIn.quantity > 0n, "amount in must be positive");
    invariant(minimumAmountOut >= 0n, "minimum amount out must be non-negative");
    const orderAssets: Assets = { [assetIn.unit]: assetIn.quantity };
    orderAssets["lovelace"] = (orderAssets["lovelace"] || 0n) + OUTPUT_ADA + BATCHER_FEE;
    const datum = new Constr(0, [
      AddressPlutusData.toPlutusData(sender),
      AddressPlutusData.toPlutusData(sender),
      new Constr(1, []),
      new Constr(StepType.SWAP_EXACT_IN, [
        new Constr(0, [
          assetOut.slice(0, 56),
          assetOut.slice(56),
        ]),
        minimumAmountOut,
      ]),
      BATCHER_FEE,
      OUTPUT_ADA,
    ]);
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const tx = await lucid
      .newTx()
      .payToContract(
        STAKE_ORDER_ADDRESS[this.networkId],
        Data.to(datum),
        orderAssets,
      );
    if (isLimitOrder) {
      tx.attachMetadata(674, { msg: [MetadataMessage.SWAP_EXACT_IN_LIMIT_ORDER] });
    } else {
      tx.attachMetadata(674, { msg: [MetadataMessage.SWAP_EXACT_IN_ORDER] });
    }
    const completedTx = await tx.complete();
    return completedTx.toString();
  }

  async buildSwapExactOutTx(options: BuildSwapExactOutTxOptions): Promise<string> {
    const { sender, assetIn, assetOut, maximumAmountIn } = options;
    invariant(maximumAmountIn > 0n && assetOut.quantity > 0n, "amount in and out must be positive");
    const orderAssets: Assets = { [assetIn]: maximumAmountIn };
    orderAssets["lovelace"] = (orderAssets["lovelace"] || 0n) + OUTPUT_ADA + BATCHER_FEE;
    const datum = new Constr(0, [
      AddressPlutusData.toPlutusData(sender),
      AddressPlutusData.toPlutusData(sender),
      new Constr(1, []),
      new Constr(StepType.SWAP_EXACT_OUT, [
        new Constr(0, [
          assetOut.unit.slice(0, 56),
          assetOut.unit.slice(56),
        ]),
        assetOut.quantity,
      ]),
      BATCHER_FEE,
      OUTPUT_ADA,
    ]);
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const tx = await lucid
      .newTx()
      .payToContract(
        STAKE_ORDER_ADDRESS[this.networkId],
        Data.to(datum),
        orderAssets,
      )
      .attachMetadata(674, { msg: [MetadataMessage.SWAP_EXACT_OUT_ORDER] })
      .complete();
    return tx.toString();
  }

  async buildWithdrawTx(options: BuildWithdrawTxOptions): Promise<string> {
    const { sender, lpAsset, minimumAssetAReceived, minimumAssetBReceived } = options;
    invariant(lpAsset.quantity > 0n, "LP amount must be positive");
    invariant(minimumAssetAReceived >= 0n && minimumAssetBReceived >= 0n, "minimum asset received must be non-negative");
    const orderAssets: Assets = { [lpAsset.unit]: lpAsset.quantity };
    orderAssets["lovelace"] = (orderAssets["lovelace"] || 0n) + OUTPUT_ADA + BATCHER_FEE;
    const datum = new Constr(0, [
      AddressPlutusData.toPlutusData(sender),
      AddressPlutusData.toPlutusData(sender),
      new Constr(1, []),
      new Constr(StepType.WITHDRAW, [
        minimumAssetAReceived,
        minimumAssetBReceived,
      ]),
      BATCHER_FEE,
      OUTPUT_ADA,
    ]);
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const tx = await lucid
      .newTx()
      .payToContract(
        STAKE_ORDER_ADDRESS[this.networkId],
        Data.to(datum),
        orderAssets,
      )
      .attachMetadata(674, { msg: [MetadataMessage.WITHDRAW_ORDER] })
      .complete();
    return tx.toString();
  }

  async buildOneSideDepositTx(options: BuildOneSideDepositTxOptions): Promise<string> {
    const { sender, assetIn, desiredAsset, minimumLPReceived } = options;
    invariant(assetIn.quantity > 0n, "amount in must be positive");
    invariant(minimumLPReceived >= 0n, "minimum LP received must be non-negative");
    const orderAssets: Assets = { [assetIn.unit]: assetIn.quantity };
    orderAssets["lovelace"] = (orderAssets["lovelace"] || 0n) + OUTPUT_ADA + BATCHER_FEE;
    const datum = new Constr(0, [
      AddressPlutusData.toPlutusData(sender),
      AddressPlutusData.toPlutusData(sender),
      new Constr(1, []),
      new Constr(StepType.ONE_SIDE_DEPOSIT, [
        new Constr(0, [
          desiredAsset.unit.slice(0, 56),
          desiredAsset.unit.slice(56),
        ]),
        minimumLPReceived,
      ]),
      BATCHER_FEE,
      OUTPUT_ADA,
    ]);
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const tx = await lucid
      .newTx()
      .payToContract(
        STAKE_ORDER_ADDRESS[this.networkId],
        Data.to(datum),
        orderAssets,
      )
      .attachMetadata(674, { msg: [MetadataMessage.ONE_SIDE_DEPOSIT_ORDER] })
      .complete();
    return tx.toString();
  }

  async buildDepositTx({ sender, assets, minimumLPReceived }: BuildDepositTxOptions): Promise<string> {
    const [amountA, amountB] = Object.values(assets);
    invariant(amountA > 0n && amountB > 0n, "amount must be positive");
    invariant(minimumLPReceived >= 0n, "minimum LP received must be non-negative");

    const orderAssets = { ...assets };
    orderAssets["lovelace"] = (assets["lovelace"] || 0n) + OUTPUT_ADA + BATCHER_FEE;
    const datum = new Constr(0, [
      AddressPlutusData.toPlutusData(sender),
      AddressPlutusData.toPlutusData(sender),
      new Constr(1, []),
      new Constr(StepType.DEPOSIT, [minimumLPReceived]),
      BATCHER_FEE,
      OUTPUT_ADA,
    ]);
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const tx = await lucid
      .newTx()
      .payToContract(
        STAKE_ORDER_ADDRESS[this.networkId],
        Data.to(datum),
        orderAssets,
      )
      .attachMetadata(674, { msg: [MetadataMessage.DEPOSIT_ORDER] })
      .complete();
    return tx.toString();
  }

  async buildCancelOrder({ orderId, sender }: BuildCancelOrderOptions): Promise<string> {
    const orderUTxO = blockfrostUtxosToUtxos(await this.blockfrostAdapter.getOrderUTxO(orderId));
    const lucid = await this.getLucidInstance();
    lucid.selectWalletFrom({ address: sender });
    const redeemer = Data.to(new Constr(OrderRedeemer.CANCEL_ORDER, []));
    const tx = await lucid
      .newTx()
      .collectFrom([orderUTxO], redeemer)
      .addSigner(sender)
      .attachSpendingValidator(<SpendingValidator>orderScript)
      .attachMetadata(674, { msg: [MetadataMessage.CANCEL_ORDER] })
      .complete();
    return tx.toString();
  }
}

