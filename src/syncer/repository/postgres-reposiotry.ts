import * as OgmiosSchema from "@cardano-ogmios/schema";
import * as Prisma from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { Data } from "lucid-cardano";

import { Asset } from "../../types/asset";
import { SECURITY_PARAM } from "../../types/constants";
import { NetworkEnvironment } from "../../types/network";
import { PoolV1, PoolV2, StablePool } from "../../types/pool";

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
            lt: point.slot
          }
        },
        orderBy: {
          slot: "desc"
        }
      })
      const rollbackBlockId = rollbackBlock ? rollbackBlock.id : 0n
      const deletedBlocks = await this.prismaClientInTx.block.deleteMany({
        where: {
          id: {
            gt: rollbackBlockId
          }
        }
      })
      await this.prismaClientInTx.poolV1.deleteMany({
        where: {
          id: {
            gt: rollbackBlockId
          }
        }
      })
      await this.prismaClientInTx.poolV2.deleteMany({
        where: {
          id: {
            gt: rollbackBlockId
          }
        }
      })
      await this.prismaClientInTx.stablePool.deleteMany({
        where: {
          id: {
            gt: rollbackBlockId
          }
        }
      })
      return deletedBlocks.count;
    }
  }

  async createPoolV1(block: OgmiosSchema.BlockPraos, pool: PoolV1.State, totalLiquidity: bigint): Promise<void> {
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
        pool_address: pool.address,
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
        pool_address: pool.address,
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
        datum: Data.to(StablePool.Datum.toPlutusData(pool.datum)),
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

