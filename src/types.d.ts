export declare enum NetworkId {
    TESTNET = 0,
    MAINNET = 1
}
export type Value = {
    unit: string;
    quantity: string;
}[];
export type TxIn = {
    txHash: string;
    index: number;
};
