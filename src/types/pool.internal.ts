import invariant from "@minswap/tiny-invariant";
import { Address, Constr, Data } from "lucid-cardano";

import { FACTORY_ASSET_NAME, FACTORY_POLICY_ID } from "../constants";
import { POOL_SCRIPT_HASH } from "../constants";
import { getScriptHashFromAddress } from "../utils/address-utils.internal";
import { AddressPlutusData } from "./address.internal";
import { NetworkId } from "./network";
import { Value } from "./tx.internal";

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
  feeTo: Address;
  feeToDatumHash?: string;
};

export namespace PoolFeeSharing {
  export function toPlutusData(feeSharing: PoolFeeSharing): Constr<Data> {
    const { feeTo, feeToDatumHash } = feeSharing;
    return new Constr(0, [
      AddressPlutusData.toPlutusData(feeTo),
      feeToDatumHash ? new Constr(0, [feeToDatumHash]) : new Constr(1, []),
    ]);
  }

  export function fromPlutusData(
    networkId: NetworkId,
    data: Constr<Data>
  ): PoolFeeSharing {
    if (data.index !== 0) {
      throw new Error(
        `Index of Pool Profit Sharing must be 0, actual: ${data.index}`
      );
    }
    let feeToDatumHash: string | undefined = undefined;
    const maybeFeeToDatumHash = data.fields[1] as Constr<Data>;
    switch (maybeFeeToDatumHash.index) {
      case 0: {
        feeToDatumHash = maybeFeeToDatumHash.fields[0] as string;
        break;
      }
      case 1: {
        feeToDatumHash = undefined;
        break;
      }
      default: {
        throw new Error(
          `Index of Fee To DatumHash must be 0 or 1, actual: ${maybeFeeToDatumHash.index}`
        );
      }
    }
    return {
      feeTo: AddressPlutusData.fromPlutusData(
        networkId,
        data.fields[0] as Constr<Data>
      ),
      feeToDatumHash: feeToDatumHash,
    };
  }
}

export function checkValidPoolOutput(
  poolAddress: string,
  value: Value,
  datumHash: string | null
): void {
  invariant(
    getScriptHashFromAddress(poolAddress) === POOL_SCRIPT_HASH,
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
  poolAddress: string,
  value: Value,
  datumHash: string | null
): boolean {
  try {
    checkValidPoolOutput(poolAddress, value, datumHash);
    return true;
  } catch (err) {
    return false;
  }
}
