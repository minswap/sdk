export enum NetworkId {
  TESTNET = 0,
  MAINNET,
}

export type Value = {
  unit: string;
  quantity: string;
}[];

export type TxIn = {
  txHash: string;
  index: number;
};
