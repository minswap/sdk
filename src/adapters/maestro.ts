import { Address, Tx } from '@minswap/lucid-cardano';
import {
  MaestroClient,
  Asset as MaestroUtxoAsset,
} from '@maestro-org/typescript-sdk';
import { DexV1Constant, DexV2Constant } from '../types/constants';
import { Asset } from '../types/asset';
import { FactoryV2 } from '../types/factory';
import { LbeV2Types } from '../types/lbe-v2';
import { NetworkId } from '../types/network';
import { PoolV1, PoolV2, StablePool } from '..';
import { TxHistory, TxIn, Value } from '../types/tx.internal';
import {
  Adapter,
  GetPoolByIdParams,
  GetPoolInTxParams,
  GetPoolPriceParams,
  GetStablePoolHistoryParams,
  GetStablePoolPriceParams,
  GetV2PoolHistoryParams,
  GetV2PoolPriceParams,
} from './adapter';
import { getScriptHashFromAddress } from '../utils/address-utils.internal';
import {
  checkValidPoolOutput,
  isValidPoolOutput,
  normalizeAssets,
} from '../types/pool.internal';
import invariant from '@minswap/tiny-invariant';
import Big from 'big.js';
import { StringUtils } from '../types/string';

export declare class MaestroServerError {
  code: number;
  error: string;
  message: string;
}

export type MaestroPaginationOptions = {
  count?: number;
  cursor?: string;
  order?: 'asc' | 'desc';
};

export type GetPoolsParams = Omit<MaestroPaginationOptions, 'cursor'> & {
  cursor: string;
};

export type GetV1PoolHistoryParams = MaestroPaginationOptions & {
  id: string;
};

export class MaestroAdapter implements Adapter {
  protected readonly networkId: NetworkId;
  private readonly maestroClient: MaestroClient;

  constructor(networkId: NetworkId, maestroClient: MaestroClient) {
    this.networkId = networkId;
    this.maestroClient = maestroClient;
  }

  private mapMaestroAssetToValue(assets: MaestroUtxoAsset[]): Value {
    return assets.map((asset) => ({
      unit: asset.unit,
      quantity: asset.amount,
    }));
  }

  public async getAssetDecimals(asset: string): Promise<number> {
    if (asset === 'lovelace') {
      return 6;
    }
    try {
      const assetAInfo = await this.maestroClient.assets.assetInfo(asset);
      return assetAInfo.data.token_registry_metadata?.decimals ?? 0;
    } catch (err) {
      if (err instanceof MaestroServerError && err.code === 400) {
        return 0;
      }
      throw err;
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
        getScriptHashFromAddress(o.address) === DexV1Constant.POOL_SCRIPT_HASH,
    );
    if (!poolUtxo) {
      return null;
    }

    const poolUtxoAmount = this.mapMaestroAssetToValue(poolUtxo.assets);
    const poolUtxoDatumHash = poolUtxo.datum?.hash ?? '';

    checkValidPoolOutput(poolUtxo.address, poolUtxoAmount, poolUtxoDatumHash);
    invariant(
      poolUtxoDatumHash,
      `expect pool to have datum hash, got ${poolUtxoDatumHash}`,
    );

    const txIn: TxIn = { txHash: txHash, index: poolUtxo.index };
    return new PoolV1.State(
      poolUtxo.address,
      txIn,
      poolUtxoAmount,
      poolUtxoDatumHash,
    );
  }

