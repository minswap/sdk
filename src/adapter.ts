import {
  BlockFrostAPI,
  BlockfrostServerError,
} from "@blockfrost/blockfrost-js";
import { PaginationOptions } from "@blockfrost/blockfrost-js/lib/types";
import Big from "big.js";

import { POOL_ADDRESS } from "./constants";
import { isValidPoolUtxo, PoolState } from "./pool";
import { NetworkId } from "./types";

export type BlockfrostAdapterOptions = {
  projectId: string;
  networkId?: NetworkId;
};

export type GetPoolsParams = Omit<PaginationOptions, "page"> & {
  page: number;
};

export type GetPoolPriceParams = {
  pool: PoolState;
  decimalsA?: number;
  decimalsB?: number;
};

export class BlockfrostAdapter {
  private readonly networkId: NetworkId;
  private readonly api: BlockFrostAPI;

  constructor({
    projectId,
    networkId = NetworkId.MAINNET,
  }: BlockfrostAdapterOptions) {
    this.networkId = networkId;
    this.api = new BlockFrostAPI({
      projectId,
      isTestnet: networkId === NetworkId.TESTNET,
    });
  }

  /**
   *
   * @returns The latest pools or empty array if current page is after last page
   */
  public async getPools({
    page,
    count = 100,
    order = "asc",
  }: GetPoolsParams): Promise<PoolState[]> {
    const utxos = await this.api.addressesUtxos(POOL_ADDRESS[this.networkId], {
      count,
      order,
      page,
    });
    return utxos.filter(isValidPoolUtxo).map((utxo) => new PoolState(utxo));
  }

  private async getAssetDecimals(asset: string): Promise<number> {
    try {
      const assetAInfo = await this.api.assetsById(asset);
      return assetAInfo.metadata?.decimals ?? 0;
    } catch (err) {
      if (err instanceof BlockfrostServerError && err.status_code === 404) {
        return 0;
      }
      throw err;
    }
  }

  /**
   * Get pool price.
   * @param {Object} params - The parameters to calculate pool price.
   * @param {string} params.pool - The pool we want to get price.
   * @param {string} [params.decimalsA] - The decimals of assetA in pool, if undefined the query from Blockfrost.
   * @param {string} [params.decimalsB] - The decimals of assetB in pool, if undefined the query from Blockfrost.
   * @returns {[string, string]} - Returns a pair of asset A/B price and B/A price, adjusted to decimals.
   */
  public async getPoolPrice({
    pool,
    decimalsA,
    decimalsB,
  }: GetPoolPriceParams): Promise<[string, string]> {
    if (decimalsA === undefined) {
      decimalsA = await this.getAssetDecimals(pool.assetA);
    }
    if (decimalsB === undefined) {
      decimalsB = await this.getAssetDecimals(pool.assetB);
    }
    const adjustedReserveA = Big(pool.reserveA.toString()).div(
      Big(10).pow(decimalsA)
    );
    const adjustedReserveB = Big(pool.reserveB.toString()).div(
      Big(10).pow(decimalsB)
    );
    const priceAB = adjustedReserveA.div(adjustedReserveB).toString();
    const priceBA = adjustedReserveB.div(adjustedReserveA).toString();
    return [priceAB, priceBA];
  }
}
