import invariant from "@minswap/tiny-invariant";
import {
  Assets,
  Constr,
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
  MetadataMessage,
  PoolV2,
} from ".";
import { FactoryV2 } from "./types/factory";
import { NetworkId } from "./types/network";

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

  constructor(lucid: Lucid, adapter: BlockfrostAdapter) {
    this.lucid = lucid;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
    this.adapter = adapter;
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
}
