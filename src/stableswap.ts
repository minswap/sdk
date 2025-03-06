import invariant from "@minswap/tiny-invariant";
import { Addresses, Assets, Constr, Lucid, TxComplete } from "@spacebudz/lucid";
import { Utxo } from "@spacebudz/lucid";

import {
  DataObject,
  DataType,
  FIXED_DEPOSIT_ADA,
  MetadataMessage,
  StableOrder,
  StableswapConstant,
  V1AndStableswapCustomReceiver,
} from ".";
import { BATCHER_FEE_STABLESWAP, DexVersion } from "./batcher-fee/configs.internal";
import { Asset } from "./types/asset";
import { NetworkEnvironment, NetworkId } from "./types/network";
import { lucidToNetworkEnv } from "./utils/network.internal";
import { buildUtxoToStoreDatum } from "./utils/tx.internal";

/**
 * @property {bigint} assetInIndex - Index of asset you want to swap in config assets
 * @property {bigint} assetOutIndex - Index of asset you want to receive in config assets
 */
export type SwapOptions = {
  type: StableOrder.StepType.SWAP;
  assetInAmount: bigint;
  assetInIndex: bigint;
  assetOutIndex: bigint;
  minimumAssetOut: bigint;
};

export type DepositOptions = {
  type: StableOrder.StepType.DEPOSIT;
  assetsAmount: [Asset, bigint][];
  minimumLPReceived: bigint;
  totalLiquidity: bigint;
};

export type WithdrawOptions = {
  type: StableOrder.StepType.WITHDRAW;
  lpAmount: bigint;
  minimumAmounts: bigint[];
};

export type WithdrawImbalanceOptions = {
  type: StableOrder.StepType.WITHDRAW_IMBALANCE;
  lpAmount: bigint;
  withdrawAmounts: bigint[];
};

/**
 * @property {bigint} assetOutIndex - Index of asset you want to receive in config assets
 */
export type ZapOutOptions = {
  type: StableOrder.StepType.ZAP_OUT;
  lpAmount: bigint;
  assetOutIndex: bigint;
  minimumAssetOut: bigint;
};

export type OrderOptions = (
  | DepositOptions
  | WithdrawOptions
  | SwapOptions
  | WithdrawImbalanceOptions
  | ZapOutOptions
) & {
  lpAsset: Asset;
  customReceiver?: V1AndStableswapCustomReceiver;
};

export type BulkOrdersOption = {
  options: OrderOptions[];
  sender: string;
  availableUtxos: Utxo[];
};

export type BuildCancelOrderOptions = {
  orderUtxos: Utxo[];
};

export class Stableswap {
  private readonly lucid: Lucid;
  private readonly networkId: NetworkId;
  private readonly networkEnv: NetworkEnvironment;
  private readonly dexVersion = DexVersion.STABLESWAP;

  constructor(lucid: Lucid) {
    this.lucid = lucid;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
    this.networkEnv = lucidToNetworkEnv(lucid.network);
  }

