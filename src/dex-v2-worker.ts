import { Data, Lucid } from "@minswap/lucid-cardano";

import { BlockfrostAdapter, DexV2, DexV2Constant, OrderV2 } from ".";
import { runRecurringJob } from "./utils/job";

type DexV2WorkerConstructor = {
  lucid: Lucid;
  blockfrostAdapter: BlockfrostAdapter;
  privateKey: string;
};

export class DexV2Worker {
  private readonly lucid: Lucid;
  private readonly blockfrostAdapter: BlockfrostAdapter;
  private readonly privateKey: string;

  constructor({
    lucid,
    blockfrostAdapter,
    privateKey,
  }: DexV2WorkerConstructor) {
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
    console.info("start run dex v2 worker");
    const { orders: allOrders } = await this.blockfrostAdapter.getAllV2Orders();
    const currentSlot = await this.blockfrostAdapter.currentSlot();
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);
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

      const mapDatum: Record<string, string> = {};
      const receiverDatum = orderDatum.refundReceiverDatum;
      let rawDatum: string | undefined = undefined;
      if (receiverDatum.type === OrderV2.ExtraDatumType.INLINE_DATUM) {
        try {
          rawDatum = await this.blockfrostAdapter.getDatumByDatumHash(
            receiverDatum.hash
          );
          mapDatum[receiverDatum.hash] = rawDatum;
          // eslint-disable-next-line unused-imports/no-unused-vars
        } catch (_err) {
          continue;
        }
      }

      const orderUtxos = await this.lucid.utxosByOutRef([
        {
          txHash: order.txIn.txHash,
          outputIndex: order.txIn.index,
        },
      ]);
      if (orderUtxos.length === 0) {
        continue;
      }
      try {
        orderUtxos[0].datum = Data.to(OrderV2.Datum.toPlutusData(orderDatum));
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
        break;
      } catch (err) {
        console.error(err);
        continue;
      }
    }
  }
}
