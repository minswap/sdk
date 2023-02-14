import invariant from "@minswap/tiny-invariant";
import Big from "big.js";

import {
  FACTORY_ASSET_NAME,
  FACTORY_POLICY_ID,
  LP_POLICY_ID,
  POOL_ADDRESS,
  POOL_NFT_POLICY_ID,
} from "./constants";
import { NetworkId, TxIn, Value } from "./types";

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

/**
 * Represents state of a pool UTxO. The state could be latest state or a historical state.
 */
export class PoolState {
  /** The transaction hash and output index of the pool UTxO */
  public readonly txIn: TxIn;
  public readonly value: Value;
  public readonly datumHash: string | null;
  public readonly assetA: string;
  public readonly assetB: string;

  constructor(txIn: TxIn, value: Value, datumHash: string | null) {
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

  /**
   * Get the output amount if we swap a certain amount of a token in the pair
   * @param assetIn The asset that we want to swap from
   * @param amountIn The amount that we want to swap from
   * @returns The amount of the other token that we get from the swap and its price impact
   */
  getAmountOut(
    assetIn: string,
    amountIn: bigint
  ): { amountOut: bigint; priceImpact: Big } {
    invariant(
      assetIn === this.assetA || assetIn === this.assetB,
      `asset ${assetIn} doesn't exist in pool ${this.assetA}-${this.assetB}`
    );
    const [reserveIn, reserveOut] =
      assetIn === this.assetA
        ? [this.reserveA, this.reserveB]
        : [this.reserveB, this.reserveA];

    const amtOutNumerator = amountIn * 997n * reserveOut;
    const amtOutDenominator = amountIn * 997n + reserveIn * 1000n;

    const priceImpactNumerator =
      reserveOut * amountIn * amtOutDenominator * 997n -
      amtOutNumerator * reserveIn * 1000n;
    const priceImpactDenominator =
      reserveOut * amountIn * amtOutDenominator * 1000n;

    return {
      amountOut: amtOutNumerator / amtOutDenominator,
      priceImpact: new Big(priceImpactNumerator.toString())
        .mul(new Big(100))
        .div(new Big(priceImpactDenominator.toString())),
    };
  }

  /**
   * Get the input amount needed if we want to get a certain amount of a token in the pair from swapping
   * @param assetOut The asset that we want to get from the pair
   * @param amountOut The amount of assetOut that we want get from the swap
   * @returns The amount needed of the input token for the swap and its price impact
   */
  getAmountIn(
    assetOut: string,
    amountOut: bigint
  ): { amountIn: bigint; priceImpact: Big } {
    invariant(
      assetOut === this.assetA || assetOut === this.assetB,
      `asset ${assetOut} doesn't exist in pool ${this.assetA}-${this.assetB}`
    );
    const [reserveIn, reserveOut] =
      assetOut === this.assetB
        ? [this.reserveA, this.reserveB]
        : [this.reserveB, this.reserveA];

    const amtInNumerator = reserveIn * amountOut * 1000n;
    const amtInDenominator = (reserveOut - amountOut) * 997n;

    const priceImpactNumerator =
      reserveOut * amtInNumerator * 997n -
      amountOut * amtInDenominator * reserveIn * 1000n;
    const priceImpactDenominator = reserveOut * amtInNumerator * 1000n;

    return {
      amountIn: amtInNumerator / amtInDenominator + 1n,
      priceImpact: new Big(priceImpactNumerator.toString())
        .mul(new Big(100))
        .div(new Big(priceImpactDenominator.toString())),
    };
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
  address: string,
  value: Value,
  datumHash: string | null
): void {
  invariant(
    address === POOL_ADDRESS[networkId],
    `expect pool address of ${POOL_ADDRESS[networkId]}, got ${address}`
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
  address: string,
  value: Value,
  datumHash: string | null
): boolean {
  try {
    checkValidPoolOutput(networkId, address, value, datumHash);
    return true;
  } catch (err) {
    return false;
  }
}
