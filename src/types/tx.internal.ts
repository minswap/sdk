import * as OgmiosSchema from "@cardano-ogmios/schema";

export type Value = {
  unit: string;
  quantity: string;
}[];

export type TxIn = {
  txHash: string;
  index: number;
};

export type TxHistory = {
  txHash: string;
  /** Transaction index within the block */
  txIndex: number;
  blockHeight: number;
  time: Date;
}

export namespace Value {
  export function fromOgmiosValue(ogmiosValue: OgmiosSchema.Value): Value {
    const value: Value = [];
    for (const [cyrencySymbol, tokenNameMap] of Object.entries(ogmiosValue)) {
      if (cyrencySymbol === "ada") {
        value.push({
          unit: "lovelace",
          quantity: tokenNameMap.lovelace.toString()
        })
      } else {
        for (const [tokenName, amount] of Object.entries(tokenNameMap)) {
          value.push({
            unit: `${cyrencySymbol}${tokenName}`,
            quantity: amount.toString()
          })
        }
      }
    }
    return value;
  }
}