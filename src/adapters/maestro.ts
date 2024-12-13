import { Address } from "@minswap/lucid-cardano";
import { PoolV1, PoolV2, StablePool } from "..";
import { Asset } from "../types/asset";
import { FactoryV2 } from "../types/factory";
import { LbeV2Types } from "../types/lbe-v2";
import { TxHistory } from "../types/tx.internal";
import { DexV1Constant } from "../types/constants";
import { checkValidPoolOutput } from "../types/pool.internal";
import invariant from "@minswap/tiny-invariant";
import {
  Adapter,
  GetPoolByIdParams,
  GetPoolInTxParams,
  GetPoolPriceParams,
  GetPoolsParams,
  GetStablePoolHistoryParams,
  GetStablePoolPriceParams,
  GetV1PoolHistoryParams,
  GetV2PoolHistoryParams,
  GetV2PoolPriceParams,
} from "./adapter";
import { getScriptHashFromAddress } from "../utils/address-utils.internal";
import { NetworkId } from "../types/network";
import { MaestroClient } from "@maestro-org/typescript-sdk";

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

  public async getAssetDecimals(asset: string): Promise<number> {
    if (asset === "lovelace") {
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
    // TODO: implement latest block handler in typescript-sdk
    throw new Error("Method not implemented.");
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

    // TODO

    throw new Error("Method not implemented.");
  }

  getV1PoolById({ id }: GetPoolByIdParams): Promise<PoolV1.State | null> {
    throw new Error("Method not implemented.");
  }

  getV1Pools(params: GetPoolsParams): Promise<PoolV1.State[]> {
    throw new Error("Method not implemented.");
  }

  getV1PoolHistory(params: GetV1PoolHistoryParams): Promise<TxHistory[]> {
    throw new Error("Method not implemented.");
  }

  getV1PoolPrice(params: GetPoolPriceParams): Promise<[Big, Big]> {
    throw new Error("Method not implemented.");
  }
  getAllV2Pools(): Promise<{ pools: PoolV2.State[]; errors: unknown[] }> {
    throw new Error("Method not implemented.");
  }
  getV2Pools(
    params: GetPoolsParams,
  ): Promise<{ pools: PoolV2.State[]; errors: unknown[] }> {
    throw new Error("Method not implemented.");
  }
  getV2PoolByPair(assetA: Asset, assetB: Asset): Promise<PoolV2.State | null> {
    throw new Error("Method not implemented.");
  }
  getV2PoolByLp(lpAsset: Asset): Promise<PoolV2.State | null> {
    throw new Error("Method not implemented.");
  }
  getV2PoolHistory(params: GetV2PoolHistoryParams): Promise<PoolV2.State[]> {
    throw new Error("Method not implemented.");
  }
  getV2PoolPrice(params: GetV2PoolPriceParams): Promise<[Big, Big]> {
    throw new Error("Method not implemented.");
  }
  getAllFactoriesV2(): Promise<{
    factories: FactoryV2.State[];
    errors: unknown[];
  }> {
    throw new Error("Method not implemented.");
  }
  getFactoryV2ByPair(
    assetA: Asset,
    assetB: Asset,
  ): Promise<FactoryV2.State | null> {
    throw new Error("Method not implemented.");
  }
  getAllStablePools(): Promise<{
    pools: StablePool.State[];
    errors: unknown[];
  }> {
    throw new Error("Method not implemented.");
  }
  getStablePoolByLpAsset(lpAsset: Asset): Promise<StablePool.State | null> {
    throw new Error("Method not implemented.");
  }
  getStablePoolByNFT(nft: Asset): Promise<StablePool.State | null> {
    throw new Error("Method not implemented.");
  }
  getStablePoolHistory(
    params: GetStablePoolHistoryParams,
  ): Promise<StablePool.State[]> {
    throw new Error("Method not implemented.");
  }
  getStablePoolPrice(params: GetStablePoolPriceParams): Big {
    throw new Error("Method not implemented.");
  }
  getAllLbeV2Factories(): Promise<{
    factories: LbeV2Types.FactoryState[];
    errors: unknown[];
  }> {
    throw new Error("Method not implemented.");
  }
  getLbeV2Factory(
    baseAsset: Asset,
    raiseAsset: Asset,
  ): Promise<LbeV2Types.FactoryState | null> {
    throw new Error("Method not implemented.");
  }
  getLbeV2HeadAndTailFactory(lbeId: string): Promise<{
    head: LbeV2Types.FactoryState;
    tail: LbeV2Types.FactoryState;
  } | null> {
    throw new Error("Method not implemented.");
  }
  getAllLbeV2Treasuries(): Promise<{
    treasuries: LbeV2Types.TreasuryState[];
    errors: unknown[];
  }> {
    throw new Error("Method not implemented.");
  }
  getLbeV2TreasuryByLbeId(
    lbeId: string,
  ): Promise<LbeV2Types.TreasuryState | null> {
    throw new Error("Method not implemented.");
  }
  getAllLbeV2Managers(): Promise<{
    managers: LbeV2Types.ManagerState[];
    errors: unknown[];
  }> {
    throw new Error("Method not implemented.");
  }
  getLbeV2ManagerByLbeId(
    lbeId: string,
  ): Promise<LbeV2Types.ManagerState | null> {
    throw new Error("Method not implemented.");
  }
  getAllLbeV2Sellers(): Promise<{
    sellers: LbeV2Types.SellerState[];
    errors: unknown[];
  }> {
    throw new Error("Method not implemented.");
  }
  getLbeV2SellerByLbeId(lbeId: string): Promise<LbeV2Types.SellerState | null> {
    throw new Error("Method not implemented.");
  }
  getAllLbeV2Orders(): Promise<{
    orders: LbeV2Types.OrderState[];
    errors: unknown[];
  }> {
    throw new Error("Method not implemented.");
  }
  getLbeV2OrdersByLbeId(lbeId: string): Promise<LbeV2Types.OrderState[]> {
    throw new Error("Method not implemented.");
  }
  getLbeV2OrdersByLbeIdAndOwner(
    lbeId: string,
    owner: Address,
  ): Promise<LbeV2Types.OrderState[]> {
    throw new Error("Method not implemented.");
  }
}
