import {
  BlockFrostAPI,
  BlockfrostServerError,
} from "@blockfrost/blockfrost-js";
import { PaginationOptions } from "@blockfrost/blockfrost-js/lib/types";
import invariant from "@minswap/tiny-invariant";
import Big from "big.js";

import { Asset } from "./types/asset";
import {
  DexV1Constant,
  DexV2Constant,
  StableswapConstant,
} from "./types/constants";
import { FactoryV2 } from "./types/factory";
import { NetworkId } from "./types/network";
import { PoolV1, PoolV2, StablePool } from "./types/pool";
import {
  checkValidPoolOutput,
  isValidPoolOutput,
  normalizeAssets,
} from "./types/pool.internal";
import { StringUtils } from "./types/string";
import { TxHistory } from "./types/tx.internal";
import { getScriptHashFromAddress } from "./utils/address-utils.internal";

export type BlockfrostAdapterOptions = {
  networkId: NetworkId;
  blockFrost: BlockFrostAPI;
};

export type GetPoolsParams = Omit<PaginationOptions, "page"> & {
  page: number;
};

export type GetPoolByIdParams = {
  id: string;
};

export type GetPoolPriceParams = {
  pool: PoolV1.State;
  decimalsA?: number;
  decimalsB?: number;
};

export type GetV2PoolPriceParams = {
  pool: PoolV2.State;
  decimalsA?: number;
  decimalsB?: number;
};

export type GetPoolHistoryParams = PaginationOptions & {
  id: string;
};

export type GetPoolInTxParams = {
  txHash: string;
};

export type GetStablePoolInTxParams = {
  networkId: NetworkId;
  txHash: string;
};

export class BlockfrostAdapter {
  private readonly api: BlockFrostAPI;
  private readonly networkId: NetworkId;

  constructor({ networkId, blockFrost }: BlockfrostAdapterOptions) {
    this.networkId = networkId;
    this.api = blockFrost;
  }

