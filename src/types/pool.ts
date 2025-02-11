import invariant from "@minswap/tiny-invariant";
import { Constr, Credential } from "@spacebudz/lucid";

import { DataObject, DataType } from "..";
import { sha3 } from "../utils/hash.internal";
import { LucidCredential } from "./address.internal";
import { ADA, Asset } from "./asset";
import { DexV1Constant, DexV2Constant, StableswapConstant } from "./constants";
import { NetworkId } from "./network";
import { normalizeAssets, PoolFeeSharing } from "./pool.internal";
import { TxIn, Value } from "./tx.internal";

export const DEFAULT_POOL_V2_TRADING_FEE_DENOMINATOR = 10000n;
export const MIN_POOL_V2_TRADING_FEE_NUMERATOR = 5n;
export const MAX_POOL_V2_TRADING_FEE_NUMERATOR = 2000n;

export namespace PoolV1 {
  /**
   * Represents state of a pool UTxO. The state could be latest state or a historical state.
   */
  export class State {
    /** The transaction hash and output index of the pool UTxO */
    public readonly address: string;
    public readonly txIn: TxIn;
    public readonly value: Value;
    public readonly datumHash: string;
    public readonly assetA: string;
    public readonly assetB: string;

    constructor(address: string, txIn: TxIn, value: Value, datumHash: string) {
      this.address = address;
      this.txIn = txIn;
      this.value = value;
      this.datumHash = datumHash;

      const nft = value.find(({ unit }) =>
        unit.startsWith(DexV1Constant.POOL_NFT_POLICY_ID)
      );
      invariant(nft, "pool doesn't have NFT");
      const poolId = nft.unit.slice(56);
      // validate and memoize assetA and assetB
      const relevantAssets = value.filter(
        ({ unit }) =>
          !unit.startsWith(DexV1Constant.FACTORY_POLICY_ID) && // factory token
          !unit.endsWith(poolId) // NFT and LP tokens from profit sharing
      );
      switch (relevantAssets.length) {
        case 2: {
          // ADA/A pool
          this.assetA = "lovelace";
          const nonADAAssets = relevantAssets.filter(
            ({ unit }) => unit !== "lovelace"
          );
          invariant(
            nonADAAssets.length === 1,
            "pool must have 1 non-ADA asset"
          );
          this.assetB = nonADAAssets[0].unit;
          break;
        }
        case 3: {
          // A/B pool
          const nonADAAssets = relevantAssets.filter(
            ({ unit }) => unit !== "lovelace"
          );
          invariant(
            nonADAAssets.length === 2,
            "pool must have 1 non-ADA asset"
          );
          [this.assetA, this.assetB] = normalizeAssets(
            nonADAAssets[0].unit,
            nonADAAssets[1].unit
          );
          break;
        }
        default:
          throw new Error(
            "pool must have 2 or 3 assets except factory, NFT and LP tokens"
          );
      }
    }

    get nft(): string {
      const nft = this.value.find(({ unit }) =>
        unit.startsWith(DexV1Constant.POOL_NFT_POLICY_ID)
      );
      invariant(nft, "pool doesn't have NFT");
      return nft.unit;
    }

    get id(): string {
      // a pool's ID is the NFT's asset name
      return this.nft.slice(DexV1Constant.POOL_NFT_POLICY_ID.length);
    }

    get assetLP(): string {
      return `${DexV1Constant.LP_POLICY_ID}${this.id}`;
    }

    get reserveA(): bigint {
      return BigInt(
        this.value.find(({ unit }) => unit === this.assetA)?.quantity ?? "0"
      );
    }

    get reserveB(): bigint {
      return BigInt(
        this.value.find(({ unit }) => unit === this.assetB)?.quantity ?? "0"
      );
    }
  }

  export type Datum = {
    assetA: Asset;
    assetB: Asset;
    totalLiquidity: bigint;
    rootKLast: bigint;
    feeSharing?: PoolFeeSharing;
  };

