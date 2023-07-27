import invariant from "@minswap/tiny-invariant";
import { Address, Constr, Data } from "lucid-cardano";

import {
  FACTORY_ASSET_NAME,
  FACTORY_POLICY_ID,
  LP_POLICY_ID,
  POOL_ADDRESS_SET,
  POOL_NFT_POLICY_ID,
} from "../constants";
import { AddressPlutusData } from "./address";
import { Asset } from "./asset";
import { NetworkId, TxIn, Value } from "./tx";

// ADA goes first
// If non-ADA, then sort lexicographically
export function normalizeAssets(a: string, b: string): [string, string] {
  if (a === "lovelace") {
    return [a, b];
  }
  if (b === "lovelace") {
    return [b, a];
  }
  if (a < b) {
    return [a, b];
  } else {
    return [b, a];
  }
}

export type PoolFeeSharing = {
  feeTo: Address,
  feeToDatumHash?: string
}

export namespace PoolFeeSharing {
  export function toPlutusData(feeSharing: PoolFeeSharing): Constr<Data> {
    const {feeTo, feeToDatumHash} = feeSharing
    return new Constr(0, [
      AddressPlutusData.toPlutusData(feeTo),
      feeToDatumHash ? new Constr(0, [feeToDatumHash]) : new Constr(1, [])
    ])
  }

  export function fromPlutusData(networkId: NetworkId, data: Constr<Data>): PoolFeeSharing {
    if (data.index !== 0) {
      throw new Error(`Index of Pool Profit Sharing must be 0, actual: ${data.index}`)
    }
    let feeToDatumHash: string | undefined = undefined
    const maybeFeeToDatumHash = data.fields[1] as Constr<Data>
    switch(maybeFeeToDatumHash.index) {
      case 0: {
        feeToDatumHash = maybeFeeToDatumHash.fields[0] as string
        break
      }
      case 1: {
        feeToDatumHash = undefined
        break
      }
      default: {
        throw new Error(`Index of Fee To DatumHash must be 0 or 1, actual: ${maybeFeeToDatumHash.index}`)
      }
    }
    return {
      feeTo: AddressPlutusData.fromPlutusData(networkId, data.fields[0] as Constr<Data>),
      feeToDatumHash: feeToDatumHash
    }
  }
}

export type PoolDatum = {
  assetA: Asset;
  assetB: Asset;
  totalLiquidity: bigint;
  rootKLast: bigint;
  feeSharing?: PoolFeeSharing;
}

export namespace PoolDatum {
  export function toPlutusData(datum: PoolDatum): Constr<Data> {
    const {assetA, assetB, totalLiquidity, rootKLast, feeSharing} = datum
    return new Constr(0, [
      Asset.toPlutusData(assetA),
      Asset.toPlutusData(assetB),
      totalLiquidity,
      rootKLast,
      feeSharing ? new Constr(0, [PoolFeeSharing.toPlutusData(feeSharing)]) : new Constr(1, [])
    ])
  }

  export function fromPlutusData(networkId: NetworkId ,data: Constr<Data>): PoolDatum {
    if (data.index !== 0) {
      throw new Error(`Index of Pool Datum must be 0, actual: ${data.index}`)
    }
    let feeSharing: PoolFeeSharing | undefined = undefined
    const maybeFeeSharingConstr = data.fields[4] as Constr<Data>
    switch(maybeFeeSharingConstr.index) {
      case 0: {
        feeSharing = PoolFeeSharing.fromPlutusData(networkId, maybeFeeSharingConstr.fields[0] as Constr<Data>)
        break
      }
      case 1: {
        feeSharing = undefined
        break
      }
      default: {
        throw new Error(`Index of Pool Fee Sharing must be 0 or 1, actual: ${maybeFeeSharingConstr.index}`)
      }
    }
    return {
      assetA: Asset.fromPlutusData(data.fields[0] as Constr<Data>),
      assetB: Asset.fromPlutusData(data.fields[1] as Constr<Data>),
      totalLiquidity: data.fields[2] as bigint,
      rootKLast: data.fields[3] as bigint,
      feeSharing: feeSharing
    }
  }
}

/**
 * Represents state of a pool UTxO. The state could be latest state or a historical state.
 */
export class PoolState {
  /** The transaction hash and output index of the pool UTxO */
  public readonly txIn: TxIn;
  public readonly value: Value;
  public readonly datumHash: string;
  public readonly assetA: string;
  public readonly assetB: string;

  constructor(txIn: TxIn, value: Value, datumHash: string) {
    this.txIn = txIn;
    this.value = value;
    this.datumHash = datumHash;

    const nft = value.find(({ unit }) => unit.startsWith(POOL_NFT_POLICY_ID));
    invariant(nft, "pool doesn't have NFT");
    const poolId = nft.unit.slice(56);
    // validate and memoize assetA and assetB
    const relevantAssets = value.filter(
      ({ unit }) =>
        !unit.startsWith(FACTORY_POLICY_ID) && // factory token
        !unit.endsWith(poolId) // NFT and LP tokens from profit sharing
    );
    switch (relevantAssets.length) {
      case 2: {
        // ADA/A pool
        this.assetA = "lovelace";
        const nonADAAssets = relevantAssets.filter(
          ({ unit }) => unit !== "lovelace"
        );
        invariant(nonADAAssets.length === 1, "pool must have 1 non-ADA asset");
        this.assetB = nonADAAssets[0].unit;
        break;
      }
      case 3: {
        // A/B pool
        const nonADAAssets = relevantAssets.filter(
          ({ unit }) => unit !== "lovelace"
        );
        invariant(nonADAAssets.length === 2, "pool must have 1 non-ADA asset");
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
      unit.startsWith(POOL_NFT_POLICY_ID)
    );
    invariant(nft, "pool doesn't have NFT");
    return nft.unit;
  }

  get id(): string {
    // a pool's ID is the NFT's asset name
    return this.nft.slice(POOL_NFT_POLICY_ID.length);
  }

  get assetLP(): string {
    return `${LP_POLICY_ID}${this.id}`;
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

/**
 * Represents a historical point of a pool.
 */
export type PoolHistory = {
  txHash: string;
  /** Transaction index within the block */
  txIndex: number;
  blockHeight: number;
  time: Date;
};

export function checkValidPoolOutput(
  networkId: NetworkId,
  poolAddress: string,
  value: Value,
  datumHash: string | null
): void {
  invariant(
    POOL_ADDRESS_SET[networkId].has(poolAddress),
    `invalid pool address: ${poolAddress}`
  );
  // must have 1 factory token
  if (
    value.find(
      ({ unit }) => unit === `${FACTORY_POLICY_ID}${FACTORY_ASSET_NAME}`
    )?.quantity !== "1"
  ) {
    throw new Error(`expect pool to have 1 factory token`);
  }
  invariant(datumHash, `expect pool to have datum hash, got ${datumHash}`);
}

export function isValidPoolOutput(
  networkId: NetworkId,
  poolAddress: string,
  value: Value,
  datumHash: string | null
): boolean {
  try {
    checkValidPoolOutput(networkId, poolAddress, value, datumHash);
    return true;
  } catch (err) {
    return false;
  }
}
