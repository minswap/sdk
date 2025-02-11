import * as OgmiosSchema from "@cardano-ogmios/schema";
import * as Prisma from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import JSONBig from "json-bigint"

import { DataObject } from "../../index";
import { Asset } from "../../types/asset";
import { SECURITY_PARAM } from "../../types/constants";
import { NetworkEnvironment, NetworkId } from "../../types/network";
import { PoolV1, PoolV2, StablePool } from "../../types/pool";
import { normalizeAssets } from "../../types/pool.internal";

export type PrismaClientInTx = Omit<Prisma.PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PostgresRepositoryReader {
  protected readonly networkEnv: NetworkEnvironment;
  protected readonly prismaClientInTx: PrismaClientInTx;

  constructor(networkEnv: NetworkEnvironment, prismaClientInTx: PrismaClientInTx) {
    this.networkEnv = networkEnv
    this.prismaClientInTx = prismaClientInTx
  }

  async getIntersectionCandidates(): Promise<OgmiosSchema.Point[]> {
    const result = await this.prismaClientInTx.block.aggregate({
      _max: {
        id: true,
      },
    });
    if (!result._max.id) {
      return [];
    }

    const blocks = await this.prismaClientInTx.block.findMany({
      where: {
        id: {
          gt: result._max.id - BigInt(SECURITY_PARAM[this.networkEnv]),
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    return blocks.map((block: Prisma.Block) => ({
      id: block.header_hash,
      slot: Number(block.slot),
    }));
  }

  async getPoolV1ByCreatedTxId(txId: string): Promise<Prisma.PoolV1 | null> {
    return await this.prismaClientInTx.poolV1.findFirst({
      where: {
        created_tx_id: txId
      }
    })
  }

  async getPoolV1ByLpAsset(lpAsset: string): Promise<Prisma.PoolV1 | null> {
    return await this.prismaClientInTx.poolV1.findFirst({
      where: {
        lp_asset: lpAsset
      },
      orderBy: {
        id: "desc"
      },
    })
  }

  async getLastPoolV1State(offset: number, limit: number, orderBy: "asc" | "desc"): Promise<Prisma.PoolV1[]> {
    return await this.prismaClientInTx.$queryRawUnsafe(`
      WITH T AS (SELECT DISTINCT ON (lp_asset) * FROM pool_v1 ORDER BY lp_asset, id DESC)
      SELECT * FROM T ORDER BY id ${orderBy} OFFSET ${offset} LIMIT ${limit};  
    `)
  }

  async getHistoricalPoolV1ByLpAsset(lpAsset: string, offset: number, limit: number, orderBy: "asc" | "desc"): Promise<Prisma.PoolV1[]> {
    return await this.prismaClientInTx.poolV1.findMany({
      where: {
        lp_asset: lpAsset
      },
      skip: offset * limit,
      take: limit,
      orderBy: {
        id: orderBy
      }
    })
  }

  async getHistoricalPoolsV1(offset: number, limit: number, orderBy: "asc" | "desc"): Promise<Prisma.PoolV1[]> {
    return await this.prismaClientInTx.poolV1.findMany({
      skip: offset * limit,
      take: limit,
      orderBy: {
        id: orderBy
      }
    })
  }

  async getAllLastPoolV2State(): Promise<Prisma.PoolV2[]> {
    return await this.prismaClientInTx.$queryRawUnsafe(`
      WITH T AS (SELECT DISTINCT ON (lp_asset) * FROM pool_v2 ORDER BY lp_asset, id DESC)
      SELECT * FROM T ORDER BY id ASC;  
    `)
  }

  async getLastPoolV2State(offset: number, limit: number, orderBy: "asc" | "desc"): Promise<Prisma.PoolV2[]> {
    return await this.prismaClientInTx.$queryRawUnsafe(`
      WITH T AS (SELECT DISTINCT ON (lp_asset) * FROM pool_v2 ORDER BY lp_asset, id DESC)
      SELECT * FROM T ORDER BY id ${orderBy} OFFSET ${offset} LIMIT ${limit};  
    `)
  }

  async getHistoricalPoolV2ByLpAsset(lpAsset: string, offset: number, limit: number, orderBy: "asc" | "desc"): Promise<Prisma.PoolV2[]> {
    return await this.prismaClientInTx.poolV2.findMany({
      where: {
        lp_asset: lpAsset
      },
      skip: offset * limit,
      take: limit,
      orderBy: {
        id: orderBy
      }
    })
  }

  async getHistoricalPoolsV2(offset: number, limit: number, orderBy: "asc" | "desc"): Promise<Prisma.PoolV2[]> {
    return await this.prismaClientInTx.poolV2.findMany({
      skip: offset * limit,
      take: limit,
      orderBy: {
        id: orderBy
      }
    })
  }

  async getPoolV2ByPair(assetA: Asset, assetB: Asset): Promise<Prisma.PoolV2 | null> {
    const [normalizedAssetA, normalizedAssetB] = normalizeAssets(
      Asset.toString(assetA),
      Asset.toString(assetB)
    );
    return await this.prismaClientInTx.poolV2.findFirst({
      where: {
        asset_a: normalizedAssetA,
        asset_b: normalizedAssetB
      },
      orderBy: {
        id: "desc"
      }
    })
  }

  async getPoolV2ByLpAsset(lpAsset: Asset): Promise<Prisma.PoolV2 | null> {
    return await this.prismaClientInTx.poolV2.findFirst({
      where: {
        lp_asset: Asset.toString(lpAsset)
      },
      orderBy: {
        id: "desc"
      },
    })
  }

  async getAllLastStablePoolState(): Promise<Prisma.StablePool[]> {
    return await this.prismaClientInTx.$queryRawUnsafe(`
      WITH T AS (SELECT DISTINCT ON (lp_asset) * FROM stable_pool ORDER BY lp_asset, id DESC)
      SELECT * FROM T ORDER BY id DESC; 
    `)
  }

  async getStablePoolByLpAsset(lpAsset: string): Promise<Prisma.StablePool | null> {
    return await this.prismaClientInTx.stablePool.findFirst({
      where: {
        lp_asset: lpAsset
      },
      orderBy: {
        id: "desc"
      },
    })
  }

  async getHistoricalStablePoolsByLpAsset(lpAsset: string, offset: number, limit: number, orderBy: "asc" | "desc"): Promise<Prisma.StablePool[]> {
    return await this.prismaClientInTx.stablePool.findMany({
      where: {
        lp_asset: lpAsset
      },
      skip: offset * limit,
      take: limit,
      orderBy: {
        id: orderBy
      }
    })
  }
}

export class PostgresRepositoryWriterInTransaction extends PostgresRepositoryReader {
  constructor(networkEnv: NetworkEnvironment, prismaClientInTx: PrismaClientInTx) {
    super(networkEnv, prismaClientInTx);
  }

  async createBlock(block: OgmiosSchema.BlockPraos): Promise<void> {
    await this.prismaClientInTx.block.create({
      data: {
        id: BigInt(block.height),
        slot: BigInt(block.slot),
        header_hash: block.id
      }
    })
  }

  async rollbackToPoint(point: OgmiosSchema.PointOrOrigin): Promise<number> {
    if (point === "origin") {
      await this.prismaClientInTx.$executeRawUnsafe(`
        DO
        $$
            DECLARE
              table_name TEXT;
            BEGIN
              FOR table_name IN (SELECT tablename
                                FROM pg_tables
                                WHERE schemaname = 'public' AND tablename != 'schema_migrations')
                  LOOP
                    EXECUTE 'TRUNCATE TABLE ' || table_name || ' CASCADE';
                  END LOOP;
            END
        $$;
      `)
      return 0;
    } else {
      const rollbackBlock = await this.prismaClientInTx.block.findFirst({
        where: {
          slot: {
            gt: point.slot
          }
        },
        orderBy: {
          slot: "asc"
        }
      })
      if (!rollbackBlock) {
        return 0
      }

      const deletedBlocks = await this.prismaClientInTx.block.deleteMany({
        where: {
          id: {
            gte: rollbackBlock.id
          }
        }
      })
      await this.prismaClientInTx.poolV1.deleteMany({
        where: {
          id: {
            gte: rollbackBlock.id
          }
        }
      })
      await this.prismaClientInTx.poolV2.deleteMany({
        where: {
          id: {
            gte: rollbackBlock.id
          }
        }
      })
      await this.prismaClientInTx.stablePool.deleteMany({
        where: {
          id: {
            gte: rollbackBlock.id
          }
        }
      })
      return deletedBlocks.count;
    }
  }

  async createPoolV1(params: { block: OgmiosSchema.BlockPraos, pool: PoolV1.State, rawDatum: string, networkId: NetworkId }): Promise<void> {
    const { block, pool, rawDatum, networkId } = params;
    const { totalLiquidity } = PoolV1.Datum.fromPlutusData(networkId, DataObject.from(rawDatum))
    await this.prismaClientInTx.poolV1.create({
      data: {
        lp_asset: pool.assetLP,
        asset_a: pool.assetA,
        asset_b: pool.assetB,
        reserve_a: new Decimal(pool.reserveA.toString()),
        reserve_b: new Decimal(pool.reserveB.toString()),
        total_liquidity: new Decimal(totalLiquidity.toString()),
        created_tx_id: pool.txIn.txHash,
        created_tx_index: pool.txIn.index,
        value: JSONBig.stringify(pool.value),
        pool_address: pool.address,
        raw_datum: rawDatum,
        slot: BigInt(block.slot),
        block_id: BigInt(block.height),
      }
    })
  }

  async createPoolV2(block: OgmiosSchema.BlockPraos, pool: PoolV2.State): Promise<void> {
    await this.prismaClientInTx.poolV2.create({
      data: {
        lp_asset: Asset.toString(pool.lpAsset),
        asset_a: pool.assetA,
        asset_b: pool.assetB,
        datum_reserve_a: new Decimal(pool.reserveA.toString()),
        datum_reserve_b: new Decimal(pool.reserveB.toString()),
        value_reserve_a: new Decimal(pool.valueReserveA.toString()),
        value_reserve_b: new Decimal(pool.valueReserveB.toString()),
        total_liquidity: new Decimal(pool.totalLiquidity.toString()),
        created_tx_id: pool.txIn.txHash,
        created_tx_index: pool.txIn.index,
        value: JSONBig.stringify(pool.value),
        pool_address: pool.address,
        raw_datum: pool.datumRaw,
        slot: BigInt(block.slot),
        block_id: BigInt(block.height),
      }
    })
  }

  async createStablePool(block: OgmiosSchema.BlockPraos, pool: StablePool.State): Promise<void> {
    await this.prismaClientInTx.stablePool.create({
      data: {
        lp_asset: pool.lpAsset,
        total_liquidity: new Decimal(pool.totalLiquidity.toString()),
        created_tx_id: pool.txIn.txHash,
        created_tx_index: pool.txIn.index,
        pool_address: pool.address,
        value: JSONBig.stringify(pool.value),
        raw_datum: DataObject.to(StablePool.Datum.toPlutusData(pool.datum)),
        slot: BigInt(block.slot),
        block_id: BigInt(block.height),
      }
    })
  }
}

export class PostgresRepositoryWriter extends PostgresRepositoryWriterInTransaction {
  private readonly prismaClientTx: Prisma.PrismaClient;

  constructor(networkEnv: NetworkEnvironment, prismaClient: Prisma.PrismaClient) {
    super(networkEnv, prismaClient);
    this.prismaClientTx = prismaClient;
  }

  async transaction(
    fn: (repo: PostgresRepositoryWriterInTransaction) => Promise<void>,
    options: { timeout?: number; maxWait?: number },
  ): Promise<void> {
    return this.prismaClientTx.$transaction(
      (txPrisma) => fn(new PostgresRepositoryWriterInTransaction(this.networkEnv, txPrisma)),
      options,
    );
  }
}

