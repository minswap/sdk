export enum NetworkId {
  TESTNET = 0,
  MAINNET,
}

export type Value = {
  unit: string;
  quantity: string;
}[];

export type TxIn = {
  tx_hash: string;
  output_index: number;
};