  export namespace Datum {
    export function toPlutusData(datum: Datum): Constr<DataType> {
      const { assetA, assetB, totalLiquidity, rootKLast, feeSharing } = datum;
      return new Constr(0, [
        Asset.toPlutusData(assetA),
        Asset.toPlutusData(assetB),
        totalLiquidity,
        rootKLast,
        feeSharing
          ? new Constr(0, [PoolFeeSharing.toPlutusData(feeSharing)])
          : new Constr(1, []),
      ]);
    }

    export function fromPlutusData(
      networkId: NetworkId,
      data: Constr<DataType>
    ): Datum {
      if (data.index !== 0) {
        throw new Error(`Index of Pool Datum must be 0, actual: ${data.index}`);
      }
      let feeSharing: PoolFeeSharing | undefined = undefined;
      const maybeFeeSharingConstr = data.fields[4] as Constr<DataType>;
      switch (maybeFeeSharingConstr.index) {
        case 0: {
          feeSharing = PoolFeeSharing.fromPlutusData(
            networkId,
            maybeFeeSharingConstr.fields[0] as Constr<DataType>
          );
          break;
        }
        case 1: {
          feeSharing = undefined;
          break;
        }
        default: {
          throw new Error(
            `Index of Pool Fee Sharing must be 0 or 1, actual: ${maybeFeeSharingConstr.index}`
          );
        }
      }
      return {
        assetA: Asset.fromPlutusData(data.fields[0] as Constr<DataType>),
        assetB: Asset.fromPlutusData(data.fields[1] as Constr<DataType>),
        totalLiquidity: data.fields[2] as bigint,
        rootKLast: data.fields[3] as bigint,
        feeSharing: feeSharing,
      };
    }
  }
}

export namespace StablePool {
  export class State {
    public readonly address: string;
    public readonly txIn: TxIn;
    public readonly value: Value;
    public readonly datumCbor: string;
    public readonly datum: Datum;
    public readonly config: StableswapConstant.Config;

    constructor(
      networkId: NetworkId,
      address: string,
      txIn: TxIn,
      value: Value,
      datum: string
    ) {
      this.address = address;
      this.txIn = txIn;
      this.value = value;
      this.datumCbor = datum;
      this.datum = Datum.fromPlutusData(DataObject.from(datum));
      const allConfigs = StableswapConstant.CONFIG[networkId];
      const config = allConfigs.find((cfg) => cfg.poolAddress === address);
      if (!config) {
        throw new Error("Invalid Stable Pool address");
      }
      this.config = config;
      if (
        !value.find((v) => v.unit === config.nftAsset && v.quantity === "1")
      ) {
        throw new Error("Cannot find the Pool NFT in the value");
      }
    }

    get assets(): string[] {
      return this.config.assets;
    }

    get nft(): string {
      return this.config.nftAsset;
    }

    get lpAsset(): string {
      return this.config.lpAsset;
    }

    get reserves(): bigint[] {
      return this.datum.balances;
    }

    get totalLiquidity(): bigint {
      return this.datum.totalLiquidity;
    }

    get orderHash(): string {
      return this.datum.orderHash;
    }

    get amp(): bigint {
      return this.datum.amplificationCoefficient;
    }

    get id(): string {
      return this.nft;
    }
  }

  export type Datum = {
    balances: bigint[];
    totalLiquidity: bigint;
    amplificationCoefficient: bigint;
    orderHash: string;
  };

  export namespace Datum {
    export function toPlutusData(datum: Datum): Constr<DataType> {
      const { balances, totalLiquidity, amplificationCoefficient, orderHash } =
        datum;
      return new Constr(0, [
        balances,
        totalLiquidity,
        amplificationCoefficient,
        orderHash,
      ]);
    }

    export function fromPlutusData(data: Constr<DataType>): Datum {
      if (data.index !== 0) {
        throw new Error(`Index of Pool Datum must be 0, actual: ${data.index}`);
      }
      return {
        balances: data.fields[0] as bigint[],
        totalLiquidity: data.fields[1] as bigint,
        amplificationCoefficient: data.fields[2] as bigint,
        orderHash: data.fields[3] as string,
      };
    }
  }
}

