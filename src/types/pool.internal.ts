import invariant from "@minswap/tiny-invariant";
import { Constr } from "@spacebudz/lucid";

import { DataType } from "..";
import { getScriptHashFromAddress } from "../utils/address-utils.internal";
import { AddressPlutusData } from "./address.internal";
import { DexV1Constant } from "./constants";
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
  feeTo: string;
  feeToDatumHash?: string;
};

export namespace PoolFeeSharing {
  export function toPlutusData(
    feeSharing: PoolFeeSharing
  ): Constr<Constr<DataType>> {
    const { feeTo, feeToDatumHash } = feeSharing;
    return new Constr(0, [
      AddressPlutusData.toPlutusData(feeTo),
      feeToDatumHash ? new Constr(0, [feeToDatumHash]) : new Constr(1, []),
    ]);
  }

  export function fromPlutusData(
    networkId: NetworkId,
    data: Constr<DataType>
  ): PoolFeeSharing {
    if (data.index !== 0) {
      throw new Error(
        `Index of Pool Profit Sharing must be 0, actual: ${data.index}`
      );
    }
    let feeToDatumHash: string | undefined = undefined;
    const maybeFeeToDatumHash = data.fields[1] as Constr<DataType>;
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
        data.fields[0] as Constr<DataType>
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
    getScriptHashFromAddress(poolAddress) === DexV1Constant.POOL_SCRIPT_HASH,
    `invalid pool address: ${poolAddress}`
  );
  // must have 1 factory token
  if (
    value.find(
      ({ unit }) =>
        unit ===
        `${DexV1Constant.FACTORY_POLICY_ID}${DexV1Constant.FACTORY_ASSET_NAME}`
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
  } catch {
    return false;
  }
}
