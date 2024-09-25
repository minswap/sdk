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
    for (const [currencySymbol, tokenNameMap] of Object.entries(ogmiosValue)) {
      if (currencySymbol === "ada") {
        value.push({
          unit: "lovelace",
          quantity: tokenNameMap.lovelace.toString()
        })
      } else {
        for (const [tokenName, amount] of Object.entries(tokenNameMap)) {
          value.push({
            unit: `${currencySymbol}${tokenName}`,
            quantity: amount.toString()
          })
        }
      }
    }
    return value;
  }
}