export namespace PoolV2 {
  export const MAX_LIQUIDITY = 9_223_372_036_854_775_807n;
  export const DEFAULT_POOL_ADA = 4_500_000n;
  // The amount of liquidity that will be locked in pool when creating pools
  export const MINIMUM_LIQUIDITY = 10n;
  export const DEFAULT_TRADING_FEE_DENOMINATOR = 10000n;

  export function computeLPAssetName(assetA: Asset, assetB: Asset): string {
    const [normalizedA, normalizedB] = normalizeAssets(
      Asset.toString(assetA),
      Asset.toString(assetB)
    );
    const normalizedAssetA = Asset.fromString(normalizedA);
    const normalizedAssetB = Asset.fromString(normalizedB);
    const k1 = sha3(normalizedAssetA.policyId + normalizedAssetA.tokenName);
    const k2 = sha3(normalizedAssetB.policyId + normalizedAssetB.tokenName);
    return sha3(k1 + k2);
  }

  export type Info = {
    datumReserves: [bigint, bigint];
    valueReserves: [bigint, bigint];
    totalLiquidity: bigint;
    tradingFee: {
      feeANumerator: bigint;
      feeBNumerator: bigint;
    };
    feeSharingNumerator?: bigint;
  };
  export class State {
    public readonly address: string;
    public readonly txIn: TxIn;
    public readonly value: Value;
    public readonly datumRaw: string;
    public readonly datum: Datum;
    public readonly config: DexV2Constant.Config;
    public readonly lpAsset: Asset;
    public readonly authenAsset: Asset;
    constructor(
      networkId: NetworkId,
      address: string,
      txIn: TxIn,
      value: Value,
      datum: string
    ) {
      this.address = address;
      this.txIn = txIn;
      this.value = value;
      this.datumRaw = datum;
      this.datum = Datum.fromPlutusData(DataObject.from(datum));
      this.config = DexV2Constant.CONFIG[networkId];
      this.lpAsset = {
        policyId: this.config.lpPolicyId,
        tokenName: computeLPAssetName(this.datum.assetA, this.datum.assetB),
      };
      this.authenAsset = Asset.fromString(this.config.poolAuthenAsset);
      if (
        !value.find(
          (v) => v.unit === this.config.poolAuthenAsset && v.quantity === "1"
        )
      ) {
        throw new Error(
          "Cannot find the Pool Authentication Asset in the value"
        );
      }
    }

    get assetA(): string {
      return Asset.toString(this.datum.assetA);
    }

    get assetB(): string {
      return Asset.toString(this.datum.assetB);
    }

    get totalLiquidity(): bigint {
      return this.datum.totalLiquidity;
    }

    get reserveA(): bigint {
      return this.datum.reserveA;
    }

    get reserveB(): bigint {
      return this.datum.reserveB;
    }

    get feeA(): [bigint, bigint] {
      return [
        this.datum.baseFee.feeANumerator,
        DEFAULT_POOL_V2_TRADING_FEE_DENOMINATOR,
      ];
    }

    get feeB(): [bigint, bigint] {
      return [
        this.datum.baseFee.feeBNumerator,
        DEFAULT_POOL_V2_TRADING_FEE_DENOMINATOR,
      ];
    }

    get feeShare(): [bigint, bigint] | undefined {
      if (this.datum.feeSharingNumerator !== undefined) {
        return [
          this.datum.feeSharingNumerator,
          DEFAULT_POOL_V2_TRADING_FEE_DENOMINATOR,
        ];
      } else {
        return undefined;
      }
    }

    get datumReserves(): [bigint, bigint] {
      return [this.datum.reserveA, this.datum.reserveB];
    }

