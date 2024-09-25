import { createInteractionContext, InteractionContext } from "@cardano-ogmios/client";
import { Prisma, PrismaClient } from "@prisma/client";
import { Redis, RedisOptions } from "ioredis";

export type RedisReadOnly = Pick<Redis, | "get" | "mget" | "hget" | "hmget" | "hgetall" | "hlen" | "hexists" | "hkeys" | "hvals" | "lrange" | "smismember" | "smembers" | "disconnect" | "quit">;

export function newRedis(url: string, options?: RedisOptions): Redis {
  const redis = new Redis(url, {
    ...options,
    db: 0,
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    showFriendlyErrorStack: false,
    retryStrategy: (times) => Math.min(times * 10, 2000),
  });
  return redis;
}

export async function newOgmiosInteractionCtx(host: string, port: number): Promise<InteractionContext> {
  const ogmiosCtx = await createInteractionContext(
    (err: Error) => console.error("ogmios error", err),
    (code, reason) => console.info("ogmios connection closed", { code, reason }),
    {
      connection: {
        host: host,
        port: port
      }
    },
  )
  return ogmiosCtx;
}

export async function newPrismaClient(url: string): Promise<PrismaClient> {
  const client = new PrismaClient({
    datasources: {
      db: { url },
    },
    log: [
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "warn" },
      { emit: "stdout", level: "info" },
      { emit: "event", level: "query" },
    ],
  });
  await client.$connect();

  client.$on("query", (e: Prisma.QueryEvent) => {
    if (e.duration >= 3000) {
      console.warn("slow query", {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    }
  });

  return client;
}