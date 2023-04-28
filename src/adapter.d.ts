import { PaginationOptions } from "@blockfrost/blockfrost-js/lib/types";
import Big from "big.js";
import { Lucid } from "lucid-cardano";
import { PoolHistory, PoolState } from "./pool";
import { NetworkId } from "./types";
export type BlockfrostAdapterOptions = {
    projectId: string;
    networkId?: NetworkId;
};
export type GetPoolsParams = Omit<PaginationOptions, "page"> & {
    page: number;
};
export type GetPoolByIdParams = {
    id: string;
};
export type GetPoolPriceParams = {
    pool: PoolState;
    decimalsA?: number;
    decimalsB?: number;
};
export type GetPoolHistoryParams = PaginationOptions & {
    id: string;
};
export type GetPoolInTxParams = {
    txHash: string;
};
export declare class BlockfrostAdapter {
    private readonly networkId;
    private readonly api;
    private lucid;
    constructor({ projectId, networkId, }: BlockfrostAdapterOptions);
    getLucid(): Promise<Lucid>;
    /**
     *
     * @returns The latest pools or empty array if current page is after last page
     */
    getPools({ page, count, order, }: GetPoolsParams): Promise<PoolState[]>;
    /**
     * Get a specific pool by its ID.
     * @param {Object} params - The parameters.
     * @param {string} params.pool - The pool ID. This is the asset name of a pool's NFT and LP tokens. It can also be acquired by calling pool.id.
     * @returns {PoolState | null} - Returns the pool or null if not found.
     */
    getPoolById({ id, }: GetPoolByIdParams): Promise<PoolState | null>;
    getPoolHistory({ id, page, count, order, }: GetPoolHistoryParams): Promise<PoolHistory[]>;
    /**
     * Get pool state in a transaction.
     * @param {Object} params - The parameters.
     * @param {string} params.txHash - The transaction hash containing pool output. One of the way to acquire is by calling getPoolHistory.
     * @returns {PoolState} - Returns the pool state or null if the transaction doesn't contain pool.
     */
    getPoolInTx({ txHash, }: GetPoolInTxParams): Promise<PoolState | null>;
    getAssetDecimals(asset: string): Promise<number>;
    /**
     * Get pool price.
     * @param {Object} params - The parameters to calculate pool price.
     * @param {string} params.pool - The pool we want to get price.
     * @param {string} [params.decimalsA] - The decimals of assetA in pool, if undefined then query from Blockfrost.
     * @param {string} [params.decimalsB] - The decimals of assetB in pool, if undefined then query from Blockfrost.
     * @returns {[string, string]} - Returns a pair of asset A/B price and B/A price, adjusted to decimals.
     */
    getPoolPrice({ pool, decimalsA, decimalsB, }: GetPoolPriceParams): Promise<[Big, Big]>;
    getOrderUTxO(orderId: string): Promise<any>;
    getDatumFromDatumHash(datumHash: string): Promise<string>;
}
