import invariant from "@minswap/tiny-invariant";
import { Data, Lucid, UnixTime, UTxO } from "lucid-cardano";

import { BlockfrostAdapter, LbeV2Constant, PoolV2 } from "..";
import { LbeV2Types } from "../types/lbe-v2";
import { NetworkEnvironment, NetworkId } from "../types/network";
import { runRecurringJob } from "../utils/job";
import { LbeV2 } from "../lbe-v2";

type LbeV2WorkerConstructor = {
  networkEnv: NetworkEnvironment;
  networkId: NetworkId;
  lucid: Lucid;
  blockfrostAdapter: BlockfrostAdapter;
  privateKey: string;
};

export type LbeV2EventData = {
  treasuryUtxo: UTxO;
  managerUtxo?: UTxO;
  sellerUtxos: UTxO[];
  collectedOrderUtxos: UTxO[];
  uncollectedOrderUtxos: UTxO[];
};

export class LbeV2Worker {
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
  }: LbeV2WorkerConstructor) {
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

  async getData(): Promise<LbeV2EventData[]> {
    const { treasuries: allTreasuries } =
      await this.blockfrostAdapter.getAllLbeV2Treasuries();
    const treasuryUtxos = await this.lucid.utxosByOutRef(
      allTreasuries.map((treasury) => ({
        txHash: treasury.txIn.txHash,
        outputIndex: treasury.txIn.index,
      }))
    );

    const { managers: allManagers } =
      await this.blockfrostAdapter.getAllLbeV2Managers();
    const managerUtxos = await this.lucid.utxosByOutRef(
      allManagers.map((manager) => ({
        txHash: manager.txIn.txHash,
        outputIndex: manager.txIn.index,
      }))
    );

    const { sellers: allSellers } =
      await this.blockfrostAdapter.getAllLbeV2Sellers();
    const sellerUtxos = await this.lucid.utxosByOutRef(
      allSellers.map((seller) => ({
        txHash: seller.txIn.txHash,
        outputIndex: seller.txIn.index,
      }))
    );

    const { orders: allOrders } =
      await this.blockfrostAdapter.getAllLbeV2Orders();
    const orderUtxos = await this.lucid.utxosByOutRef(
      allOrders.map((order) => ({
        txHash: order.txIn.txHash,
        outputIndex: order.txIn.index,
      }))
    );

    const mapEventData: Record<string, LbeV2EventData> = {};
    for (const treasuryUtxo of treasuryUtxos) {
      const rawTreasuryDatum = treasuryUtxo.datum;
      invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
      const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
        this.networkId,
        Data.from(rawTreasuryDatum)
      );
      const lbeId = PoolV2.computeLPAssetName(
        treasuryDatum.baseAsset,
        treasuryDatum.raiseAsset
      );

      mapEventData[lbeId] = {
        treasuryUtxo: treasuryUtxo,
        sellerUtxos: [],
        collectedOrderUtxos: [],
        uncollectedOrderUtxos: [],
      };
    }

    for (const managerUtxo of managerUtxos) {
      const rawManagerDatum = managerUtxo.datum;
      invariant(rawManagerDatum, "Manager utxo must have inline datum");
      const managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
        Data.from(rawManagerDatum)
      );
      const lbeId = PoolV2.computeLPAssetName(
        managerDatum.baseAsset,
        managerDatum.raiseAsset
      );

      mapEventData[lbeId].managerUtxo = managerUtxo;
    }

    for (const sellerUtxo of sellerUtxos) {
      const rawDatum = sellerUtxo.datum;
      invariant(rawDatum, "Seller utxo must have inline datum");
      const datum = LbeV2Types.SellerDatum.fromPlutusData(
        Data.from(rawDatum),
        this.networkId
      );
      const lbeId = PoolV2.computeLPAssetName(
        datum.baseAsset,
        datum.raiseAsset
      );

      mapEventData[lbeId].sellerUtxos.push(sellerUtxo);
    }

    for (const orderUtxo of orderUtxos) {
      const rawDatum = orderUtxo.datum;
      invariant(rawDatum, "Order utxo must have inline datum");
      const datum = LbeV2Types.OrderDatum.fromPlutusData(
        Data.from(rawDatum),
        this.networkId
      );
      const lbeId = PoolV2.computeLPAssetName(
        datum.baseAsset,
        datum.raiseAsset
      );
      if (datum.isCollected === true) {
        mapEventData[lbeId].collectedOrderUtxos.push(orderUtxo);
      } else {
        mapEventData[lbeId].uncollectedOrderUtxos.push(orderUtxo);
      }
    }

    return Object.values(mapEventData);
  }

  async countingSellers(
    eventData: LbeV2EventData,
    currentTime: UnixTime
  ): Promise<void> {
    const { treasuryUtxo, managerUtxo, sellerUtxos } = eventData;
    invariant(managerUtxo, "collectSellers: can not find manager");
    const txComplete = await new LbeV2(this.lucid).countingSellers({
      treasuryUtxo: treasuryUtxo,
      managerUtxo: managerUtxo,
      sellerUtxos: sellerUtxos.slice(0, LbeV2Constant.MINIMUM_SELLER_COLLECTED),
      currentSlot: this.lucid.utils.unixTimeToSlot(currentTime),
    });

    const signedTx = await txComplete
      .signWithPrivateKey(this.privateKey)
      .complete();

    const txId = await signedTx.submit();
  }

  // TODO: cancel by created pool
  async handleEvent(
    eventData: LbeV2EventData,
    currentTime: UnixTime
  ): Promise<void> {
    // FIND PHASE OF BATCHER
    const checkPhaseAndHandle: {
      checkFn: (
        treasuryDatum: LbeV2Types.TreasuryDatum,
        managerDatum: LbeV2Types.ManagerDatum | undefined
      ) => boolean;
      handleFn: (eventData: LbeV2EventData) => Promise<void>;
    }[] = [
      // DONT DO ANYTHING
      {
        checkFn: (treasuryDatum, _) => {
          const {
            endTime,
            isCancelled,
            totalPenalty,
            reserveRaise,
            isManagerCollected,
            totalLiquidity,
            collectedFund,
          } = treasuryDatum;
          return (
            // NOT ENCOUNTER PHASE YET
            (currentTime <= endTime && isCancelled === false) ||
            // CANCELLED EVENT, waiting for owner closing it.
            (isCancelled === true &&
              totalPenalty + reserveRaise === 0n &&
              isManagerCollected === true) ||
            // FINISH EVENT
            (totalLiquidity > 0n && collectedFund === 0n)
          );
        },
        handleFn: async (_: LbeV2EventData) => {},
      },
      // COUNTING SELLER
      {
        checkFn: (treasuryDatum, managerDatum) => {
          const { isManagerCollected } = treasuryDatum;
          if (!isManagerCollected) {
            return false;
          }
          invariant(managerDatum, "can not find manager datum");
          return managerDatum.sellerCount > 0n;
        },
        // TODO
        handleFn: async (_: LbeV2EventData) => {},
      },
      // COLLECT MANAGER
      {
        checkFn: (treasuryDatum, managerDatum) => {
          const { isManagerCollected } = treasuryDatum;
          if (!isManagerCollected) {
            return false;
          }
          invariant(managerDatum, "can not find manager datum");
          return true;
        },
        // TODO
        handleFn: async (_: LbeV2EventData) => {},
      },
      // COLLECT COLLECT ORDER
      {
        checkFn: (treasuryDatum, _) => {
          const { reserveRaise, totalPenalty, collectedFund } = treasuryDatum;
          return reserveRaise + totalPenalty > collectedFund;
        },
        // TODO
        handleFn: async (_: LbeV2EventData) => {},
      },
      // CREATE POOL
      {
        checkFn: (treasuryDatum, _) => {
          const {
            reserveRaise,
            totalPenalty,
            collectedFund,
            isCancelled,
            minimumRaise,
          } = treasuryDatum;

          return (
            reserveRaise + totalPenalty === collectedFund &&
            isCancelled === false &&
            collectedFund >= (minimumRaise ?? 1n)
          );
        },
        // TODO
        handleFn: async (_: LbeV2EventData) => {},
      },
      // REDEEM ORDERS
      {
        checkFn: (treasuryDatum, _) => {
          const { totalLiquidity, collectedFund } = treasuryDatum;
          return totalLiquidity > 0n && collectedFund > 0n;
        },
        handleFn: async (_: LbeV2EventData) => {},
      },
      // CANCEL LBE by NOT REACH MINIMUM
      {
        checkFn: (treasuryDatum, _) => {
          const {
            reserveRaise,
            totalPenalty,
            collectedFund,
            isCancelled,
            minimumRaise,
          } = treasuryDatum;

          return (
            reserveRaise + totalPenalty === collectedFund &&
            isCancelled === false &&
            collectedFund < (minimumRaise ?? 1n)
          );
        },
        // TODO
        handleFn: async (_: LbeV2EventData) => {},
      },
      // REFUND ORDERS
      {
        checkFn: (treasuryDatum, _) => {
          const { reserveRaise, totalPenalty, collectedFund, isCancelled } =
            treasuryDatum;

          return (
            reserveRaise + totalPenalty === collectedFund &&
            isCancelled === true &&
            collectedFund > 0n
          );
        },
        // TODO
        handleFn: async (_: LbeV2EventData) => {},
      },
    ];

    const rawTreasuryDatum = eventData.treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      Data.from(rawTreasuryDatum)
    );

    for (const { checkFn, handleFn } of checkPhaseAndHandle) {
      if (checkFn(treasuryDatum, undefined)) {
        await handleFn(eventData);
      }
    }
  }

  async runWorker(): Promise<void> {
    const currentSlot = await this.blockfrostAdapter.currentSlot();
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);

    // FIND ALL EVENTS DATA
    const eventsData = await this.getData();

    // LOOP EVENT
    for (const eventData of eventsData) {
      await this.handleEvent(eventData, currentTime);
    }
  }
}