    get valueReserveA(): bigint {
      const amount = BigInt(
        this.value.find((v) => v.unit === this.assetA)?.quantity ?? "0"
      );
      if (Asset.equals(this.datum.assetA, ADA)) {
        return amount - DEFAULT_POOL_ADA;
      }
      return amount;
    }

    get valueReserveB(): bigint {
      return BigInt(
        this.value.find((v) => v.unit === this.assetB)?.quantity ?? "0"
      );
    }

    get valueReserves(): [bigint, bigint] {
      return [this.valueReserveA, this.valueReserveB];
    }

    get info(): Info {
      return {
        datumReserves: this.datumReserves,
        valueReserves: this.valueReserves,
        totalLiquidity: this.datum.totalLiquidity,
        tradingFee: this.datum.baseFee,
        feeSharingNumerator: this.datum.feeSharingNumerator,
      };
    }
  }

  export type Datum = {
    poolBatchingStakeCredential: Credential;
    assetA: Asset;
    assetB: Asset;
    totalLiquidity: bigint;
    reserveA: bigint;
    reserveB: bigint;
    baseFee: {
      feeANumerator: bigint;
      feeBNumerator: bigint;
    };
    feeSharingNumerator?: bigint;
    allowDynamicFee: boolean;
  };

  export namespace Datum {
    export function toPlutusData(datum: Datum): Constr<DataType> {
      const {
        poolBatchingStakeCredential,
        assetA,
        assetB,
        totalLiquidity,
        reserveA,
        reserveB,
        baseFee,
        feeSharingNumerator,
        allowDynamicFee,
      } = datum;
      return new Constr(0, [
        new Constr(0, [
          LucidCredential.toPlutusData(poolBatchingStakeCredential),
        ]),
        Asset.toPlutusData(assetA),
        Asset.toPlutusData(assetB),
        totalLiquidity,
        reserveA,
        reserveB,
        baseFee.feeANumerator,
        baseFee.feeBNumerator,
        feeSharingNumerator !== undefined
          ? new Constr(0, [feeSharingNumerator])
          : new Constr(1, []),
        new Constr(allowDynamicFee ? 1 : 0, []),
      ]);
    }

    export function fromPlutusData(data: Constr<DataType>): Datum {
      if (data.index !== 0) {
        throw new Error(`Index of Pool Datum must be 0, actual: ${data.index}`);
      }
      const stakeCredentialConstr = data.fields[0] as Constr<DataType>;
      if (stakeCredentialConstr.index !== 0) {
        throw new Error(
          `Index of Stake Credential must be 0, actual: ${stakeCredentialConstr.index}`
        );
      }
      let feeSharingNumerator: bigint | undefined = undefined;
      const maybeFeeSharingConstr = data.fields[8] as Constr<DataType>;
      switch (maybeFeeSharingConstr.index) {
        case 0: {
          feeSharingNumerator = maybeFeeSharingConstr.fields[0] as bigint;
          break;
        }
        case 1: {
          feeSharingNumerator = undefined;
          break;
        }
        default: {
          throw new Error(
            `Index of Pool Fee Sharing must be 0 or 1, actual: ${maybeFeeSharingConstr.index}`
          );
        }
      }
      const allowDynamicFeeConstr = data.fields[9] as Constr<DataType>;
      const allowDynamicFee = allowDynamicFeeConstr.index === 1;
      return {
        poolBatchingStakeCredential: LucidCredential.fromPlutusData(
          stakeCredentialConstr.fields[0] as Constr<DataType>
        ),
        assetA: Asset.fromPlutusData(data.fields[1] as Constr<DataType>),
        assetB: Asset.fromPlutusData(data.fields[2] as Constr<DataType>),
        totalLiquidity: data.fields[3] as bigint,
        reserveA: data.fields[4] as bigint,
        reserveB: data.fields[5] as bigint,
        baseFee: {
          feeANumerator: data.fields[6] as bigint,
          feeBNumerator: data.fields[7] as bigint,
        },
        feeSharingNumerator: feeSharingNumerator,
        allowDynamicFee: allowDynamicFee,
      };
    }
  }
}