  buildOrderValue(option: OrderOptions): Assets {
    const orderAssets: Assets = {};

    switch (option.type) {
      case StableOrder.StepType.DEPOSIT: {
        const { minimumLPReceived, assetsAmount, totalLiquidity } = option;
        invariant(
          minimumLPReceived > 0n,
          "minimum LP received must be non-negative"
        );
        let sumAmount = 0n;
        for (const [asset, amount] of assetsAmount) {
          if (totalLiquidity === 0n) {
            invariant(
              amount > 0n,
              "amount must be positive when total liquidity = 0"
            );
          } else {
            invariant(amount >= 0n, "amount must be non-negative");
          }
          if (amount > 0n) {
            orderAssets[Asset.toString(asset)] = amount;
          }
          sumAmount += amount;
        }
        invariant(sumAmount > 0n, "sum of amount must be positive");
        break;
      }
      case StableOrder.StepType.SWAP: {
        const { assetInAmount, assetInIndex, lpAsset } = option;
        const poolConfig = StableswapConstant.getConfigByLpAsset(
          lpAsset,
          this.networkId
        );
        invariant(assetInAmount > 0n, "asset in amount must be positive");
        orderAssets[poolConfig.assets[Number(assetInIndex)]] = assetInAmount;
        break;
      }
      case StableOrder.StepType.WITHDRAW:
      case StableOrder.StepType.WITHDRAW_IMBALANCE:
      case StableOrder.StepType.ZAP_OUT: {
        const { lpAmount, lpAsset } = option;
        invariant(lpAmount > 0n, "Lp amount must be positive number");
        orderAssets[Asset.toString(lpAsset)] = lpAmount;
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

  buildOrderStep(option: OrderOptions): StableOrder.Step {
    switch (option.type) {
      case StableOrder.StepType.DEPOSIT: {
        const { minimumLPReceived } = option;
        invariant(
          minimumLPReceived > 0n,
          "minimum LP received must be non-negative"
        );
        return {
          type: StableOrder.StepType.DEPOSIT,
          minimumLP: minimumLPReceived,
        };
      }
      case StableOrder.StepType.WITHDRAW: {
        const { minimumAmounts } = option;
        let sumAmount = 0n;
        for (const amount of minimumAmounts) {
          invariant(amount >= 0n, "minimum amount must be non-negative");
          sumAmount += amount;
        }
        invariant(sumAmount > 0n, "sum of withdaw amount must be positive");
        return {
          type: StableOrder.StepType.WITHDRAW,
          minimumAmounts: minimumAmounts,
        };
      }
      case StableOrder.StepType.SWAP: {
        const { lpAsset, assetInIndex, assetOutIndex, minimumAssetOut } =
          option;
        const poolConfig = StableswapConstant.getConfigByLpAsset(
          lpAsset,
          this.networkId
        );
        invariant(
          poolConfig,
          `Not found Stableswap config matching with LP Asset ${lpAsset.toString()}`
        );
        const assetLength = BigInt(poolConfig.assets.length);
        invariant(
          assetInIndex >= 0n && assetInIndex < assetLength,
          `Invalid amountInIndex, must be between 0-${assetLength - 1n}`
        );
        invariant(
          assetOutIndex >= 0n && assetOutIndex < assetLength,
          `Invalid assetOutIndex, must be between 0-${assetLength - 1n}`
        );
        invariant(
          assetInIndex !== assetOutIndex,
          `assetOutIndex and amountInIndex must be different`
        );
        invariant(
          minimumAssetOut > 0n,
          "minimum asset out amount must be positive"
        );
        return {
          type: StableOrder.StepType.SWAP,
          assetInIndex: assetInIndex,
          assetOutIndex: assetOutIndex,
          minimumAssetOut: minimumAssetOut,
        };
      }
      case StableOrder.StepType.WITHDRAW_IMBALANCE: {
        const { withdrawAmounts } = option;
        let sum = 0n;
        for (const amount of withdrawAmounts) {
          invariant(amount >= 0n, "withdraw amount must be unsigned number");
          sum += amount;
        }
        invariant(sum > 0n, "sum of withdraw amount must be positive");
        return {
          type: StableOrder.StepType.WITHDRAW_IMBALANCE,
          withdrawAmounts: withdrawAmounts,
        };
      }
      case StableOrder.StepType.ZAP_OUT: {
        const { assetOutIndex, minimumAssetOut, lpAsset } = option;
        const poolConfig = StableswapConstant.getConfigByLpAsset(
          lpAsset,
          this.networkId
        );
        invariant(
          poolConfig,
          `Not found Stableswap config matching with LP Asset ${lpAsset.toString()}`
        );
        const assetLength = BigInt(poolConfig.assets.length);
        invariant(
          minimumAssetOut > 0n,
          "Minimum amount out must be positive number"
        );
        invariant(
          assetOutIndex >= 0n && assetOutIndex < assetLength,
          `Invalid assetOutIndex, must be between 0-${assetLength - 1n}`
        );
        return {
          type: StableOrder.StepType.ZAP_OUT,
          assetOutIndex: assetOutIndex,
          minimumAssetOut: minimumAssetOut,
        };
      }
    }
  }

  private getOrderMetadata(options: OrderOptions): string {
    switch (options.type) {
      case StableOrder.StepType.SWAP: {
        return MetadataMessage.SWAP_EXACT_IN_ORDER;
      }
      case StableOrder.StepType.DEPOSIT: {
        let assetInputCnt = 0;
        for (const [_, amount] of options.assetsAmount) {
          if (amount > 0) {
            assetInputCnt++;
          }
        }
        if (assetInputCnt === 1) {
          return MetadataMessage.ZAP_IN_ORDER;
        } else {
          return MetadataMessage.DEPOSIT_ORDER;
        }
      }
      case StableOrder.StepType.WITHDRAW: {
        return MetadataMessage.WITHDRAW_ORDER;
      }
      case StableOrder.StepType.WITHDRAW_IMBALANCE: {
        return MetadataMessage.WITHDRAW_ORDER;
      }
      case StableOrder.StepType.ZAP_OUT: {
        return MetadataMessage.ZAP_OUT_ORDER;
      }
    }
  }

  async createBulkOrdersTx(options: BulkOrdersOption): Promise<TxComplete> {
    const { sender, options: orderOptions } = options;

    invariant(
      orderOptions.length > 0,
      "Stableswap.buildCreateTx: Need at least 1 order to build"
    );
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
    const tx = this.lucid.newTx();
    for (const orderOption of orderOptions) {
      const config = StableswapConstant.getConfigByLpAsset(
        orderOption.lpAsset,
        this.networkId
      );
      const { customReceiver, type } = orderOption;
      const orderAssets = this.buildOrderValue(orderOption);
      const step = this.buildOrderStep(orderOption);
      const batcherFee = BATCHER_FEE_STABLESWAP[type];
      if ("lovelace" in orderAssets) {
        orderAssets["lovelace"] += batcherFee;
      } else {
        orderAssets["lovelace"] = batcherFee;
      }
      const datum: StableOrder.Datum = {
        sender: sender,
        receiver: customReceiver ? customReceiver.receiver : sender,
        receiverDatumHash: customReceiver?.receiverDatum?.hash,
        step: step,
        batcherFee: batcherFee,
        depositADA: FIXED_DEPOSIT_ADA,
      };
      tx.payToContract(
        config.orderAddress,
        {
          Inline: DataObject.to(StableOrder.Datum.toPlutusData(datum)),
        },
        orderAssets
      );

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
    }
    tx.attachMetadata(674, {
      msg: [
        orderOptions.length > 1
          ? MetadataMessage.MIXED_ORDERS
          : this.getOrderMetadata(orderOptions[0]),
      ],
    });
    return await tx.commit();
  }

  async buildCancelOrdersTx(
    options: BuildCancelOrderOptions
  ): Promise<TxComplete> {
    const tx = this.lucid.newTx();

    const redeemer = DataObject.to(
      new Constr(StableOrder.Redeemer.CANCEL_ORDER, [])
    );
    for (const utxo of options.orderUtxos) {
      const config = StableswapConstant.getConfigFromStableswapOrderAddress(
        utxo.address,
        this.networkId
      );
      const referencesScript = StableswapConstant.getStableswapReferencesScript(
        Asset.fromString(config.nftAsset),
        this.networkId
      );
      let datum: StableOrder.Datum;
      if (utxo.datum) {
        const rawDatum = utxo.datum;
        datum = StableOrder.Datum.fromPlutusData(
          this.networkId,
          DataObject.from(rawDatum)
        );
      } else if (utxo.datumHash) {
        const rawDatum = await this.lucid.datumOf(utxo);
        datum = StableOrder.Datum.fromPlutusData(
          this.networkId,
          rawDatum as Constr<DataType>
        );
      } else {
        throw new Error(
          "Utxo without Datum Hash or Inline Datum can not be spent"
        );
      }

      const orderRefs = await this.lucid.utxosByOutRef([
        referencesScript.order,
      ]);
      invariant(
        orderRefs.length === 1,
        "cannot find deployed script for V2 Order"
      );

      const orderRef = orderRefs[0];
      tx.readFrom([orderRef])
        .collectFrom([utxo], redeemer)
        .addSigner(Addresses.addressToCredential(datum.sender).hash);
    }
    tx.attachMetadata(674, { msg: [MetadataMessage.CANCEL_ORDER] });
    return await tx.commit();
  }
}
