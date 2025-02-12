import {
  Asset as MaestroUtxoAsset,
  MaestroClient,
  UtxoWithSlot,
} from "@maestro-org/typescript-sdk";
import { UtxosByAddressQueryParams } from "@maestro-org/typescript-sdk/src/api/addresses/type";
import invariant from "@minswap/tiny-invariant";
import Big from "big.js";

import { PoolV1, PoolV2, StablePool } from "..";
import { StableswapCalculation } from "../calculate";
import { Asset } from "../types/asset";
import {
  DexV1Constant,
  DexV2Constant,
  LbeV2Constant,
  StableswapConstant,
} from "../types/constants";
import { FactoryV2 } from "../types/factory";
import { LbeV2Types } from "../types/lbe-v2";
import { NetworkId } from "../types/network";
import { OrderV2 } from "../types/order";
import {
  checkValidPoolOutput,
  isValidPoolOutput,
  normalizeAssets,
} from "../types/pool.internal";
import { StringUtils } from "../types/string";
import { TxHistory, TxIn, Value } from "../types/tx.internal";
import { getScriptHashFromAddress } from "../utils/address-utils.internal";
import {
  Adapter,
  GetPoolByIdParams,
  GetPoolInTxParams,
  GetPoolPriceParams,
  GetStablePoolPriceParams,
  GetV1PoolHistoryParams,
  GetV2PoolPriceParams,
  PaginationByCursor,
} from "./adapter";

export declare class MaestroServerError {
  code: number;
  error: string;
  message: string;
}

export class MaestroAdapter implements Adapter {
  protected readonly networkId: NetworkId;
  private readonly maestroClient: MaestroClient;

  constructor(networkId: NetworkId, maestroClient: MaestroClient) {
    this.networkId = networkId;
    this.maestroClient = maestroClient;
  }

  private mapMaestroAssetToValue(assets: MaestroUtxoAsset[]): Value {
    return assets.map((asset) => ({
      unit: asset.unit.toString(),
      quantity: asset.amount.toString(),
    }));
  }

  private async getAllUtxosDataByPaymentCred(credential: string, queryParams?: UtxosByAddressQueryParams): Promise<UtxoWithSlot[]> {
    let cursor: string | null | undefined = null;
    const utxosData: UtxoWithSlot[] = [];

    if (!queryParams) {
      queryParams = {};
    }

    do {
      queryParams.cursor = cursor;
      const utxos = await this.maestroClient.addresses.utxosByPaymentCred(
        credential,
        queryParams
      );
      utxosData.push(...utxos.data);
      cursor = utxos.next_cursor;
    } while (cursor);

    return utxosData;
  }

  public async getAssetDecimals(asset: string): Promise<number> {
    if (asset === "lovelace") {
      return 6;
    }
    try {
      const assetAInfo = await this.maestroClient.assets.assetInfo(asset);
      return assetAInfo.data.token_registry_metadata?.decimals ?? 0;
    } catch {
      return 0;
    }
  }

  public async getDatumByDatumHash(datumHash: string): Promise<string> {
    const scriptsDatum = await this.maestroClient.datum.lookupDatum(datumHash);
    return scriptsDatum.data.bytes;
  }

  public async currentSlot(): Promise<number> {
    const latestBlock = (await this.maestroClient.blocks.blockLatest()).data
      .absolute_slot;
    return latestBlock ?? 0;
  }

  public async getV1PoolInTx({
    txHash,
  }: GetPoolInTxParams): Promise<PoolV1.State | null> {
    const poolTx = await this.maestroClient.transactions.txInfo(txHash);
    const poolUtxo = poolTx.data.outputs.find(
      (o: (typeof poolTx.data.outputs)[number]) =>
        getScriptHashFromAddress(o.address) === DexV1Constant.POOL_SCRIPT_HASH
    );
    if (!poolUtxo) {
      return null;
    }

    const poolUtxoAmount = this.mapMaestroAssetToValue(poolUtxo.assets);
    const poolUtxoDatumHash = poolUtxo.datum?.hash ?? "";

    checkValidPoolOutput(poolUtxo.address, poolUtxoAmount, poolUtxoDatumHash);
    invariant(
      poolUtxoDatumHash,
      `expect pool to have datum hash, got ${poolUtxoDatumHash}`
    );

    const txIn: TxIn = { txHash: txHash, index: poolUtxo.index };
    return new PoolV1.State(
      poolUtxo.address,
      txIn,
      poolUtxoAmount,
      poolUtxoDatumHash
    );
  }

