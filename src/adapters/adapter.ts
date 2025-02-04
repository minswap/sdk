import Big from "big.js";

import { Asset } from "../types/asset";
import { FactoryV2 } from "../types/factory";
import { LbeV2Types } from "../types/lbe-v2";
import { PoolV1, PoolV2, StablePool } from "../types/pool";
import { TxHistory } from "../types/tx.internal";

export type PaginationByPage = {
  page?: number
  count?: number
  order?: "asc" | "desc"
}

export type PaginationByCursor = {
  cursor?: string
  count?: number
  order?: "asc" | "desc"
}

export type Pagination = PaginationByPage | PaginationByCursor

export type GetPoolByIdParams = {
  id: string;
};

export type GetPoolInTxParams = {
  txHash: string;
};

export type GetPoolPriceParams = {
  pool: PoolV1.State;
  decimalsA?: number;
  decimalsB?: number;
};

export type GetStablePoolPriceParams = {
  pool: StablePool.State;
  assetAIndex: number;
  assetBIndex: number;
};

export type GetV1PoolHistoryParams = {
  id: string;
};

export type GetV2PoolPriceParams = {
  pool: PoolV2.State;
  decimalsA?: number;
  decimalsB?: number;
};

export interface Adapter {
  getAssetDecimals(asset: string): Promise<number>;

  getDatumByDatumHash(datumHash: string): Promise<string>;

  currentSlot(): Promise<number>;

  /**
   * Get pool state in a transaction.
   * @param {Object} params - The parameters.
   * @param {string} params.txHash - The transaction hash containing pool output. One of the way to acquire is by calling getPoolHistory.
   * @returns {PoolV1.State} - Returns the pool state or null if the transaction doesn't contain pool.
   */
  getV1PoolInTx({ txHash }: GetPoolInTxParams): Promise<PoolV1.State | null>;

  /**
   * Get a specific pool by its ID.
   * @param {Object} params - The parameters.
   * @param {string} params.pool - The pool ID. This is the asset name of a pool's NFT and LP tokens. It can also be acquired by calling pool.id.
   * @returns {PoolV1.State | null} - Returns the pool or null if not found.
   */
  getV1PoolById({ id }: GetPoolByIdParams): Promise<PoolV1.State | null>;

  /**
   * @returns The latest pools or empty array if current page is after last page
   */
  getV1Pools(pagination: Pagination): Promise<PoolV1.State[]>;

  getV1PoolHistory(pagination: Pagination, params: GetV1PoolHistoryParams): Promise<TxHistory[]>;

  /**
   * Get pool price.
   * @param {Object} params - The parameters to calculate pool price.
   * @param {string} params.pool - The pool we want to get price.
   * @param {string} [params.decimalsA] - The decimals of assetA in pool, if undefined then query from the adapter.
   * @param {string} [params.decimalsB] - The decimals of assetB in pool, if undefined then query from the adapter.
   * @returns {[string, string]} - Returns a pair of asset A/B price and B/A price, adjusted to decimals.
   */
  getV1PoolPrice(params: GetPoolPriceParams): Promise<[Big, Big]>;

  getAllV2Pools(): Promise<{ pools: PoolV2.State[]; errors: unknown[] }>;

  getV2Pools(
    pagination: Pagination
  ): Promise<{ pools: PoolV2.State[]; errors: unknown[] }>;

  getV2PoolByPair(assetA: Asset, assetB: Asset): Promise<PoolV2.State | null>;

  getV2PoolByLp(lpAsset: Asset): Promise<PoolV2.State | null>;

  /**
   * Get pool price.
   * @param {Object} params - The parameters to calculate pool price.
   * @param {string} params.pool - The pool we want to get price.
   * @param {string} [params.decimalsA] - The decimals of assetA in pool, if undefined then query from the adapter.
   * @param {string} [params.decimalsB] - The decimals of assetB in pool, if undefined then query from the adapter.
   * @returns {[string, string]} - Returns a pair of asset A/B price and B/A price, adjusted to decimals.
   */
  getV2PoolPrice(params: GetV2PoolPriceParams): Promise<[Big, Big]>;

  getAllFactoriesV2(): Promise<{
    factories: FactoryV2.State[];
    errors: unknown[];
  }>;

  getFactoryV2ByPair(
    assetA: Asset,
    assetB: Asset
  ): Promise<FactoryV2.State | null>;

  getAllStablePools(): Promise<{
    pools: StablePool.State[];
    errors: unknown[];
  }>;

  getStablePoolByLpAsset(lpAsset: Asset): Promise<StablePool.State | null>;

  getStablePoolByNFT(nft: Asset): Promise<StablePool.State | null>;

  /**
   * Get stable pool price.
   *
   * A Stable Pool can contain more than two assets, so we need to specify which assets we want to retrieve the price against by using assetAIndex and assetBIndex.
   * @param {Object} params - The parameters to calculate pool price.
   * @param {string} params.pool - The pool we want to get price.
   * @param {number} params.assetAIndex
   * @param {number} params.assetBIndex
   * @returns {[string, string]} - Returns price of @assetA agains @assetB
   */
  getStablePoolPrice(params: GetStablePoolPriceParams): Big;

  getAllLbeV2Factories(): Promise<{
    factories: LbeV2Types.FactoryState[];
    errors: unknown[];
  }>;

  getLbeV2Factory(
    baseAsset: Asset,
    raiseAsset: Asset
  ): Promise<LbeV2Types.FactoryState | null>;

  getLbeV2HeadAndTailFactory(lbeId: string): Promise<{
    head: LbeV2Types.FactoryState;
    tail: LbeV2Types.FactoryState;
  } | null>;

  getAllLbeV2Treasuries(): Promise<{
    treasuries: LbeV2Types.TreasuryState[];
    errors: unknown[];
  }>;

  getLbeV2TreasuryByLbeId(
    lbeId: string
  ): Promise<LbeV2Types.TreasuryState | null>;

  getAllLbeV2Managers(): Promise<{
    managers: LbeV2Types.ManagerState[];
    errors: unknown[];
  }>;

  getLbeV2ManagerByLbeId(
    lbeId: string
  ): Promise<LbeV2Types.ManagerState | null>;

  getAllLbeV2Sellers(): Promise<{
    sellers: LbeV2Types.SellerState[];
    errors: unknown[];
  }>;

  getLbeV2SellerByLbeId(lbeId: string): Promise<LbeV2Types.SellerState | null>;

  getAllLbeV2Orders(): Promise<{
    orders: LbeV2Types.OrderState[];
    errors: unknown[];
  }>;

  getLbeV2OrdersByLbeId(lbeId: string): Promise<LbeV2Types.OrderState[]>;

  getLbeV2OrdersByLbeIdAndOwner(
    lbeId: string,
    owner: string
  ): Promise<LbeV2Types.OrderState[]>;
}
