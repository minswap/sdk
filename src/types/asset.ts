import invariant from "@minswap/tiny-invariant";
import { Constr } from "@spacebudz/lucid";

import { DataType } from "..";
import { StringUtils } from "./string";

export const ADA: Asset = {
    policyId: "",
    tokenName: ""
}

export type Asset = {
    policyId: string,
    tokenName: string
}

export namespace Asset {
    export function fromString(s: string): Asset {
        if (s === "lovelace") {
            return {
                policyId: "",
                tokenName: ""
            };
        }
        const policyId = s.slice(0, 56);
        const tokenName = s.slice(56);
        return {
            policyId: policyId,
            tokenName: tokenName
        }
    }

    export function toString(asset: Asset): string {
        const { policyId, tokenName } = asset
        if (policyId === "" && tokenName === "") {
            return "lovelace"
        }
        return policyId + tokenName
    }

    export function toPlutusData(asset: Asset): Constr<DataType> {
        const { policyId, tokenName } = asset
        return new Constr(0, [
            policyId,
            tokenName
        ])
    }

    export function fromPlutusData(data: Constr<DataType>): Asset {
        if (data.index !== 0) {
            throw new Error(`Index of Asset must be 0, actual: ${data.index}`)
        }
        invariant(
          data.fields.length === 2,
          `Asset fields length must be 2, actual: ${data.fields.length}`
        );
        return {
            policyId: data.fields[0] as string,
            tokenName: data.fields[1] as string
        }
    }

    export function compare(a1: Asset, a2: Asset): number {
        if (a1.policyId === a2.policyId) {
            return StringUtils.compare(a1.tokenName, a2.tokenName)
        }
        return StringUtils.compare(a1.policyId, a2.policyId)
    }

    export function equals(a1: Asset, a2: Asset): boolean {
        return a1.policyId === a2.policyId && a1.tokenName === a2.tokenName
    }
}