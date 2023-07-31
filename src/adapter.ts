import {
  BlockFrostAPI,
  BlockfrostServerError,
} from "@blockfrost/blockfrost-js";
import { PaginationOptions } from "@blockfrost/blockfrost-js/lib/types";
import invariant from "@minswap/tiny-invariant";
import Big from "big.js";

import { POOL_NFT_POLICY_ID, POOL_SCRIPT_HASH } from "./constants";
import { PoolHistory, PoolState } from "./types/pool";
import { checkValidPoolOutput, isValidPoolOutput } from "./types/pool.internal";
import { getScriptHashFromAddress } from "./utils/address-utils.internal";

export type BlockfrostAdapterOptions = {
  blockFrost: BlockFrostAPI;
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

export class BlockfrostAdapter {
  private readonly api: BlockFrostAPI;

  constructor({ blockFrost }: BlockfrostAdapterOptions) {
    this.api = blockFrost;
  }

  /**
   * @returns The latest pools or empty array if current page is after last page
   */
  public async getPools({
    page,
    count = 100,
    order = "asc",
  }: GetPoolsParams): Promise<PoolState[]> {
    const utxos = await this.api.addressesUtxos(POOL_SCRIPT_HASH, {
      count,
      order,
      page,
    });
    return utxos
      .filter((utxo) =>
        isValidPoolOutput(utxo.address, utxo.amount, utxo.data_hash)
      )
      .map((utxo) => {
        invariant(
          utxo.data_hash,
          `expect pool to have datum hash, got ${utxo.data_hash}`
        );
        return new PoolState(
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.output_index },
          utxo.amount,
          utxo.data_hash
        );
      });
  }

  /**
   * Get a specific pool by its ID.
   * @param {Object} params - The parameters.
   * @param {string} params.pool - The pool ID. This is the asset name of a pool's NFT and LP tokens. It can also be acquired by calling pool.id.
   * @returns {PoolState | null} - Returns the pool or null if not found.
   */
  public async getPoolById({
    id,
  }: GetPoolByIdParams): Promise<PoolState | null> {
    const nft = `${POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.api.assetsTransactions(nft, {
      count: 1,
      page: 1,
      order: "desc",
    });
    if (nftTxs.length === 0) {
      return null;
    }
    return this.getPoolInTx({ txHash: nftTxs[0].tx_hash });
  }

  public async getPoolHistory({
    id,
    page = 1,
    count = 100,
    order = "desc",
  }: GetPoolHistoryParams): Promise<PoolHistory[]> {
    const nft = `${POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.api.assetsTransactions(nft, {
      count,
      page,
      order,
    });
    return nftTxs.map(
      (tx): PoolHistory => ({
        txHash: tx.tx_hash,
        txIndex: tx.tx_index,
        blockHeight: tx.block_height,
        time: new Date(Number(tx.block_time) * 1000),
      })
    );
  }

  /**
   * Get pool state in a transaction.
   * @param {Object} params - The parameters.
   * @param {string} params.txHash - The transaction hash containing pool output. One of the way to acquire is by calling getPoolHistory.
   * @returns {PoolState} - Returns the pool state or null if the transaction doesn't contain pool.
   */
  public async getPoolInTx({
    txHash,
  }: GetPoolInTxParams): Promise<PoolState | null> {
    const poolTx = await this.api.txsUtxos(txHash);
    const poolUtxo = poolTx.outputs.find(
      (o) => getScriptHashFromAddress(o.address) === POOL_SCRIPT_HASH
    );
    if (!poolUtxo) {
      return null;
    }
    checkValidPoolOutput(poolUtxo.address, poolUtxo.amount, poolUtxo.data_hash);
    invariant(
      poolUtxo.data_hash,
      `expect pool to have datum hash, got ${poolUtxo.data_hash}`
    );
    return new PoolState(
      poolUtxo.address,
      { txHash: txHash, index: poolUtxo.output_index },
      poolUtxo.amount,
      poolUtxo.data_hash
    );
  }

  public async getAssetDecimals(asset: string): Promise<number> {
    if (asset === "lovelace") {
      return 6;
    }
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
   * @param {string} [params.decimalsA] - The decimals of assetA in pool, if undefined then query from Blockfrost.
   * @param {string} [params.decimalsB] - The decimals of assetB in pool, if undefined then query from Blockfrost.
   * @returns {[string, string]} - Returns a pair of asset A/B price and B/A price, adjusted to decimals.
   */
  public async getPoolPrice({
    pool,
    decimalsA,
    decimalsB,
  }: GetPoolPriceParams): Promise<[Big, Big]> {
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
    const priceAB = adjustedReserveA.div(adjustedReserveB);
    const priceBA = adjustedReserveB.div(adjustedReserveA);
    return [priceAB, priceBA];
  }

  public async getDatumByDatumHash(datumHash: string): Promise<string> {
    const scriptsDatum = await this.api.scriptsDatumCbor(datumHash);
    return scriptsDatum.cbor;
  }
}