  public async getV1PoolById({
    id,
  }: GetPoolByIdParams): Promise<PoolV1.State | null> {
    const nft = `${DexV1Constant.POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.maestroClient.assets.assetTxs(nft, {
      count: 1,
      order: "desc",
    });
    if (nftTxs.data.length === 0) {
      return null;
    }
    return this.getV1PoolInTx({ txHash: nftTxs.data[0].tx_hash });
  }

  public async getV1Pools({
    cursor,
    count = 100,
    order = "asc",
  }: PaginationByCursor): Promise<PoolV1.State[]> {
    const utxosResponse = await this.maestroClient.addresses.utxosByPaymentCred(
      DexV1Constant.POOL_SCRIPT_HASH,
      { cursor, count, order }
    );
    const utxos = utxosResponse.data;
    return utxos
      .filter((utxo: (typeof utxos)[number]) =>
        isValidPoolOutput(
          utxo.address,
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.hash ?? ""
        )
      )
      .map((utxo: (typeof utxos)[number]) => {
        invariant(
          utxo.datum?.hash,
          `expect pool to have datum hash, got ${utxo.datum?.hash}`
        );
        const txIn: TxIn = { txHash: utxo.tx_hash, index: utxo.index };
        return new PoolV1.State(
          utxo.address,
          txIn,
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.hash
        );
      });
  }

  public async getV1PoolHistory(
    { cursor, count = 100, order = "desc" }: PaginationByCursor,
    { id }: GetV1PoolHistoryParams
  ): Promise<TxHistory[]> {
    const nft = `${DexV1Constant.POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.maestroClient.assets.assetTxs(nft, {
      cursor,
      count,
      order,
    });
    const nftTxsData = nftTxs.data;
    return nftTxsData.map(
      (tx: (typeof nftTxsData)[number]): TxHistory => ({
        txHash: tx.tx_hash,
        txIndex: 0, // TBD if this works: Maestro Asset Txs doesn't return index
        blockHeight: tx.slot,
        time: new Date(tx.timestamp),
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
    const utxos = await this.maestroClient.addresses.utxosByPaymentCred(
      v2Config.poolScriptHashBech32,
      {
        asset: v2Config.poolAuthenAsset,
      }
    );

    let utxosData: UtxoWithSlot[] = utxos.data;
    let nextCursor: string | null = utxos.next_cursor ?? null;

    while (nextCursor) {
      const utxosResponse =
        await this.maestroClient.addresses.utxosByPaymentCred(
          v2Config.poolScriptHashBech32,
          {
            asset: v2Config.poolAuthenAsset,
            cursor: nextCursor,
          }
        );
      utxosData = utxosData.concat(utxosResponse.data);
      nextCursor = utxosResponse.next_cursor ?? null;
    }

    const pools: PoolV2.State[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        if (!utxo.datum?.type) {
          throw new Error(`Cannot find datum of Pool V2, tx: ${utxo.tx_hash}`);
        }
        const pool = new PoolV2.State(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.index },
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.bytes ?? ""
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
    cursor,
    count = 100,
    order = "asc",
  }: PaginationByCursor): Promise<{
    pools: PoolV2.State[];
    errors: unknown[];
  }> {
    const v2Config = DexV2Constant.CONFIG[this.networkId];
    const utxos = await this.maestroClient.addresses.utxosByPaymentCred(
      v2Config.poolScriptHashBech32,
      {
        asset: v2Config.poolAuthenAsset,
        cursor,
        count,
        order,
      }
    );
    const utxosData = utxos.data;

    const pools: PoolV2.State[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        if (utxo.datum?.type != "inline") {
          throw new Error(`Cannot find datum of Pool V2, tx: ${utxo.tx_hash}`);
        }
        const pool = new PoolV2.State(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.index },
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum.hash
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
    const utxosData = await this.getAllUtxosDataByPaymentCred(
      v2Config.factoryScriptHashBech32,
      {
        asset: v2Config.factoryAsset,
      }
    )

    const factories: FactoryV2.State[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        if (utxo.datum?.type != "inline" || !utxo.datum?.bytes) {
          throw new Error(
            `Cannot find datum of Factory V2, tx: ${utxo.tx_hash}`
          );
        }
        const factory = new FactoryV2.State(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.index },
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.bytes
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

  public async getAllV2Orders(): Promise<{
    orders: OrderV2.State[];
    errors: unknown[];
  }> {
    const v2Config = DexV2Constant.CONFIG[this.networkId];
    const utxos = await this.maestroClient.addresses.utxosByAddress(
      v2Config.orderScriptHashBech32
    );

    const utxosData = utxos.data;
    const orders: OrderV2.State[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        let order: OrderV2.State | undefined = undefined;
        if (utxo.datum?.type === "inline") {
          order = new OrderV2.State(
            this.networkId,
            utxo.address,
            { txHash: utxo.tx_hash, index: utxo.index },
            this.mapMaestroAssetToValue(utxo.assets),
            utxo.datum.hash
          );
        } else if (utxo.datum?.hash !== null) {
          const orderDatumHash = utxo.datum?.hash ?? "";
          const orderDatum =
            await this.maestroClient.datum.lookupDatum(orderDatumHash);
          order = new OrderV2.State(
            this.networkId,
            utxo.address,
            { txHash: utxo.tx_hash, index: utxo.index },
            this.mapMaestroAssetToValue(utxo.assets),
            orderDatum.data.bytes
          );
        }

        if (order === undefined) {
          throw new Error(`Cannot find datum of Order V2, tx: ${utxo.tx_hash}`);
        }

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

  private async parseStablePoolState(
    utxo: UtxoWithSlot
  ): Promise<StablePool.State> {
    let datum: string;
    if (utxo.datum?.type) {
      datum = utxo.datum.bytes ?? "";
    } else if (utxo.datum?.hash) {
      datum = await this.getDatumByDatumHash(utxo.datum.hash);
    } else {
      throw new Error("Cannot find datum of Stable Pool");
    }
    const pool = new StablePool.State(
      this.networkId,
      utxo.address,
      { txHash: utxo.tx_hash, index: utxo.index },
      this.mapMaestroAssetToValue(utxo.assets),
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
      const utxos = await this.maestroClient.addresses.utxosByAddress(poolAddr);
      const utxosData = utxos.data;
      try {
        for (const utxo of utxosData) {
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
    const utxos = await this.maestroClient.addresses.utxosByAddress(
      config.poolAddress,
      {
        asset: config.nftAsset,
      }
    );
    const utxosData = utxos.data;

    if (utxosData.length === 1) {
      const poolUtxo = utxosData[0];
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

    const utxos = await this.maestroClient.addresses.utxosByAddress(
      poolAddress,
      {
        asset: Asset.toString(nft),
      }
    );
    const utxosData = utxos.data;

    if (utxosData.length === 1) {
      const poolUtxo = utxosData[0];
      return await this.parseStablePoolState(poolUtxo);
    }
    return null;
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
    const config = LbeV2Constant.CONFIG[this.networkId];
    const utxosData = await this.getAllUtxosDataByPaymentCred(
      config.factoryHashBech32,
      {
        asset: config.factoryAsset,
      }
    )

    const factories: LbeV2Types.FactoryState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        if (utxo.datum?.type != "inline" || !utxo.datum?.bytes) {
          throw new Error(
            `Cannot find datum of LBE V2 Factory, tx: ${utxo.tx_hash}`
          );
        }

        const factory = new LbeV2Types.FactoryState(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.index },
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.bytes
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
    const config = LbeV2Constant.CONFIG[this.networkId];

    const utxosData = await this.getAllUtxosDataByPaymentCred(
      config.treasuryHashBech32,
      {
        asset: config.treasuryAsset,
      }
    );

    const treasuries: LbeV2Types.TreasuryState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        if (utxo.datum?.type != "inline" || !utxo.datum?.bytes) {
          throw new Error(
            `Cannot find datum of LBE V2 Treasury, tx: ${utxo.tx_hash}`
          );
        }

        const treasury = new LbeV2Types.TreasuryState(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.index },
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.bytes
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
    const config = LbeV2Constant.CONFIG[this.networkId];

    const utxosData = await this.getAllUtxosDataByPaymentCred(
      config.managerHashBech32,
      {
        asset: config.managerAsset,
      }
    );

    const managers: LbeV2Types.ManagerState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        if (utxo.datum?.type != "inline" || !utxo.datum?.bytes) {
          throw new Error(
            `Cannot find datum of Lbe V2 Manager, tx: ${utxo.tx_hash}`
          );
        }

        const manager = new LbeV2Types.ManagerState(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.index },
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.bytes
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
    const config = LbeV2Constant.CONFIG[this.networkId];

    const utxosData = await this.getAllUtxosDataByPaymentCred(
      config.sellerHashBech32,
      {
        asset: config.sellerAsset,
      }
    );

    const sellers: LbeV2Types.SellerState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        if (utxo.datum?.type != "inline" || !utxo.datum?.bytes) {
          throw new Error(
            `Cannot find datum of Lbe V2 Seller, tx: ${utxo.tx_hash}`
          );
        }

        const seller = new LbeV2Types.SellerState(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.index },
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.bytes
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
    const config = LbeV2Constant.CONFIG[this.networkId];

    const utxosData = await this.getAllUtxosDataByPaymentCred(
      config.orderHashBech32,
      {
        asset: config.orderAsset,
      }
    );

    const orders: LbeV2Types.OrderState[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        if (utxo.datum?.type != "inline" || !utxo.datum?.bytes) {
          throw new Error(
            `Cannot find datum of Lbe V2 Order, tx: ${utxo.tx_hash}`
          );
        }

        const order = new LbeV2Types.OrderState(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.index },
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.bytes
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

  public async getLbeV2OrdersByLbeIdAndOwner(
    lbeId: string,
    owner: string
  ): Promise<LbeV2Types.OrderState[]> {
    const { orders: allOrders } = await this.getAllLbeV2Orders();
    const orders: LbeV2Types.OrderState[] = [];
    for (const order of allOrders) {
      if (order.lbeId === lbeId && order.owner === owner) {
        orders.push(order);
      }
    }
    return orders;
  }
}
