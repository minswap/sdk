import {
  Address,
  Assets,
  Lucid,
  TxComplete,
  UTxO,
  Data,
  Constr,
} from "lucid-cardano";
import { NetworkEnvironment, NetworkId } from "./types/network";

import { Asset } from "./types/asset";
import {
  BlockfrostAdapter,
  FIXED_DEPOSIT_ADA,
  MetadataMessage,
  StableOrder,
  StableswapConstant,
} from ".";
import { DexVersion } from "./batcher-fee-reduction/types.internal";
import { lucidToNetworkEnv } from "./utils/network.internal";
import invariant from "@minswap/tiny-invariant";
import { calculateBatcherFee } from "./batcher-fee-reduction/calculate";

export type CommonOrderOptions = {
  sender: Address;
  availableUtxos: UTxO[];
  lpAsset: Asset;
};

export type SwapOptions = CommonOrderOptions & {
  type: StableOrder.StepType.SWAP;
  assetIn: Asset;
  assetInAmount: bigint;
  assetInIndex: bigint;
  assetOutIndex: bigint;
  minimumAssetOut: bigint;
};

export type DepositOptions = CommonOrderOptions & {
  type: StableOrder.StepType.DEPOSIT;
  assetsAmount: [Asset, bigint][];
  minimumLPReceived: bigint;
  totalLiquidity: bigint;
};

export type WithdrawOptions = CommonOrderOptions & {
  type: StableOrder.StepType.WITHDRAW;
  lpAmount: bigint;
  minimumAmounts: bigint[];
};

export type WithdrawImbalanceOptions = CommonOrderOptions & {
  type: StableOrder.StepType.WITHDRAW_IMBALANCE;
  lpAmount: bigint;
  withdrawAmounts: bigint[];
};

export type ZapOutOptions = CommonOrderOptions & {
  type: StableOrder.StepType.ZAP_OUT;
  lpAmount: bigint;
  assetOutIndex: bigint;
  minimumAssetOut: bigint;
};

export type OrderOptions =
  | DepositOptions
  | WithdrawOptions
  | SwapOptions
  | WithdrawImbalanceOptions
  | ZapOutOptions;

export type BuildCancelOrderOptions = {
  orderUtxos: UTxO[];
};

export class Stableswap {
  private readonly lucid: Lucid;
  private readonly networkId: NetworkId;
  private readonly adapter: BlockfrostAdapter;
  private readonly networkEnv: NetworkEnvironment;
  private readonly dexVersion = DexVersion.STABLESWAP;

  constructor(lucid: Lucid, adapter: BlockfrostAdapter) {
    this.lucid = lucid;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
    this.adapter = adapter;
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
        const { assetInAmount, assetIn } = option;
        invariant(assetInAmount > 0n, "asset in amount must be positive");
        orderAssets[Asset.toString(assetIn)] = assetInAmount;
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

  async buildCreateTx(options: OrderOptions): Promise<TxComplete> {
    const { sender, availableUtxos, lpAsset } = options;
    const config = StableswapConstant.getConfigByLpAsset(
      lpAsset,
      this.networkId
    );
    const orderAssets = this.buildOrderValue(options);
    const step = this.buildOrderStep(options);
    const { batcherFee, reductionAssets } = calculateBatcherFee({
      utxos: availableUtxos,
      orderAssets,
      networkEnv: this.networkEnv,
      dexVersion: this.dexVersion,
    });
    if (orderAssets["lovelace"]) {
      orderAssets["lovelace"] += FIXED_DEPOSIT_ADA + batcherFee;
    } else {
      orderAssets["lovelace"] = FIXED_DEPOSIT_ADA + batcherFee;
    }
    const datum: StableOrder.Datum = {
      sender: sender,
      receiver: sender,
      receiverDatumHash: undefined,
      step: step,
      batcherFee: batcherFee,
      depositADA: FIXED_DEPOSIT_ADA,
    };
    const tx = this.lucid
      .newTx()
      .payToContract(
        config.orderAddress,
        {
          inline: Data.to(StableOrder.Datum.toPlutusData(datum)),
        },
        orderAssets
      )
      .payToAddress(sender, reductionAssets)
      .addSigner(sender)
      .attachMetadata(674, { msg: [this.getOrderMetadata(options)] });
    return await tx.complete();
  }

  async buildCancelOrdersTx(
    options: BuildCancelOrderOptions
  ): Promise<TxComplete> {
    const tx = this.lucid.newTx();

    const redeemer = Data.to(new Constr(StableOrder.Redeemer.CANCEL_ORDER, []));
    for (const utxo of options.orderUtxos) {
      const config = StableswapConstant.getConfigFromStableswapOrderAddress(
        utxo.address,
        this.networkId
      );
      const referencesScript = StableswapConstant.getStableswapReferencesScript(
        Asset.fromString(config.lpAsset),
        this.networkId
      );
      let datum: StableOrder.Datum;
      if (utxo.datum) {
        const rawDatum = utxo.datum;
        datum = StableOrder.Datum.fromPlutusData(
          this.networkId,
          Data.from(rawDatum)
        );
      } else if (utxo.datumHash) {
        const rawDatum = await this.lucid.datumOf(utxo);
        datum = StableOrder.Datum.fromPlutusData(
          this.networkId,
          rawDatum as Constr<Data>
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
        .addSigner(datum.sender)
        .attachMetadata(674, { msg: [MetadataMessage.CANCEL_ORDER] });
    }
    return await tx.complete();
  }
}
