import Big from "big.js";
import { NetworkId, TxIn, Value } from "./types";
export declare function normalizeAssets(a: string, b: string): [string, string];
/**
 * Represents state of a pool UTxO. The state could be latest state or a historical state.
 */
export declare class PoolState {
    /** The transaction hash and output index of the pool UTxO */
    readonly txIn: TxIn;
    readonly value: Value;
    readonly datumHash: string | null;
    readonly assetA: string;
    readonly assetB: string;
    constructor(txIn: TxIn, value: Value, datumHash: string | null);
    get nft(): string;
    get id(): string;
    get assetLP(): string;
    get reserveA(): bigint;
    get reserveB(): bigint;
    /**
     * Get the output amount if we swap a certain amount of a token in the pair
     * @param assetIn The asset that we want to swap from
     * @param amountIn The amount that we want to swap from
     * @returns The amount of the other token that we get from the swap and its price impact
     */
    getAmountOut(assetIn: string, amountIn: bigint): {
        amountOut: bigint;
        priceImpact: Big;
    };
    /**
     * Get the input amount needed if we want to get a certain amount of a token in the pair from swapping
     * @param assetOut The asset that we want to get from the pair
     * @param amountOut The amount of assetOut that we want get from the swap
     * @returns The amount needed of the input token for the swap and its price impact
     */
    getAmountIn(assetOut: string, amountOut: bigint): {
        amountIn: bigint;
        priceImpact: Big;
    };
}
/**
 * Represents a historical point of a pool.
 */
export type PoolHistory = {
    txHash: string;
    /** Transaction index within the block */
    txIndex: number;
    blockHeight: number;
    time: Date;
};
export declare function checkValidPoolOutput(networkId: NetworkId, address: string, value: Value, datumHash: string | null): void;
export declare function isValidPoolOutput(networkId: NetworkId, address: string, value: Value, datumHash: string | null): boolean;
