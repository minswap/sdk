import * as Ogmios from "@cardano-ogmios/client";
import * as OgmiosSchema from "@cardano-ogmios/schema";
import { backOff } from "exponential-backoff";

import { DexV1Constant, DexV2Constant, SECURITY_PARAM, StableswapConstant } from "../types/constants";
import { PoolV1, PoolV2, StablePool } from "../types/pool";
import { TxIn, Value } from "../types/tx.internal";
import { getScriptHashFromAddress } from "../utils/address-utils.internal";
import { SyncerConfig } from "./config";
import { PostgresRepositoryWriter } from "./repository/postgres-repository";
import { RedisRepositoryWriter } from "./repository/redis-repository";

const DEFAULT_INFLIGHT = 1000;

type SyncerConstructor = {
  config: SyncerConfig
  ogmiosCtx: Ogmios.InteractionContext,
  redisRepository: RedisRepositoryWriter,
  postgresRepository: PostgresRepositoryWriter
}

export class Syncer {
  private readonly config: SyncerConfig
  private readonly ogmiosCtx: Ogmios.InteractionContext;
  private readonly redisRepository: RedisRepositoryWriter;
  private readonly postgresRepository: PostgresRepositoryWriter;

  constructor({ config, ogmiosCtx, redisRepository, postgresRepository }: SyncerConstructor) {
    this.config = config;
    this.ogmiosCtx = ogmiosCtx;
    this.redisRepository = redisRepository;
    this.postgresRepository = postgresRepository;
  }

  async start(): Promise<void> {
    const ogmiosClient = await Ogmios.createChainSynchronizationClient(
      this.ogmiosCtx,
      {
        rollBackward: this.rollBackward.bind(this),
        rollForward: this.rollForward.bind(this),
      },
      {
        sequential: true
      },
    )

    const intersectionCandidates = await this.getIntersectionCandidate();
    if (intersectionCandidates.length > 2) {
      intersectionCandidates.splice(0, 2);
    }
    intersectionCandidates.push(this.config.syncStartPoint, "origin");

    await ogmiosClient.resume(intersectionCandidates, DEFAULT_INFLIGHT);
  }

  /**
   * Process the point in backward direction
   * @param point the point is rolled back to
   * @param tip the point is rolled back to
   * @param requestNext the callback to request the next block
   */
  private async rollBackward(
    { point, tip }: { point: OgmiosSchema.PointOrOrigin; tip: OgmiosSchema.TipOrOrigin },
    requestNext: () => void,
  ): Promise<void> {
    await backOff(() => this.handleRollback(point, tip), {
      retry(err, attempt): boolean {
        console.error(`Fail to rollback blockchain, retry ${attempt}...`, err);
        return true;
      },
    });
    requestNext();
  }

  /**
   * Process the BlockPraos in forward direction
   * @param block the current block is processing
   * @param requestNext the callback to request the next block
   */
  private async rollForward({ block }: { block: OgmiosSchema.Block }, requestNext: () => void): Promise<void> {
    if (block.type !== "praos") {
      return;
    }
    await backOff(
      async () => {
        await this.redisRepository.setLastSyncSlot(block.slot);
        await this.redisRepository.pushIntersectionCandidate(block, SECURITY_PARAM[this.config.networkEnv]);
        return this.handleBlock(block);
      },
      {
        retry(err, attempt): boolean {
          console.error(`Fail to sync block ${block.height}, retry ${attempt}...`, err);
          return true;
        },
      },
    );
    requestNext();
  }

  private async handleBlock(block: OgmiosSchema.BlockPraos): Promise<void> {
    const transactions = block.transactions;
    if (transactions === undefined || transactions.length === 0) {
      return;
    }

    await this.postgresRepository.transaction(
      async (repo) => {
        // create block
        await repo.createBlock(block)

        const networkId = this.config.networkId
        const poolV2ScriptHash = DexV2Constant.CONFIG[networkId].poolScriptHashBech32
        const stablePoolAddresses = StableswapConstant.CONFIG[networkId].map(cf => cf.poolAddress)
        for (const tx of transactions) {
          for (let index = 0; index < tx.outputs.length; index++) {
            const { address, value: ogmiosValue, datum, datumHash } = tx.outputs[index]
            const addrScriptHash = getScriptHashFromAddress(address)
            if (!addrScriptHash) {
              continue
            }

            const value = Value.fromOgmiosValue(ogmiosValue)
            const txIn: TxIn = { txHash: tx.id, index: index }
            if (addrScriptHash === DexV1Constant.POOL_SCRIPT_HASH) {
              try {
                if (!datumHash || !tx.datums || !tx.datums[datumHash]) {
                  throw Error("Datum raw not found.")
                }
                const poolV1 = new PoolV1.State(address, txIn, value, datumHash);
                await repo.createPoolV1({
                  block: block,
                  pool: poolV1,
                  networkId: networkId,
                  rawDatum: tx.datums[datumHash]
                });
              } catch (err) {
                console.log(`Invalid minswap v1 transaction: ${tx.id}`, err)
              }
            } else if (addrScriptHash === poolV2ScriptHash) {
              if (!datum) {
                continue
              }
              try {
                const poolV2 = new PoolV2.State(networkId, address, txIn, value, datum)
                await repo.createPoolV2(block, poolV2)
              } catch (err) {
                console.log(`Invalid minswap v2 transaction: ${tx.id}`, err)
              }
            } else if (stablePoolAddresses.includes(address)) {
              let poolDatum = datum
              if (!poolDatum) {
                if (!datumHash || !tx.datums || !tx.datums[datumHash]) {
                  throw Error("Datum raw not found.")
                }
                poolDatum = tx.datums[datumHash]
              }
              try {
                const stablePool = new StablePool.State(networkId, address, txIn, value, poolDatum)
                await repo.createStablePool(block, stablePool);
              } catch (err) {
                console.log(`Invalid minswap stableswap transaction: ${tx.id}`, err)
              }
            }
          }
        }
      },
      {
        timeout: 30000,
        maxWait: 30000,
      }
    )
  }

  /**
   * Ogmios author's advice: https://discord.com/channels/826816523368005654/884856967233949768/889428741816717392
   */
  private async getIntersectionCandidate(): Promise<OgmiosSchema.PointOrOrigin[]> {
    let intersectionCandidates = await this.redisRepository.getIntersectionCandidates();
    if (!intersectionCandidates.length) {
      intersectionCandidates = await this.postgresRepository.getIntersectionCandidates();
    }
    return intersectionCandidates;
  }

  /**
   * Process the rollback situation when the syncer receives rollback signal
   */
  private async handleRollback(point: OgmiosSchema.PointOrOrigin, tip: OgmiosSchema.TipOrOrigin): Promise<void> {
    await this.postgresRepository.transaction(
      async (repo) => {
        const deletedBlocks = await repo.rollbackToPoint(point);
        const rollbackSlots = (tip === "origin" ? 0 : tip.slot) - (point === "origin" ? 0 : point.slot);
        console.info(`Rollback info:`, {
          point: point,
          rollback_slots: rollbackSlots,
          deleted_blocks: deletedBlocks,
        });
      },
      {
        timeout: 30000,
        maxWait: 30000,
      },
    );

    const lastSyncSlot = point === "origin" ? 0 : point.slot;
    await this.redisRepository.setLastSyncSlot(lastSyncSlot);
    await this.redisRepository.rollbackIntersectionCandidates(point);
  }
}