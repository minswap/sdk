import {
  BlockFrostAPI,
  BlockfrostServerError,
  Responses,
} from "@blockfrost/blockfrost-js";
import { PaginationOptions } from "@blockfrost/blockfrost-js/lib/types";
import invariant from "@minswap/tiny-invariant";
import * as Prisma from "@prisma/client";
import Big from "big.js";
import JSONBig from "json-bigint";
import {
  C,
  fromHex,
  SLOT_CONFIG_NETWORK,
  slotToBeginUnixTime,
} from "lucid-cardano";

import { StableswapCalculation } from "./calculate";
import { PostgresRepositoryReader } from "./syncer/repository/postgres-repository";
import { Asset } from "./types/asset";
import {
  DexV1Constant,
  DexV2Constant,
  LbeV2Constant,
  StableswapConstant,
} from "./types/constants";
import { FactoryV2 } from "./types/factory";
import { LbeV2Types } from "./types/lbe-v2";
import { NetworkEnvironment, NetworkId } from "./types/network";
import { PoolV1, PoolV2, StablePool } from "./types/pool";
import {
  checkValidPoolOutput,
  isValidPoolOutput,
  normalizeAssets,
} from "./types/pool.internal";
import { StringUtils } from "./types/string";
import { TxHistory, TxIn, Value } from "./types/tx.internal";
import { getScriptHashFromAddress } from "./utils/address-utils.internal";
import { networkEnvToLucidNetwork } from "./utils/network.internal";

export type GetPoolInTxParams = {
  txHash: string;
};

export type GetPoolByIdParams = {
  id: string;
};

export type GetPoolsParams = Omit<PaginationOptions, "page"> & {
  page: number;
};

export type GetV1PoolHistoryParams = PaginationOptions & {
  id: string;
};

export type GetV2PoolHistoryParams = PaginationOptions &
  (
    | {
        assetA: Asset;
        assetB: Asset;
      }
    | {
        lpAsset: Asset;
      }
  );

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

export type GetStablePoolHistoryParams = PaginationOptions & {
  lpAsset: Asset;
};

export type GetStablePoolPriceParams = {
  pool: StablePool.State;
  assetAIndex: number;
  assetBIndex: number;
};

interface Adapter {
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
  getV1Pools(params: GetPoolsParams): Promise<PoolV1.State[]>;

  getV1PoolHistory(params: GetV1PoolHistoryParams): Promise<TxHistory[]>;

  /**
   * Get pool price.
   * @param {Object} params - The parameters to calculate pool price.
   * @param {string} params.pool - The pool we want to get price.
   * @param {string} [params.decimalsA] - The decimals of assetA in pool, if undefined then query from Blockfrost.
   * @param {string} [params.decimalsB] - The decimals of assetB in pool, if undefined then query from Blockfrost.
   * @returns {[string, string]} - Returns a pair of asset A/B price and B/A price, adjusted to decimals.
   */
  getV1PoolPrice(params: GetPoolPriceParams): Promise<[Big, Big]>;

  getAllV2Pools(): Promise<{ pools: PoolV2.State[]; errors: unknown[] }>;

  getV2Pools(
    params: GetPoolsParams
  ): Promise<{ pools: PoolV2.State[]; errors: unknown[] }>;

  getV2PoolByPair(assetA: Asset, assetB: Asset): Promise<PoolV2.State | null>;

  getV2PoolByLp(lpAsset: Asset): Promise<PoolV2.State | null>;

  getV2PoolHistory(params: GetV2PoolHistoryParams): Promise<PoolV2.State[]>;

