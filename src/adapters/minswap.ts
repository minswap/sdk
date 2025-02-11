import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import * as Prisma from "@prisma/client";
import { Hasher } from "@spacebudz/lucid";
import JSONBig from "json-bigint";

import { PostgresRepositoryReader } from "../syncer/repository/postgres-repository";
import { Asset } from "../types/asset";
import { DexV1Constant, StableswapConstant } from "../types/constants";
import { NetworkEnvironment, NetworkId } from "../types/network";
import { PoolV1, PoolV2, StablePool } from "../types/pool";
import { TxHistory, TxIn, Value } from "../types/tx.internal";
import { networkEnvToLucidNetwork, slotToBeginUnixTime } from "../utils/network.internal";
import {
  GetPoolByIdParams,
  GetPoolInTxParams,
  GetV1PoolHistoryParams,
  PaginationByPage,
} from "./adapter";
import { BlockfrostAdapter } from "./blockfrost";

export type GetStablePoolHistoryParams = {
  lpAsset: Asset;
};

export type GetV2PoolHistoryParams =
  | {
      assetA: Asset;
      assetB: Asset;
    }
  | {
      lpAsset: Asset;
    };

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
    const datumHash = Hasher.hashData(prismaPool.raw_datum);
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
    page = 1,
    count = 100,
    order = "asc",
  }: PaginationByPage): Promise<PoolV1.State[]> {
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

  override async getV1PoolHistory(
    { page = 1, count = 100, order = "desc" }: PaginationByPage,
    { id }: GetV1PoolHistoryParams
  ): Promise<TxHistory[]> {
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
            network
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
    page = 1,
    count = 100,
    order = "asc",
  }: PaginationByPage): Promise<{
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

  async getV2PoolHistory(
    { page = 1, count = 100, order = "desc" }: PaginationByPage,
    params: GetV2PoolHistoryParams
  ): Promise<PoolV2.State[]> {
    let lpAsset: string;
    if ("lpAsset" in params) {
      lpAsset = Asset.toString(params.lpAsset);
    } else {
      lpAsset = PoolV2.computeLPAssetName(params.assetA, params.assetB);
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

  async getStablePoolHistory(
    { page = 1, count = 100, order = "desc" }: PaginationByPage,
    { lpAsset }: GetStablePoolHistoryParams
  ): Promise<StablePool.State[]> {
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
