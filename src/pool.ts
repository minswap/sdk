import invariant from "@minswap/tiny-invariant";

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

export class PoolState {
  public readonly txIn: TxIn;
  public readonly value: Value;
  public readonly datumHash: string | null;
  public readonly assetA: string;
  public readonly assetB: string;

  constructor(txIn: TxIn, value: Value, datumHash: string | null) {
    this.txIn = txIn;
    this.value = value;
    this.datumHash = datumHash;
    const relevantAssets = value.filter(
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
