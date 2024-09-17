import * as OgmiosSchema from "@cardano-ogmios/schema";
import { Redis } from "ioredis";

import { RedisReadOnly } from "../connector";

export enum RedisKey {
  SYNCER_LAST_SYNC_SLOT = "syncer-last-sync-slot",
  SYNCER_INTERSECTION_CANDIDATES = "syncer-intersection-candidates",
}

export class RedisRepositoryReader {
  protected readonly redisReader: RedisReadOnly;

  constructor(redisReader: RedisReadOnly) {
    this.redisReader = redisReader
  }

  async getIntersectionCandidates(): Promise<OgmiosSchema.Point[]> {
    const data = await this.redisReader.lrange(RedisKey.SYNCER_INTERSECTION_CANDIDATES, 0, -1);
    if (!data) {
      return [];
    }
    return data.map((d) => JSON.parse(d));
  }
}

export class RedisRepositoryWriter extends RedisRepositoryReader {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    super(redis);
    this.redis = redis
  }

  async setLastSyncSlot(syncSlot: number): Promise<void> {
    await this.redis.set(RedisKey.SYNCER_LAST_SYNC_SLOT, syncSlot);
  }

  async pushIntersectionCandidate(block: OgmiosSchema.BlockPraos, maxLength: number): Promise<void> {
    const redisTransaction = this.redis.multi();
    const currentLength = await this.redis.llen(RedisKey.SYNCER_INTERSECTION_CANDIDATES);
    if (currentLength >= maxLength) {
      redisTransaction.rpop(RedisKey.SYNCER_INTERSECTION_CANDIDATES);
    }
    const point: OgmiosSchema.Point = {
      id: block.id,
      slot: block.slot,
    };
    redisTransaction.lpush(RedisKey.SYNCER_INTERSECTION_CANDIDATES, JSON.stringify(point));
    await redisTransaction.exec();
  }

  async rollbackIntersectionCandidates(point: OgmiosSchema.PointOrOrigin): Promise<void> {
    if (point === "origin") {
      await this.redis.del(RedisKey.SYNCER_INTERSECTION_CANDIDATES);
    } else {
      const slot = point.slot;
      const intersectionCandidates = await this.getIntersectionCandidates();
      let popCount = 0;
      let foundIntersectionCandidate = false;
      for (let index = 0; index < intersectionCandidates.length; index++) {
        if (intersectionCandidates[index].slot <= slot) {
          popCount = index;
          foundIntersectionCandidate = true;
          break;
        }
      }
      if (!foundIntersectionCandidate || popCount === 0) {
        await this.redis.del(RedisKey.SYNCER_INTERSECTION_CANDIDATES);
      } else {
        await this.redis.lpop(RedisKey.SYNCER_INTERSECTION_CANDIDATES, popCount);
      }
    }
  }
}