  /**
   * @returns The latest pools or empty array if current page is after last page
   */
  public async getV1Pools({
    page,
    count = 100,
    order = "asc",
  }: GetPoolsParams): Promise<PoolV1.State[]> {
    const utxos = await this.api.addressesUtxos(
      DexV1Constant.POOL_SCRIPT_HASH,
      {
        count,
        order,
        page,
      }
    );
    return utxos
      .filter((utxo) =>
        isValidPoolOutput(utxo.address, utxo.amount, utxo.data_hash)
      )
      .map((utxo) => {
        invariant(
          utxo.data_hash,
          `expect pool to have datum hash, got ${utxo.data_hash}`
        );
        return new PoolV1.State(
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
   * @returns {PoolV1.State | null} - Returns the pool or null if not found.
   */
  public async getV1PoolById({
    id,
  }: GetPoolByIdParams): Promise<PoolV1.State | null> {
    const nft = `${DexV1Constant.POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.api.assetsTransactions(nft, {
      count: 1,
      page: 1,
      order: "desc",
    });
    if (nftTxs.length === 0) {
      return null;
    }
    return this.getV1PoolInTx({ txHash: nftTxs[0].tx_hash });
  }

  public async getV1PoolHistory({
    id,
    page = 1,
    count = 100,
    order = "desc",
  }: GetPoolHistoryParams): Promise<TxHistory[]> {
    const nft = `${DexV1Constant.POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.api.assetsTransactions(nft, {
      count,
      page,
      order,
    });
    return nftTxs.map(
      (tx): TxHistory => ({
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
   * @returns {PoolV1.State} - Returns the pool state or null if the transaction doesn't contain pool.
   */
  public async getV1PoolInTx({
    txHash,
  }: GetPoolInTxParams): Promise<PoolV1.State | null> {
    const poolTx = await this.api.txsUtxos(txHash);
    const poolUtxo = poolTx.outputs.find(
      (o) =>
        getScriptHashFromAddress(o.address) === DexV1Constant.POOL_SCRIPT_HASH
    );
    if (!poolUtxo) {
      return null;
    }
    checkValidPoolOutput(poolUtxo.address, poolUtxo.amount, poolUtxo.data_hash);
    invariant(
      poolUtxo.data_hash,
      `expect pool to have datum hash, got ${poolUtxo.data_hash}`
    );
    return new PoolV1.State(
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
  public async getV1PoolPrice({
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

  public async getAllV2Pools(): Promise<{
    pools: PoolV2.State[];
    errors: unknown[];
  }> {
    const v2Config = DexV2Constant.CONFIG[this.networkId];
    const utxos = await this.api.addressesUtxosAssetAll(
      v2Config.poolScriptHashBech32,
      v2Config.poolAuthenAsset
    );

    const pools: PoolV2.State[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxos) {
      try {
        if (!utxo.inline_datum) {
          throw new Error(`Cannot find datum of Pool V2, tx: ${utxo.tx_hash}`);
        }
        const pool = new PoolV2.State(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.output_index },
          utxo.amount,
          utxo.inline_datum
        );
        pools.push(pool);
      } catch (err) {
        errors.push(err);
      }
    }
    return {
      pools: pools,
      errors: errors,
    };
  }

  public async getV2Pools({
    page,
    count = 100,
    order = "asc",
  }: GetPoolsParams): Promise<{
    pools: PoolV2.State[];
    errors: unknown[];
  }> {
    const v2Config = DexV2Constant.CONFIG[this.networkId];
    const utxos = await this.api.addressesUtxosAsset(
      v2Config.poolScriptHashBech32,
      v2Config.poolAuthenAsset,
      {
        count,
        order,
        page,
      }
    );

    const pools: PoolV2.State[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxos) {
      try {
        if (!utxo.inline_datum) {
          throw new Error(`Cannot find datum of Pool V2, tx: ${utxo.tx_hash}`);
        }
        const pool = new PoolV2.State(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.output_index },
          utxo.amount,
          utxo.inline_datum
        );
        pools.push(pool);
      } catch (err) {
        errors.push(err);
      }
    }
    return {
      pools: pools,
      errors: errors,
    };
  }

  public async getV2PoolByPair(
    assetA: Asset,
    assetB: Asset
  ): Promise<PoolV2.State | null> {
    const [normalizedAssetA, normalizedAssetB] = normalizeAssets(
      Asset.toString(assetA),
      Asset.toString(assetB)
    );
    const { pools: allPools } = await this.getAllV2Pools();
    return (
      allPools.find(
        (pool) =>
          pool.assetA === normalizedAssetA && pool.assetB === normalizedAssetB
      ) ?? null
    );
  }

  public async getV2PoolByLp(lpAsset: Asset): Promise<PoolV2.State | null> {
    const { pools: allPools } = await this.getAllV2Pools();
    return (
      allPools.find((pool) => Asset.compare(pool.lpAsset, lpAsset) === 0) ??
      null
    );
  }

  /**
   * Get pool price.
   * @param {Object} params - The parameters to calculate pool price.
   * @param {string} params.pool - The pool we want to get price.
   * @param {string} [params.decimalsA] - The decimals of assetA in pool, if undefined then query from Blockfrost.
   * @param {string} [params.decimalsB] - The decimals of assetB in pool, if undefined then query from Blockfrost.
   * @returns {[string, string]} - Returns a pair of asset A/B price and B/A price, adjusted to decimals.
   */
  public async getV2PoolPrice({
    pool,
    decimalsA,
    decimalsB,
  }: GetV2PoolPriceParams): Promise<[Big, Big]> {
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

  public async getAllStablePools(): Promise<{
    pools: StablePool.State[];
    errors: unknown[];
  }> {
    const poolAddresses = StableswapConstant.CONFIG[this.networkId].map(
      (cfg) => cfg.poolAddress
    );
    const pools: StablePool.State[] = [];
    const errors: unknown[] = [];
    for (const poolAddr of poolAddresses) {
      const utxos = await this.api.addressesUtxosAll(poolAddr);
      try {
        for (const utxo of utxos) {
          let datum: string;
          if (utxo.inline_datum) {
            datum = utxo.inline_datum;
          } else if (utxo.data_hash) {
            datum = await this.getDatumByDatumHash(utxo.data_hash);
          } else {
            throw new Error("Cannot find datum of Stable Pool");
          }
          const pool = new StablePool.State(
            this.networkId,
            utxo.address,
            { txHash: utxo.tx_hash, index: utxo.output_index },
            utxo.amount,
            datum
          );
          pools.push(pool);
        }
      } catch (err) {
        errors.push(err);
      }
    }

    return {
      pools: pools,
      errors: errors,
    };
  }

  public async getStablePoolByNFT(
    nft: Asset
  ): Promise<StablePool.State | null> {
    const poolAddress = StableswapConstant.CONFIG[this.networkId].find(
      (cfg) => cfg.nftAsset === Asset.toString(nft)
    )?.poolAddress;
    if (!poolAddress) {
      throw new Error(
        `Cannot find Stable Pool having NFT ${Asset.toString(nft)}`
      );
    }
    const utxos = await this.api.addressesUtxosAssetAll(
      poolAddress,
      Asset.toString(nft)
    );
    for (const utxo of utxos) {
      let datum: string;
      if (utxo.inline_datum) {
        datum = utxo.inline_datum;
      } else if (utxo.data_hash) {
        datum = await this.getDatumByDatumHash(utxo.data_hash);
      } else {
        throw new Error("Cannot find datum of Stable Pool");
      }
      const pool = new StablePool.State(
        this.networkId,
        utxo.address,
        { txHash: utxo.tx_hash, index: utxo.output_index },
        utxo.amount,
        datum
      );
      return pool;
    }

    return null;
  }

  public async getAllFactoriesV2(): Promise<{
    factories: FactoryV2.State[];
    errors: unknown[];
  }> {
    const v2Config = DexV2Constant.CONFIG[this.networkId];
    const utxos = await this.api.addressesUtxosAssetAll(
      v2Config.factoryScriptHashBech32,
      v2Config.factoryAsset
    );

    const factories: FactoryV2.State[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxos) {
      try {
        if (!utxo.inline_datum) {
          throw new Error(
            `Cannot find datum of Factory V2, tx: ${utxo.tx_hash}`
          );
        }
        const factory = new FactoryV2.State(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.output_index },
          utxo.amount,
          utxo.inline_datum
        );
        factories.push(factory);
      } catch (err) {
        errors.push(err);
      }
    }
    return {
      factories: factories,
      errors: errors,
    };
  }

  public async getFactoryV2ByPair(
    assetA: Asset,
    assetB: Asset
  ): Promise<FactoryV2.State | null> {
    const factoryIdent = PoolV2.computeLPAssetName(assetA, assetB);
    const { factories: allFactories } = await this.getAllFactoriesV2();
    for (const factory of allFactories) {
      if (
        StringUtils.compare(factory.head, factoryIdent) < 0 &&
        StringUtils.compare(factoryIdent, factory.tail) < 0
      ) {
        return factory;
      }
    }

    return null;
  }
}
