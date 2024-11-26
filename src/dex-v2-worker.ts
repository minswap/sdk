import { Lucid } from "@minswap/lucid-cardano";

import { BlockfrostAdapter, DexV2, DexV2Constant, OrderV2 } from ".";
import { NetworkEnvironment, NetworkId } from "./types/network";
import { runRecurringJob } from "./utils/job";

type DexV2WorkerConstructor = {
  networkEnv: NetworkEnvironment;
  networkId: NetworkId;
  lucid: Lucid;
  blockfrostAdapter: BlockfrostAdapter;
  privateKey: string;
};

export class DexV2Worker {
  private readonly networkEnv: NetworkEnvironment;
  private readonly networkId: NetworkId;
  private readonly lucid: Lucid;
  private readonly blockfrostAdapter: BlockfrostAdapter;
  private readonly privateKey: string;

  constructor({
    networkEnv,
    networkId,
    lucid,
    blockfrostAdapter,
    privateKey,
  }: DexV2WorkerConstructor) {
    this.networkEnv = networkEnv;
    this.networkId = networkId;
    this.lucid = lucid;
    this.blockfrostAdapter = blockfrostAdapter;
    this.privateKey = privateKey;
  }

  async start(): Promise<void> {
    await runRecurringJob({
      name: "lbe v2 batcher",
      interval: 1000 * 30, // 30s
      job: () => this.runWorker(),
    });
  }

  async runWorker(): Promise<void> {
    const { orders: allOrders } = await this.blockfrostAdapter.getAllV2Orders();
    const currentSlot = await this.blockfrostAdapter.currentSlot();
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);
    const expiredOrders: OrderV2.State[] = [];
    const mapDatum: Record<string, string> = {};
    for (const order of allOrders) {
      const orderDatum = order.datum;
      const expiredOptions = orderDatum.expiredOptions;
      if (expiredOptions === undefined) {
        continue;
      }
      if (expiredOptions.expiredTime >= BigInt(currentTime)) {
        continue;
      }
      if (
        expiredOptions.maxCancellationTip < DexV2Constant.DEFAULT_CANCEL_TIPS
      ) {
        continue;
      }

      const receiverDatum = orderDatum.refundReceiverDatum;
      if (receiverDatum.type === OrderV2.ExtraDatumType.INLINE_DATUM) {
        let rawDatum: string | undefined = undefined;
        try {
          rawDatum = await this.blockfrostAdapter.getDatumByDatumHash(
            receiverDatum.hash
          );
          // eslint-disable-next-line unused-imports/no-unused-vars
        } catch (_err) {
          continue;
        }
        mapDatum[receiverDatum.hash] = rawDatum;
      }
      expiredOrders.push(order);
      if (expiredOrders.length === 20) {
        break;
      }
    }
    if (expiredOrders.length > 0) {
      const orderUtxos = await this.lucid.utxosByOutRef(
        expiredOrders.map((state) => ({
          txHash: state.txIn.txHash,
          outputIndex: state.txIn.index,
        }))
      );
      const txComplete = await new DexV2(
        this.lucid,
        this.blockfrostAdapter
      ).cancelExpiredOrders({
        orderUtxos: orderUtxos,
        currentSlot,
        extraDatumMap: mapDatum,
      });

      const signedTx = await txComplete
        .signWithPrivateKey(this.privateKey)
        .complete();

      const txId = await signedTx.submit();
      console.info(`Transaction submitted successfully: ${txId}`);
    }
  }
}
