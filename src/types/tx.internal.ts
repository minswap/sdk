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