  /**
   * Get pool price.
   * @param {Object} params - The parameters to calculate pool price.
   * @param {string} params.pool - The pool we want to get price.
   * @param {string} [params.decimalsA] - The decimals of assetA in pool, if undefined then query from Blockfrost.
   * @param {string} [params.decimalsB] - The decimals of assetB in pool, if undefined then query from Blockfrost.
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

  getStablePoolHistory(
    params: GetStablePoolHistoryParams
  ): Promise<StablePool.State[]>;

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
}

export class BlockfrostAdapter implements Adapter {
  protected readonly networkId: NetworkId;
  private readonly blockFrostApi: BlockFrostAPI;

  constructor(networkId: NetworkId, blockFrostApi: BlockFrostAPI) {
    this.networkId = networkId;
    this.blockFrostApi = blockFrostApi;
  }

  public async getAssetDecimals(asset: string): Promise<number> {
    if (asset === "lovelace") {
      return 6;
    }
    try {
      const assetAInfo = await this.blockFrostApi.assetsById(asset);
      return assetAInfo.metadata?.decimals ?? 0;
    } catch (err) {
      if (err instanceof BlockfrostServerError && err.status_code === 404) {
        return 0;
      }
      throw err;
    }
  }

  public async getDatumByDatumHash(datumHash: string): Promise<string> {
    const scriptsDatum = await this.blockFrostApi.scriptsDatumCbor(datumHash);
    return scriptsDatum.cbor;
  }

  public async currentSlot(): Promise<number> {
    const latestBlock = await this.blockFrostApi.blocksLatest();
    return latestBlock.slot ?? 0;
  }

  public async getV1PoolInTx({
    txHash,
  }: GetPoolInTxParams): Promise<PoolV1.State | null> {
    const poolTx = await this.blockFrostApi.txsUtxos(txHash);
    const poolUtxo = poolTx.outputs.find(
      (o: (typeof poolTx.outputs)[number]) =>
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

    const txIn: TxIn = { txHash: txHash, index: poolUtxo.output_index };
    return new PoolV1.State(
      poolUtxo.address,
      txIn,
      poolUtxo.amount,
      poolUtxo.data_hash
    );
  }

  public async getV1PoolById({
    id,
  }: GetPoolByIdParams): Promise<PoolV1.State | null> {
    const nft = `${DexV1Constant.POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.blockFrostApi.assetsTransactions(nft, {
      count: 1,
      page: 1,
      order: "desc",
    });
    if (nftTxs.length === 0) {
      return null;
    }
    return this.getV1PoolInTx({ txHash: nftTxs[0].tx_hash });
  }

  public async getV1Pools({
    page,
    count = 100,
    order = "asc",
  }: GetPoolsParams): Promise<PoolV1.State[]> {
    const utxos = await this.blockFrostApi.addressesUtxos(
      DexV1Constant.POOL_SCRIPT_HASH,
      { count, order, page }
    );
    return utxos
      .filter((utxo: (typeof utxos)[number]) =>
        isValidPoolOutput(utxo.address, utxo.amount, utxo.data_hash)
      )
      .map((utxo: (typeof utxos)[number]) => {
        invariant(
          utxo.data_hash,
          `expect pool to have datum hash, got ${utxo.data_hash}`
        );
        const txIn: TxIn = { txHash: utxo.tx_hash, index: utxo.output_index };
        return new PoolV1.State(
          utxo.address,
          txIn,
          utxo.amount,
          utxo.data_hash
        );
      });
  }

  public async getV1PoolHistory({
    id,
    page = 1,
    count = 100,
    order = "desc",
  }: GetV1PoolHistoryParams): Promise<TxHistory[]> {
    const nft = `${DexV1Constant.POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.blockFrostApi.assetsTransactions(nft, {
      count,
      page,
      order,
    });
    return nftTxs.map(
      (tx: (typeof nftTxs)[number]): TxHistory => ({
        txHash: tx.tx_hash,
        txIndex: tx.tx_index,
        blockHeight: tx.block_height,
        time: new Date(Number(tx.block_time) * 1000),
      })
    );
  }

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

  public async getAllV2Pools(): Promise<{
    pools: PoolV2.State[];
    errors: unknown[];
  }> {
    const v2Config = DexV2Constant.CONFIG[this.networkId];
    const utxos = await this.blockFrostApi.addressesUtxosAssetAll(
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
    const utxos = await this.blockFrostApi.addressesUtxosAsset(
      v2Config.poolScriptHashBech32,
      v2Config.poolAuthenAsset,
      { count, order, page }
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

  public async getV2PoolHistory(
    _params: GetV2PoolHistoryParams
  ): Promise<PoolV2.State[]> {
    throw Error("Not supported yet. Please use MinswapAdapter");
  }

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

  public async getAllFactoriesV2(): Promise<{
    factories: FactoryV2.State[];
    errors: unknown[];
  }> {
    const v2Config = DexV2Constant.CONFIG[this.networkId];
    const utxos = await this.blockFrostApi.addressesUtxosAssetAll(
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

  private async parseStablePoolState(
    utxo: Responses["address_utxo_content"][0]
  ): Promise<StablePool.State> {
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
      const utxos = await this.blockFrostApi.addressesUtxosAll(poolAddr);
      try {
        for (const utxo of utxos) {
          const pool = await this.parseStablePoolState(utxo);
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

  public async getStablePoolByLpAsset(
    lpAsset: Asset
  ): Promise<StablePool.State | null> {
    const config = StableswapConstant.CONFIG[this.networkId].find(
      (cfg) => cfg.lpAsset === Asset.toString(lpAsset)
    );
    invariant(
      config,
      `getStablePoolByLpAsset: Can not find stableswap config by LP Asset ${Asset.toString(
        lpAsset
      )}`
    );
    const poolUtxos = await this.blockFrostApi.addressesUtxosAssetAll(
      config.poolAddress,
      config.nftAsset
    );
    if (poolUtxos.length === 1) {
      const poolUtxo = poolUtxos[0];
      return await this.parseStablePoolState(poolUtxo);
    }
    return null;
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
    const poolUtxos = await this.blockFrostApi.addressesUtxosAssetAll(
      poolAddress,
      Asset.toString(nft)
    );
    if (poolUtxos.length === 1) {
      const poolUtxo = poolUtxos[0];
      return await this.parseStablePoolState(poolUtxo);
    }
    return null;
  }

  getStablePoolHistory(
    _params: GetStablePoolHistoryParams
  ): Promise<StablePool.State[]> {
    throw Error("Not supported yet. Please use MinswapAdapter");
  }

  public getStablePoolPrice({
    pool,
    assetAIndex,
    assetBIndex,
  }: GetStablePoolPriceParams): Big {
    const config = pool.config;
    const [priceNum, priceDen] = StableswapCalculation.getPrice(
      pool.datum.balances,
      config.multiples,
      pool.amp,
      assetAIndex,
      assetBIndex
    );

    return Big(priceNum.toString()).div(priceDen.toString());
  }

  // MARK: LBE V2
  public async getAllLbeV2Factories(): Promise<{
    factories: LbeV2Types.FactoryState[];
    errors: unknown[];
  }> {
    const v2Config = LbeV2Constant.CONFIG[this.networkId];
    const utxos = await this.blockFrostApi.addressesUtxosAssetAll(
      v2Config.factoryHashBech32,
      v2Config.factoryAsset
    );

    const factories: LbeV2Types.FactoryState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxos) {
      try {
        if (!utxo.inline_datum) {
          throw new Error(
            `Cannot find datum of LBE V2 Factory, tx: ${utxo.tx_hash}`
          );
        }

        const factory = new LbeV2Types.FactoryState(
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

  public async getLbeV2Factory(
    baseAsset: Asset,
    raiseAsset: Asset
  ): Promise<LbeV2Types.FactoryState | null> {
    const factoryIdent = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
    const { factories: allFactories } = await this.getAllLbeV2Factories();
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

  public async getLbeV2HeadAndTailFactory(lbeId: string): Promise<{
    head: LbeV2Types.FactoryState;
    tail: LbeV2Types.FactoryState;
  } | null> {
    const { factories: allFactories } = await this.getAllLbeV2Factories();
    let head: LbeV2Types.FactoryState | undefined = undefined;
    let tail: LbeV2Types.FactoryState | undefined = undefined;
    for (const factory of allFactories) {
      if (factory.head === lbeId) {
        tail = factory;
      }
      if (factory.tail === lbeId) {
        head = factory;
      }
    }
    if (head === undefined || tail === undefined) {
      return null;
    }
    return { head, tail };
  }

  public async getAllLbeV2Treasuries(): Promise<{
    treasuries: LbeV2Types.TreasuryState[];
    errors: unknown[];
  }> {
    const v2Config = LbeV2Constant.CONFIG[this.networkId];
    const utxos = await this.blockFrostApi.addressesUtxosAssetAll(
      v2Config.treasuryHashBech32,
      v2Config.treasuryAsset
    );

    const treasuries: LbeV2Types.TreasuryState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxos) {
      try {
        if (!utxo.inline_datum) {
          throw new Error(
            `Cannot find datum of LBE V2 Treasury, tx: ${utxo.tx_hash}`
          );
        }

        const treasury = new LbeV2Types.TreasuryState(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.output_index },
          utxo.amount,
          utxo.inline_datum
        );
        treasuries.push(treasury);
      } catch (err) {
        errors.push(err);
      }
    }
    return {
      treasuries: treasuries,
      errors: errors,
    };
  }

  public async getLbeV2TreasuryByLbeId(
    lbeId: string
  ): Promise<LbeV2Types.TreasuryState | null> {
    const { treasuries: allTreasuries } = await this.getAllLbeV2Treasuries();
    for (const treasury of allTreasuries) {
      if (treasury.lbeId === lbeId) {
        return treasury;
      }
    }
    return null;
  }

  public async getAllLbeV2Managers(): Promise<{
    managers: LbeV2Types.ManagerState[];
    errors: unknown[];
  }> {
    const v2Config = LbeV2Constant.CONFIG[this.networkId];
    const utxos = await this.blockFrostApi.addressesUtxosAssetAll(
      v2Config.managerHashBech32,
      v2Config.managerAsset
    );

    const managers: LbeV2Types.ManagerState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxos) {
      try {
        if (!utxo.inline_datum) {
          throw new Error(
            `Cannot find datum of Lbe V2 Manager, tx: ${utxo.tx_hash}`
          );
        }

        const manager = new LbeV2Types.ManagerState(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.output_index },
          utxo.amount,
          utxo.inline_datum
        );
        managers.push(manager);
      } catch (err) {
        errors.push(err);
      }
    }
    return {
      managers: managers,
      errors: errors,
    };
  }

  public async getLbeV2ManagerByLbeId(
    lbeId: string
  ): Promise<LbeV2Types.ManagerState | null> {
    const { managers } = await this.getAllLbeV2Managers();
    for (const manager of managers) {
      if (manager.lbeId === lbeId) {
        return manager;
      }
    }
    return null;
  }

  public async getAllLbeV2Sellers(): Promise<{
    sellers: LbeV2Types.SellerState[];
    errors: unknown[];
  }> {
    const v2Config = LbeV2Constant.CONFIG[this.networkId];
    const utxos = await this.blockFrostApi.addressesUtxosAssetAll(
      v2Config.sellerHashBech32,
      v2Config.sellerAsset
    );

    const sellers: LbeV2Types.SellerState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxos) {
      try {
        if (!utxo.inline_datum) {
          throw new Error(
            `Cannot find datum of Lbe V2 Seller, tx: ${utxo.tx_hash}`
          );
        }

        const seller = new LbeV2Types.SellerState(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.output_index },
          utxo.amount,
          utxo.inline_datum
        );
        sellers.push(seller);
      } catch (err) {
        errors.push(err);
      }
    }
    return {
      sellers: sellers,
      errors: errors,
    };
  }

  public async getLbeV2SellerByLbeId(
    lbeId: string
  ): Promise<LbeV2Types.SellerState | null> {
    const { sellers } = await this.getAllLbeV2Sellers();
    for (const seller of sellers) {
      if (seller.lbeId === lbeId) {
        return seller;
      }
    }
    return null;
  }

  public async getAllLbeV2Orders(): Promise<{
    orders: LbeV2Types.OrderState[];
    errors: unknown[];
  }> {
    const v2Config = LbeV2Constant.CONFIG[this.networkId];
    const utxos = await this.blockFrostApi.addressesUtxosAssetAll(
      v2Config.orderHashBech32,
      v2Config.orderAsset
    );

    const orders: LbeV2Types.OrderState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxos) {
      try {
        if (!utxo.inline_datum) {
          throw new Error(
            `Cannot find datum of Lbe V2 Order, tx: ${utxo.tx_hash}`
          );
        }

        const order = new LbeV2Types.OrderState(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.output_index },
          utxo.amount,
          utxo.inline_datum
        );
        orders.push(order);
      } catch (err) {
        errors.push(err);
      }
    }
    return {
      orders: orders,
      errors: errors,
    };
  }

  public async getLbeV2OrdersByLbeId(
    lbeId: string
  ): Promise<LbeV2Types.OrderState[]> {
    const { orders: allOrders } = await this.getAllLbeV2Orders();
    const orders: LbeV2Types.OrderState[] = [];
    for (const order of allOrders) {
      if (order.lbeId === lbeId) {
        orders.push(order);
      }
    }
    return orders;
  }
}

export type MinswapAdapterConstructor = {
  networkId: NetworkId;
  networkEnv: NetworkEnvironment;
  blockFrostApi: BlockFrostAPI;
  repository: PostgresRepositoryReader;
};

export class MinswapAdapter extends BlockfrostAdapter {
  private readonly networkEnv: NetworkEnvironment;
  private readonly repository: PostgresRepositoryReader;

  constructor({
    networkId,
    networkEnv,
    blockFrostApi,
    repository,
  }: MinswapAdapterConstructor) {
    super(networkId, blockFrostApi);
    this.networkEnv = networkEnv;
    this.repository = repository;
  }

  private prismaPoolV1ToPoolV1State(prismaPool: Prisma.PoolV1): PoolV1.State {
    const address = prismaPool.pool_address;
    const txIn: TxIn = {
      txHash: prismaPool.created_tx_id,
      index: prismaPool.created_tx_index,
    };
    const value: Value = JSONBig({
      alwaysParseAsBig: true,
      useNativeBigInt: true,
    }).parse(prismaPool.value);
    const datumHash = C.hash_plutus_data(
      C.PlutusData.from_bytes(fromHex(prismaPool.raw_datum))
    ).to_hex();
    return new PoolV1.State(address, txIn, value, datumHash);
  }

  override async getV1PoolInTx({
    txHash,
  }: GetPoolInTxParams): Promise<PoolV1.State | null> {
    const prismaPool = await this.repository.getPoolV1ByCreatedTxId(txHash);
    if (!prismaPool) {
      return null;
    }
    return this.prismaPoolV1ToPoolV1State(prismaPool);
  }

  override async getV1PoolById({
    id,
  }: GetPoolByIdParams): Promise<PoolV1.State | null> {
    const lpAsset = `${DexV1Constant.LP_POLICY_ID}${id}`;
    const prismaPool = await this.repository.getPoolV1ByLpAsset(lpAsset);
    if (!prismaPool) {
      return null;
    }
    return this.prismaPoolV1ToPoolV1State(prismaPool);
  }

  override async getV1Pools({
    page,
    count = 100,
    order = "asc",
  }: GetPoolsParams): Promise<PoolV1.State[]> {
    const prismaPools = await this.repository.getLastPoolV1State(
      page - 1,
      count,
      order
    );
    if (prismaPools.length === 0) {
      return [];
    }
    return prismaPools.map(this.prismaPoolV1ToPoolV1State);
  }

  override async getV1PoolHistory({
    id,
    page = 1,
    count = 100,
    order = "desc",
  }: GetV1PoolHistoryParams): Promise<TxHistory[]> {
    const lpAsset = `${DexV1Constant.LP_POLICY_ID}${id}`;
    const prismaPools = await this.repository.getHistoricalPoolV1ByLpAsset(
      lpAsset,
      page - 1,
      count,
      order
    );
    if (prismaPools.length === 0) {
      return [];
    }

    const network = networkEnvToLucidNetwork(this.networkEnv);
    return prismaPools.map(
      (prismaPool): TxHistory => ({
        txHash: prismaPool.created_tx_id,
        txIndex: prismaPool.created_tx_index,
        blockHeight: Number(prismaPool.block_id),
        time: new Date(
          slotToBeginUnixTime(
            Number(prismaPool.slot),
            SLOT_CONFIG_NETWORK[network]
          )
        ),
      })
    );
  }

  private prismaPoolV2ToPoolV2State(prismaPool: Prisma.PoolV2): PoolV2.State {
    const txIn: TxIn = {
      txHash: prismaPool.created_tx_id,
      index: prismaPool.created_tx_index,
    };
    const value: Value = JSONBig({
      alwaysParseAsBig: true,
      useNativeBigInt: true,
    }).parse(prismaPool.value);
    return new PoolV2.State(
      this.networkId,
      prismaPool.pool_address,
      txIn,
      value,
      prismaPool.raw_datum
    );
  }

  override async getAllV2Pools(): Promise<{
    pools: PoolV2.State[];
    errors: unknown[];
  }> {
    const prismaPools = await this.repository.getAllLastPoolV2State();
    return {
      pools: prismaPools.map((pool) => this.prismaPoolV2ToPoolV2State(pool)),
      errors: [],
    };
  }

  override async getV2Pools({
    page,
    count = 100,
    order = "asc",
  }: GetPoolsParams): Promise<{
    pools: PoolV2.State[];
    errors: unknown[];
  }> {
    const prismaPools = await this.repository.getLastPoolV2State(
      page - 1,
      count,
      order
    );
    return {
      pools: prismaPools.map((pool) => this.prismaPoolV2ToPoolV2State(pool)),
      errors: [],
    };
  }

  override async getV2PoolByPair(
    assetA: Asset,
    assetB: Asset
  ): Promise<PoolV2.State | null> {
    const prismaPool = await this.repository.getPoolV2ByPair(assetA, assetB);
    if (!prismaPool) {
      return null;
    }
    return this.prismaPoolV2ToPoolV2State(prismaPool);
  }

  override async getV2PoolByLp(lpAsset: Asset): Promise<PoolV2.State | null> {
    const prismaPool = await this.repository.getPoolV2ByLpAsset(lpAsset);
    if (!prismaPool) {
      return null;
    }
    return this.prismaPoolV2ToPoolV2State(prismaPool);
  }

  override async getV2PoolHistory(
    options: GetV2PoolHistoryParams
  ): Promise<PoolV2.State[]> {
    const { page = 1, count = 100, order = "desc" } = options;
    let lpAsset: string;
    if ("lpAsset" in options) {
      lpAsset = Asset.toString(options.lpAsset);
    } else {
      lpAsset = PoolV2.computeLPAssetName(options.assetA, options.assetB);
    }
    const prismaPools = await this.repository.getHistoricalPoolV2ByLpAsset(
      lpAsset,
      page - 1,
      count,
      order
    );
    if (prismaPools.length === 0) {
      return [];
    }

    return prismaPools.map((pool) => this.prismaPoolV2ToPoolV2State(pool));
  }

  private prismaStablePoolToStablePoolState(
    prismaPool: Prisma.StablePool
  ): StablePool.State {
    const txIn: TxIn = {
      txHash: prismaPool.created_tx_id,
      index: prismaPool.created_tx_index,
    };
    const value: Value = JSONBig({
      alwaysParseAsBig: true,
      useNativeBigInt: true,
    }).parse(prismaPool.value);
    return new StablePool.State(
      this.networkId,
      prismaPool.pool_address,
      txIn,
      value,
      prismaPool.raw_datum
    );
  }

  override async getAllStablePools(): Promise<{
    pools: StablePool.State[];
    errors: unknown[];
  }> {
    const prismaPools = await this.repository.getAllLastStablePoolState();
    return {
      pools: prismaPools.map((pool) =>
        this.prismaStablePoolToStablePoolState(pool)
      ),
      errors: [],
    };
  }

  override async getStablePoolByNFT(
    nft: Asset
  ): Promise<StablePool.State | null> {
    const config = StableswapConstant.CONFIG[this.networkId].find(
      (cfg) => cfg.nftAsset === Asset.toString(nft)
    );
    if (!config) {
      throw new Error(
        `Cannot find Stable Pool having NFT ${Asset.toString(nft)}`
      );
    }

    const prismaStablePool = await this.repository.getStablePoolByLpAsset(
      config.lpAsset
    );
    if (!prismaStablePool) {
      return null;
    }
    return this.prismaStablePoolToStablePoolState(prismaStablePool);
  }

  override async getStablePoolByLpAsset(
    lpAsset: Asset
  ): Promise<StablePool.State | null> {
    const config = StableswapConstant.CONFIG[this.networkId].find(
      (cfg) => cfg.lpAsset === Asset.toString(lpAsset)
    );
    if (!config) {
      throw new Error(
        `Cannot find Stable Pool having NFT ${Asset.toString(lpAsset)}`
      );
    }

    const prismaStablePool = await this.repository.getStablePoolByLpAsset(
      config.lpAsset
    );
    if (!prismaStablePool) {
      return null;
    }
    return this.prismaStablePoolToStablePoolState(prismaStablePool);
  }

  override async getStablePoolHistory({
    lpAsset,
    page = 1,
    count = 100,
    order = "desc",
  }: GetStablePoolHistoryParams): Promise<StablePool.State[]> {
    const prismaPools = await this.repository.getHistoricalStablePoolsByLpAsset(
      Asset.toString(lpAsset),
      page - 1,
      count,
      order
    );
    if (prismaPools.length === 0) {
      return [];
    }

    return prismaPools.map((pool) =>
      this.prismaStablePoolToStablePoolState(pool)
    );
  }
}
