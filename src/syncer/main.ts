import { PrismaClient } from "@prisma/client";
import { backOff } from "exponential-backoff";
import { Redis } from "ioredis";

import { getSyncerConfig } from "./config";
import { newOgmiosInteractionCtx, newPrismaClient, newRedis } from "./connector";
import { PostgresRepositoryWriter } from "./repository/postgres-repository";
import { RedisRepositoryWriter } from "./repository/redis-repository";
import { Syncer } from "./syncer";

async function start(): Promise<void> {
  let redis: Redis | undefined;
  let prismaClient: PrismaClient | undefined;
  try {
    const config = getSyncerConfig();
    redis = newRedis(config.redis);
    const redisRepo = new RedisRepositoryWriter(redis);
    prismaClient = await newPrismaClient(config.postgress)
    const postgresRepo = new PostgresRepositoryWriter(config.networkEnv, prismaClient)
    const ogmiosCtx = await newOgmiosInteractionCtx(config.ogmios.host, config.ogmios.port)

    const syncer = new Syncer({
      config: config,
      ogmiosCtx: ogmiosCtx,
      redisRepository: redisRepo,
      postgresRepository: postgresRepo
    });
    void syncer.start()
  } catch (err) {
    await redis?.quit();
    await prismaClient?.$disconnect();
    throw err;
  }
}

async function main(): Promise<void> {
  return backOff(start, {
    retry(err, attempt): boolean {
      console.error(`Fail to run syncer, retry ${attempt}...`, err);
      return true;
    },
    startingDelay: 500,
  });
}

void main();
