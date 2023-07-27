import { Constr, Data } from "lucid-cardano";

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

    export function toPlutusData(asset: Asset): Constr<Data> {
        const { policyId, tokenName } = asset
        return new Constr(0, [
            policyId,
            tokenName
        ])
    }

    export function fromPlutusData(data: Constr<Data>): Asset {
        if (data.index !== 0) {
            throw new Error(`Index of Asset must be 0, actual: ${data.index}`)
        }
        return {
            policyId: data.fields[0] as string,
            tokenName: data.fields[1] as string
        }
    }
}