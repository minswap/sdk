import { Addresses, Crypto, Lucid } from "@spacebudz/lucid";

import { DexV2, DexV2Constant, OrderV2 } from ".";
import { BlockfrostAdapter } from "./adapters";
import { runRecurringJob } from "./utils/job";

type DexV2WorkerConstructor = {
  lucid: Lucid;
  blockfrostAdapter: BlockfrostAdapter;
  privateKey: string;
};

export class ExpiredOrderMonitor {
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
      name: "expired order canceller",
      interval: 1000 * 30, // 30s
      job: () => this.runWorker(),
    });
  }

  async runWorker(): Promise<void> {
    console.info("starting expired order canceller");
    const { orders: allOrders } = await this.blockfrostAdapter.getAllV2Orders();
    const currentSlot = await this.blockfrostAdapter.currentSlot();
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const mapDatum: Record<string, string> = {};
    const orders: OrderV2.State[] = [];
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
      let rawDatum: string | undefined = undefined;
      if (
        receiverDatum.type === OrderV2.ExtraDatumType.INLINE_DATUM ||
        receiverDatum.type === OrderV2.ExtraDatumType.DATUM_HASH
      ) {
        try {
          rawDatum = await this.blockfrostAdapter.getDatumByDatumHash(
            receiverDatum.hash
          );
          mapDatum[receiverDatum.hash] = rawDatum;
          // eslint-disable-next-line unused-imports/no-unused-vars
        } catch (_err) {
          if (receiverDatum.type === OrderV2.ExtraDatumType.INLINE_DATUM) {
            // if receiver Datum type is INLINE_DATUM, skip this order.
            continue;
          }
        }
      }
      orders.push(order);

      // CANCEL MAX 20 Orders
      if (orders.length === 20) {
        break;
      }
    }

    if (orders.length === 0) {
      console.info(`SKIP | No orders.`);
      return;
    }
    const orderUtxos = await this.lucid.utxosByOutRef(
      orders.map((order) => ({
        txHash: order.txIn.txHash,
        outputIndex: order.txIn.index,
      }))
    );
    if (orderUtxos.length === 0) {
      console.info(`SKIP | Can not find any order utxos.`);
      return;
    }
    try {
      const credential = Crypto.privateKeyToDetails(this.privateKey).credential;
      const address = Addresses.credentialToAddress(
        this.lucid.network,
        credential
      );
      const availableUtxos = await this.lucid.utxosAt(address);
      const txComplete = await new DexV2(
        this.lucid,
        this.blockfrostAdapter
      ).cancelExpiredOrders({
        orderUtxos: orderUtxos,
        currentSlot,
        availableUtxos,
        extraDatumMap: mapDatum,
      });
      const signedTx = await txComplete
        .signWithPrivateKey(this.privateKey)
        .commit();

      const txId = await signedTx.submit();
      console.info(`Transaction submitted successfully: ${txId}`);
    } catch (_err) {
      console.error(
        `Error when the worker runs: orders ${orders.map((order) => `${order.txIn.txHash}#${order.txIn.index}`).join(", ")}`,
        _err
      );
    }
  }
}