  public async getV1PoolById({
    id,
  }: GetPoolByIdParams): Promise<PoolV1.State | null> {
    const nft = `${DexV1Constant.POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.maestroClient.assets.assetTxs(nft, {
      count: 1,
      order: 'desc',
    });
    if (nftTxs.data.length === 0) {
      return null;
    }
    return this.getV1PoolInTx({ txHash: nftTxs.data[0].tx_hash });
  }

  public async getV1Pools({
    cursor,
    count = 100,
    order = 'asc',
  }: GetPoolsParams): Promise<PoolV1.State[]> {
    const utxosResponse = await this.maestroClient.addresses.utxosByAddress(
      DexV1Constant.POOL_SCRIPT_HASH,
      { cursor, count, order },
    );
    const utxos = utxosResponse.data;
    return utxos
      .filter((utxo: (typeof utxos)[number]) =>
        isValidPoolOutput(
          utxo.address,
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.hash ?? '',
        ),
      )
      .map((utxo: (typeof utxos)[number]) => {
        invariant(
          utxo.datum?.hash,
          `expect pool to have datum hash, got ${utxo.datum?.hash}`,
        );
        const txIn: TxIn = { txHash: utxo.tx_hash, index: utxo.index };
        return new PoolV1.State(
          utxo.address,
          txIn,
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum?.hash,
        );
      });
  }

  // TODO
  public async getV1PoolHistory({
    id,
    count = 100,
    order = 'desc',
  }: GetV1PoolHistoryParams): Promise<TxHistory[]> {
    const nft = `${DexV1Constant.POOL_NFT_POLICY_ID}${id}`;
    const nftTxs = await this.maestroClient.assets.assetTxs(nft, {
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
      }),
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
      Big(10).pow(decimalsA),
    );
    const adjustedReserveB = Big(pool.reserveB.toString()).div(
      Big(10).pow(decimalsB),
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
    const utxos = await this.maestroClient.addresses.utxosByAddress(
      v2Config.poolScriptHashBech32,
    );
    const utxosData = utxos.data;

    const pools: PoolV2.State[] = [];
    const errors: unknown[] = [];
    for (const utxo of utxosData) {
      try {
        if (!utxo.datum) {
          throw new Error(`Cannot find datum of Pool V2, tx: ${utxo.tx_hash}`);
        }
        const pool = new PoolV2.State(
          this.networkId,
          utxo.address,
          { txHash: utxo.tx_hash, index: utxo.index },
          this.mapMaestroAssetToValue(utxo.assets),
          utxo.datum.hash,
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

  // TODO
  getV2Pools(
    params: GetPoolsParams,
  ): Promise<{ pools: PoolV2.State[]; errors: unknown[] }> {
    throw new Error('Method not implemented.');
  }

  public async getV2PoolByPair(
    assetA: Asset,
    assetB: Asset,
  ): Promise<PoolV2.State | null> {
    const [normalizedAssetA, normalizedAssetB] = normalizeAssets(
      Asset.toString(assetA),
      Asset.toString(assetB),
    );
    const { pools: allPools } = await this.getAllV2Pools();
    return (
      allPools.find(
        (pool) =>
          pool.assetA === normalizedAssetA && pool.assetB === normalizedAssetB,
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

  // TODO
  getV2PoolHistory(params: GetV2PoolHistoryParams): Promise<PoolV2.State[]> {
    throw new Error('Method not implemented.');
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
      Big(10).pow(decimalsA),
    );
    const adjustedReserveB = Big(pool.reserveB.toString()).div(
      Big(10).pow(decimalsB),
    );
    const priceAB = adjustedReserveA.div(adjustedReserveB);
    const priceBA = adjustedReserveB.div(adjustedReserveA);
    return [priceAB, priceBA];
  }

  // TODO
  getAllFactoriesV2(): Promise<{
    factories: FactoryV2.State[];
    errors: unknown[];
  }> {
    throw new Error('Method not implemented.');
  }

  public async getFactoryV2ByPair(
    assetA: Asset,
    assetB: Asset,
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

  // TODO
  getAllStablePools(): Promise<{
    pools: StablePool.State[];
    errors: unknown[];
  }> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getStablePoolByLpAsset(lpAsset: Asset): Promise<StablePool.State | null> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getStablePoolByNFT(nft: Asset): Promise<StablePool.State | null> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getStablePoolHistory(
    params: GetStablePoolHistoryParams,
  ): Promise<StablePool.State[]> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getStablePoolPrice(params: GetStablePoolPriceParams): Big {
    throw new Error('Method not implemented.');
  }

  // TODO
  getAllLbeV2Factories(): Promise<{
    factories: LbeV2Types.FactoryState[];
    errors: unknown[];
  }> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getLbeV2Factory(
    baseAsset: Asset,
    raiseAsset: Asset,
  ): Promise<LbeV2Types.FactoryState | null> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getLbeV2HeadAndTailFactory(lbeId: string): Promise<{
    head: LbeV2Types.FactoryState;
    tail: LbeV2Types.FactoryState;
  } | null> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getAllLbeV2Treasuries(): Promise<{
    treasuries: LbeV2Types.TreasuryState[];
    errors: unknown[];
  }> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getLbeV2TreasuryByLbeId(
    lbeId: string,
  ): Promise<LbeV2Types.TreasuryState | null> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getAllLbeV2Managers(): Promise<{
    managers: LbeV2Types.ManagerState[];
    errors: unknown[];
  }> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getLbeV2ManagerByLbeId(
    lbeId: string,
  ): Promise<LbeV2Types.ManagerState | null> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getAllLbeV2Sellers(): Promise<{
    sellers: LbeV2Types.SellerState[];
    errors: unknown[];
  }> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getLbeV2SellerByLbeId(lbeId: string): Promise<LbeV2Types.SellerState | null> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getAllLbeV2Orders(): Promise<{
    orders: LbeV2Types.OrderState[];
    errors: unknown[];
  }> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getLbeV2OrdersByLbeId(lbeId: string): Promise<LbeV2Types.OrderState[]> {
    throw new Error('Method not implemented.');
  }

  // TODO
  getLbeV2OrdersByLbeIdAndOwner(
    lbeId: string,
    owner: Address,
  ): Promise<LbeV2Types.OrderState[]> {
    throw new Error('Method not implemented.');
  }
}
