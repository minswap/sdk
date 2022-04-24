import invariant from "@minswap/tiny-invariant";

import {
  FACTORY_ASSET_NAME,
  FACTORY_POLICY_ID,
  LP_POLICY_ID,
  POOL_NFT_POLICY_ID,
} from "./constants";
import { Utxo } from "./types";

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

export class PoolState {
  private readonly utxo: Utxo;
  public readonly assetA: string;
  public readonly assetB: string;

  constructor(utxo: Utxo) {
    this.utxo = utxo;
    const relevantAssets = utxo.amount.filter(
      ({ unit }) =>
        !unit.startsWith(FACTORY_POLICY_ID) &&
        !unit.startsWith(POOL_NFT_POLICY_ID) &&
        !unit.startsWith(LP_POLICY_ID)
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

  get reserveA(): bigint {
    return BigInt(
      this.utxo.amount.find(({ unit }) => unit === this.assetA)?.quantity ?? "0"
    );
  }

  get reserveB(): bigint {
    return BigInt(
      this.utxo.amount.find(({ unit }) => unit === this.assetB)?.quantity ?? "0"
    );
  }
}

export function isValidPoolUtxo(utxo: Utxo): boolean {
  // must have 1 factory token
  if (
    utxo.amount.find(
      ({ unit }) => unit === `${FACTORY_POLICY_ID}${FACTORY_ASSET_NAME}`
    )?.quantity !== "1"
  ) {
    return false;
  }
  return true;
}
