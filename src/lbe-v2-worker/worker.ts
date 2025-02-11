import invariant from "@minswap/tiny-invariant";
import { Lucid, Utxo } from "@spacebudz/lucid";

import { DataObject, LbeV2Constant, PoolV2 } from "..";
import { BlockfrostAdapter } from "../adapters/blockfrost";
import { LbeV2 } from "../lbe-v2/lbe-v2";
import { LbeV2Types } from "../types/lbe-v2";
import { NetworkEnvironment, NetworkId } from "../types/network";
import { runRecurringJob } from "../utils/job";

type LbeV2WorkerConstructor = {
  networkEnv: NetworkEnvironment;
  networkId: NetworkId;
  lucid: Lucid;
  blockfrostAdapter: BlockfrostAdapter;
  privateKey: string;
};

export type LbeV2EventData = {
  treasuryUtxo: Utxo;
  managerUtxo?: Utxo;
  sellerUtxos: Utxo[];
  collectedOrderUtxos: Utxo[];
  uncollectedOrderUtxos: Utxo[];
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
        DataObject.from(rawTreasuryDatum)
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
        DataObject.from(rawManagerDatum)
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
        DataObject.from(rawDatum),
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
        DataObject.from(rawDatum),
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
    currentTime: number
  ): Promise<void> {
    const { treasuryUtxo, managerUtxo, sellerUtxos } = eventData;
    invariant(managerUtxo, "collectSellers: can not find manager");
    const txComplete = await new LbeV2(this.lucid).countingSellers({
      treasuryUtxo: treasuryUtxo,
      managerUtxo: managerUtxo,
      sellerUtxos: sellerUtxos.slice(0, LbeV2Constant.MINIMUM_SELLER_COLLECTED),
      currentSlot: this.lucid.utils.unixTimeToSlots(currentTime),
    });

    const signedTx = await txComplete
      .signWithPrivateKey(this.privateKey)
      .commit();

    const txId = await signedTx.submit();
    console.info(`Counting seller transaction submitted successfully: ${txId}`);
  }

  async collectManager(
    eventData: LbeV2EventData,
    currentTime: number
  ): Promise<void> {
    const { treasuryUtxo, managerUtxo } = eventData;
    invariant(managerUtxo, "collectManager: can not find manager");
    const txComplete = await new LbeV2(this.lucid).collectManager({
      treasuryUtxo: treasuryUtxo,
      managerUtxo: managerUtxo,
      currentSlot: this.lucid.utils.unixTimeToSlots(currentTime),
    });

    const signedTx = await txComplete
      .signWithPrivateKey(this.privateKey)
      .commit();

    const txId = await signedTx.submit();
    console.info(`Collect manager transaction submitted successfully: ${txId}`);
  }

  async collectOrders(
    eventData: LbeV2EventData,
    currentTime: number
  ): Promise<void> {
    const { treasuryUtxo, uncollectedOrderUtxos } = eventData;
    const txComplete = await new LbeV2(this.lucid).collectOrders({
      treasuryUtxo: treasuryUtxo,
      orderUtxos: uncollectedOrderUtxos,
      currentSlot: this.lucid.utils.unixTimeToSlots(currentTime),
    });

    const signedTx = await txComplete
      .signWithPrivateKey(this.privateKey)
      .commit();

    const txId = await signedTx.submit();
    console.info(`Collect orders transaction submitted successfully: ${txId}`);
  }

  async createAmmPoolOrCancelEvent(
    eventData: LbeV2EventData,
    currentTime: number
  ): Promise<void> {
    const { treasuryUtxo } = eventData;
    const rawTreasuryDatum = eventData.treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
    );

    if (treasuryDatum.collectedFund < (treasuryDatum.minimumRaise ?? 1n)) {
      const txComplete = await new LbeV2(this.lucid).cancelEvent({
        treasuryUtxo: treasuryUtxo,
        cancelData: { reason: LbeV2Types.CancelReason.NOT_REACH_MINIMUM },
        currentSlot: this.lucid.utils.unixTimeToSlots(currentTime),
      });

      const signedTx = await txComplete
        .signWithPrivateKey(this.privateKey)
        .commit();

      const txId = await signedTx.submit();
      console.info(
        `Cancel event by not reach min raise transaction submitted successfully: ${txId}`
      );
      return;
    }

    const ammFactory = await this.blockfrostAdapter.getFactoryV2ByPair(
      treasuryDatum.baseAsset,
      treasuryDatum.raiseAsset
    );
    if (ammFactory === null) {
      const poolV2 = await this.blockfrostAdapter.getV2PoolByPair(
        treasuryDatum.baseAsset,
        treasuryDatum.raiseAsset
      );
      invariant(poolV2 !== null, "Can not find pool");

      const ammPoolUtxos = await this.lucid.utxosByOutRef([
        { txHash: poolV2.txIn.txHash, outputIndex: poolV2.txIn.index },
      ]);
      invariant(ammPoolUtxos.length === 1, "Can not find amm pool Utxo");

      const txComplete = await new LbeV2(this.lucid).cancelEvent({
        treasuryUtxo: treasuryUtxo,
        cancelData: {
          reason: LbeV2Types.CancelReason.CREATED_POOL,
          ammPoolUtxo: ammPoolUtxos[0],
        },
        currentSlot: this.lucid.utils.unixTimeToSlots(currentTime),
      });
      const signedTx = await txComplete
        .signWithPrivateKey(this.privateKey)
        .commit();

      const txId = await signedTx.submit();
      console.info(
        `Cancel event by created pool transaction submitted successfully: ${txId}`
      );
    } else {
      const ammFactoryUtxos = await this.lucid.utxosByOutRef([
        { txHash: ammFactory.txIn.txHash, outputIndex: ammFactory.txIn.index },
      ]);
      invariant(ammFactoryUtxos.length === 1, "Can not find amm factory Utxo");

      const txComplete = await new LbeV2(this.lucid).createAmmPool({
        treasuryUtxo: treasuryUtxo,
        ammFactoryUtxo: ammFactoryUtxos[0],
        currentSlot: this.lucid.utils.unixTimeToSlots(currentTime),
      });

      const signedTx = await txComplete
        .signWithPrivateKey(this.privateKey)
        .commit();

      const txId = await signedTx.submit();
      console.info(
        `Create AMM Pool transaction submitted successfully: ${txId}`
      );
    }
  }

  async redeemOrders(
    eventData: LbeV2EventData,
    currentTime: number
  ): Promise<void> {
    const { treasuryUtxo, collectedOrderUtxos } = eventData;

    const txComplete = await new LbeV2(this.lucid).redeemOrders({
      treasuryUtxo: treasuryUtxo,
      orderUtxos: collectedOrderUtxos,
      currentSlot: this.lucid.utils.unixTimeToSlots(currentTime),
    });

    const signedTx = await txComplete
      .signWithPrivateKey(this.privateKey)
      .commit();

    const txId = await signedTx.submit();
    console.info(`Redeem Orders transaction submitted successfully: ${txId}`);
  }

  async refundOrders(
    eventData: LbeV2EventData,
    currentTime: number
  ): Promise<void> {
    const { treasuryUtxo, collectedOrderUtxos } = eventData;

    const txComplete = await new LbeV2(this.lucid).refundOrders({
      treasuryUtxo: treasuryUtxo,
      orderUtxos: collectedOrderUtxos,
      currentSlot: this.lucid.utils.unixTimeToSlots(currentTime),
    });

    const signedTx = await txComplete
      .signWithPrivateKey(this.privateKey)
      .commit();

    const txId = await signedTx.submit();
    console.info(`Refund Orders transaction submitted successfully: ${txId}`);
  }

  async handleEvent(
    eventData: LbeV2EventData,
    currentTime: number
  ): Promise<"skip" | "success"> {
    // FIND PHASE OF BATCHER
    const checkPhaseAndHandle: {
      checkFn: (
        treasuryDatum: LbeV2Types.TreasuryDatum,
        managerDatum: LbeV2Types.ManagerDatum | undefined
      ) => boolean;
      handleFn: (
        eventData: LbeV2EventData,
        currentTime: number
      ) => Promise<void>;
    }[] = [
      // COUNTING SELLER
      {
        checkFn: (treasuryDatum, managerDatum) => {
          const { isManagerCollected } = treasuryDatum;
          if (isManagerCollected) {
            return false;
          }
          invariant(managerDatum, "can not find manager datum");
          return managerDatum.sellerCount > 0n;
        },
        handleFn: this.countingSellers.bind(this),
      },
      // COLLECT MANAGER
      {
        checkFn: (treasuryDatum, managerDatum) => {
          const { isManagerCollected } = treasuryDatum;
          if (isManagerCollected) {
            return false;
          }
          invariant(managerDatum, "can not find manager datum");
          return true;
        },
        handleFn: this.collectManager.bind(this),
      },
      // COLLECT COLLECT ORDER
      {
        checkFn: (treasuryDatum, _) => {
          const { reserveRaise, totalPenalty, collectedFund } = treasuryDatum;
          return reserveRaise + totalPenalty > collectedFund;
        },
        handleFn: this.collectOrders.bind(this),
      },
      // CREATE POOL OR CANCEL EVENT
      {
        checkFn: (treasuryDatum, _) => {
          const {
            reserveRaise,
            totalPenalty,
            collectedFund,
            isCancelled,
            totalLiquidity,
          } = treasuryDatum;

          return (
            reserveRaise + totalPenalty === collectedFund &&
            isCancelled === false &&
            totalLiquidity === 0n
          );
        },
        handleFn: this.createAmmPoolOrCancelEvent.bind(this),
      },
      // REDEEM ORDERS
      {
        checkFn: (treasuryDatum, _) => {
          const { totalLiquidity, collectedFund } = treasuryDatum;
          return totalLiquidity > 0n && collectedFund > 0n;
        },
        handleFn: this.redeemOrders.bind(this),
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
        handleFn: this.refundOrders.bind(this),
      },
    ];

    const rawTreasuryDatum = eventData.treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
    );
    const {
      endTime,
      isCancelled,
      totalPenalty,
      reserveRaise,
      isManagerCollected,
      totalLiquidity,
      collectedFund,
    } = treasuryDatum;
    if (
      // NOT ENCOUNTER PHASE YET
      (currentTime <= Number(endTime) && isCancelled === false) ||
      // CANCELLED EVENT, waiting for owner closing it.
      (isCancelled === true &&
        totalPenalty + reserveRaise === 0n &&
        isManagerCollected === true) ||
      // FINISH EVENT
      (totalLiquidity > 0n && collectedFund === 0n)
    ) {
      return "skip";
    }

    let managerDatum = undefined;
    if (eventData.managerUtxo !== undefined) {
      const rawManagerDatum = eventData.managerUtxo.datum;
      invariant(rawManagerDatum, "Treasury utxo must have inline datum");
      managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
        DataObject.from(rawManagerDatum)
      );
    }

    for (const { checkFn, handleFn } of checkPhaseAndHandle) {
      if (checkFn(treasuryDatum, managerDatum)) {
        await handleFn(eventData, currentTime);
        return "success";
      }
    }
    return "success";
  }

  async runWorker(): Promise<void> {
    const eventsData = await this.getData();
    const currentSlot = await this.blockfrostAdapter.currentSlot();
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);

    for (const eventData of eventsData) {
      try {
        const handleEventResult = await this.handleEvent(
          eventData,
          currentTime
        );
        if (handleEventResult === "success") {
          return;
        }
      } catch (err) {
        const rawTreasuryDatum = eventData.treasuryUtxo.datum;
        invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
        const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
          this.networkId,
          DataObject.from(rawTreasuryDatum)
        );
        console.error(
          `Fail to run worker for LBE ${PoolV2.computeLPAssetName(treasuryDatum.baseAsset, treasuryDatum.raiseAsset)}: ${err}`
        );
      }
    }
  }
}
