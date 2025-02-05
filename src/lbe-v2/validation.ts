import invariant from "@minswap/tiny-invariant";
import { Addresses, Lucid } from "@spacebudz/lucid";

import {
  Asset, DataObject,
  DexV2Calculation,
  LbeV2Constant,
  MAX_POOL_V2_TRADING_FEE_NUMERATOR,
  MIN_POOL_V2_TRADING_FEE_NUMERATOR,
  NetworkId,
  PoolV2,
} from "..";
import { FactoryV2 } from "../types/factory";
import { LbeV2Types } from "../types/lbe-v2";
import {
  AddSellersOptions,
  CloseEventOptions,
  CollectManagerOptions,
  CollectOrdersOptions,
  CountingSellersOptions,
  CreateAmmPoolTxOptions,
  LbeV2CancelEventOptions,
  LbeV2CreateEventOptions,
  LbeV2DepositOrWithdrawOptions,
  LbeV2ProjectDetails,
  LbeV2UpdateEventOptions,
  RedeemOrdersOptions,
  RefundOrdersOptions,
} from "./type";

export function validateCreateEvent(
  options: LbeV2CreateEventOptions,
  lucid: Lucid,
  networkId: NetworkId
): void {
  const { lbeV2Parameters, currentSlot, factoryUtxo, projectDetails } = options;
  const currentTime = lucid.utils.slotsToUnixTime(currentSlot);
  const { baseAsset, raiseAsset } = lbeV2Parameters;
  const datum = factoryUtxo.datum;
  invariant(datum, "Factory utxo must have inline datum");
  const factory = LbeV2Types.FactoryDatum.fromPlutusData(DataObject.from(datum));
  const config = LbeV2Constant.CONFIG[networkId];
  invariant(
    config.factoryAsset in factoryUtxo.assets,
    "Factory utxo assets must have factory asset"
  );
  const lbeV2Id = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  invariant(
    factory.head < lbeV2Id && lbeV2Id < factory.tail,
    "LBE ID name must be between factory head and tail"
  );
  validateLbeV2Parameters(lbeV2Parameters, currentTime);
  if (projectDetails !== undefined) {
    validateProjectDetails(projectDetails);
  }
}

export function validateLbeV2Parameters(
  params: LbeV2Types.LbeV2Parameters,
  currentTime: number
): void {
  const {
    poolBaseFee,
    penaltyConfig,
    reserveBase,
    minimumRaise,
    maximumRaise,
    minimumOrderRaise,
    poolAllocation,
    startTime,
    endTime,
    baseAsset,
    raiseAsset,
  } = params;
  invariant(
    Asset.toString(baseAsset) !== Asset.toString(raiseAsset),
    "Base Asset, Raise Asset must be different"
  );
  invariant(
    Asset.toString(baseAsset) !== "lovelace",
    "Base Asset must not equal ADA"
  );
  invariant(startTime >= BigInt(currentTime), "LBE must start in future");
  invariant(startTime < endTime, "StartTime < EndTime");
  invariant(
    endTime - startTime <= LbeV2Constant.MAX_DISCOVERY_RANGE,
    "Discovery Phase must in a month"
  );
  invariant(
    poolAllocation >= LbeV2Constant.MIN_POOL_ALLOCATION_POINT,
    `Pool Allocation must greater than ${LbeV2Constant.MIN_POOL_ALLOCATION_POINT}`
  );
  invariant(
    poolAllocation <= LbeV2Constant.MAX_POOL_ALLOCATION_POINT,
    `Pool Allocation must less than ${LbeV2Constant.MAX_POOL_ALLOCATION_POINT}`
  );
  if (minimumOrderRaise) {
    invariant(minimumOrderRaise > 0n, "Minimum Order > 0");
  }
  if (maximumRaise) {
    invariant(maximumRaise > 0n, "Maximum Raise > 0");
  }
  if (minimumRaise) {
    invariant(minimumRaise > 0n, "Minimum Raise > 0");
    if (maximumRaise !== undefined) {
      invariant(minimumRaise < maximumRaise, "Minimum Raise < Maximum Raise");
    }
  }
  invariant(reserveBase > 0n, "Reserve Base > 0");
  if (penaltyConfig) {
    const { penaltyStartTime, percent } = penaltyConfig;
    invariant(penaltyStartTime > startTime, "Penalty Start Time > Start Time");
    invariant(penaltyStartTime < endTime, "Penalty Start Time < End Time");
    invariant(
      penaltyStartTime >= endTime - LbeV2Constant.MAX_PENALTY_RANGE,
      "Maximum penalty period of 2 final days"
    );
    invariant(percent > 0n, "Penalty Percent > 0");
    invariant(
      percent <= LbeV2Constant.MAX_PENALTY_RATE,
      `Penalty Percent <= ${LbeV2Constant.MAX_PENALTY_RATE}`
    );
  }
  const poolBaseFeeMin = MIN_POOL_V2_TRADING_FEE_NUMERATOR;
  const poolBaseFeeMax = MAX_POOL_V2_TRADING_FEE_NUMERATOR;
  invariant(
    poolBaseFee >= poolBaseFeeMin && poolBaseFee <= poolBaseFeeMax,
    `Pool Base Fee must in range ${poolBaseFeeMin} - ${poolBaseFeeMax}`
  );
}

export function validateProjectDetails(details: LbeV2ProjectDetails): void {
  const { eventName, description, tokenomics } = details;

  invariant(eventName.length <= 50, "Event Name is too long");
  invariant(description?.length ?? 0 < 1000, "Event Description is too long");
  let totalPercentage = 0;
  for (const d of tokenomics ?? []) {
    invariant(d.tag.length <= 50, "tokenomic tag is too long");
    const percentage = Number(d.percentage);
    invariant(
      !isNaN(percentage) && percentage > 0 && percentage <= 100,
      "invalid percentage"
    );
    totalPercentage += percentage;
  }
  invariant(
    totalPercentage === 100 || tokenomics === undefined,
    "total percentage is not 100%"
  );
}

export function validateUpdateEvent(
  options: LbeV2UpdateEventOptions,
  lucid: Lucid,
  networkId: NetworkId
): void {
  const { owner, treasuryUtxo, lbeV2Parameters, currentSlot, projectDetails } =
    options;
  const config = LbeV2Constant.CONFIG[networkId];
  const currentTime = lucid.utils.slotsToUnixTime(currentSlot);
  const datum = treasuryUtxo.datum;
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );
  invariant(datum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(datum)
  );
  invariant(
    currentTime < treasuryDatum.startTime,
    "validateUpdateLbe: currentTime must be before start time"
  );
  invariant(
    treasuryDatum.isCancelled === false,
    "validateUpdateLbe: LBE is cancelled"
  );
  invariant(
    Asset.toString(treasuryDatum.baseAsset) ===
      Asset.toString(lbeV2Parameters.baseAsset),
    "Invalid base asset"
  );
  invariant(
    Asset.toString(treasuryDatum.raiseAsset) ===
      Asset.toString(lbeV2Parameters.raiseAsset),
    "Invalid raise asset"
  );
  invariant(owner === treasuryDatum.owner, "Invalid owner");
  validateLbeV2Parameters(lbeV2Parameters, currentTime);
  if (projectDetails !== undefined) {
    validateProjectDetails(projectDetails);
  }
}

export function validateCancelEvent(
  options: LbeV2CancelEventOptions,
  lucid: Lucid,
  networkId: NetworkId
): void {
  const { treasuryUtxo, cancelData, currentSlot } = options;
  const config = LbeV2Constant.CONFIG[networkId];

  const currentTime = lucid.utils.slotsToUnixTime(currentSlot);
  const datum = treasuryUtxo.datum;
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );
  invariant(datum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(datum)
  );
  const {
    revocable,
    baseAsset,
    raiseAsset,
    endTime,
    startTime,
    totalLiquidity,
    minimumRaise,
    isManagerCollected,
    totalPenalty,
    reserveRaise,
    owner,
    isCancelled,
  } = treasuryDatum;
  const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
  invariant(isCancelled === false, "Event already cancelled");
  switch (cancelData.reason) {
    case LbeV2Types.CancelReason.BY_OWNER: {
      invariant(
        owner === cancelData.owner,
        "validateCancelEvent: Invalid project owner"
      );
      if (revocable) {
        invariant(
          BigInt(currentTime) < endTime,
          "Cancel before discovery phase end"
        );
      } else {
        invariant(
          BigInt(currentTime) < startTime,
          "Cancel before discovery phase start"
        );
      }
      break;
    }
    case LbeV2Types.CancelReason.CREATED_POOL: {
      const ammPoolUtxo = cancelData.ammPoolUtxo;
      invariant(ammPoolUtxo.datum, "ammFactory utxo must have inline datum");
      const ammPool = PoolV2.Datum.fromPlutusData(DataObject.from(ammPoolUtxo.datum));
      invariant(
        lbeId === PoolV2.computeLPAssetName(ammPool.assetA, ammPool.assetB),
        "treasury and Amm Pool must share the same lbe id"
      );
      invariant(totalLiquidity === 0n, "LBE has created pool");
      break;
    }
    case LbeV2Types.CancelReason.NOT_REACH_MINIMUM: {
      if (minimumRaise && isManagerCollected) {
        invariant(
          reserveRaise + totalPenalty < minimumRaise,
          "Not pass minimum raise"
        );
      }
      break;
    }
  }
}

export function validateDepositOrWithdrawOrder(
  options: LbeV2DepositOrWithdrawOptions,
  lucid: Lucid,
  networkId: NetworkId
): void {
  const {
    treasuryUtxo,
    sellerUtxo,
    existingOrderUtxos: orderUtxos,
    currentSlot,
    action,
  } = options;
  const currentTime = lucid.utils.slotsToUnixTime(currentSlot);
  const config = LbeV2Constant.CONFIG[networkId];

  const rawTreasuryDatum = treasuryUtxo.datum;
  invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(rawTreasuryDatum)
  );
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );

  const rawSellerDatum = sellerUtxo.datum;
  invariant(rawSellerDatum, "Seller utxo must have inline datum");
  const sellerDatum = LbeV2Types.SellerDatum.fromPlutusData(
    DataObject.from(rawSellerDatum),
    networkId
  );
  invariant(
    config.sellerAsset in sellerUtxo.assets,
    "Seller utxo assets must have seller asset"
  );

  const orderDatums = orderUtxos.map((utxo) => {
    const rawOrderDatum = utxo.datum;
    invariant(rawOrderDatum, "Order utxo must have inline datum");
    invariant(
      config.orderAsset in utxo.assets,
      "Order utxo assets must have order asset"
    );
    return LbeV2Types.OrderDatum.fromPlutusData(
      DataObject.from(rawOrderDatum),
      networkId
    );
  });

  invariant(
    PoolV2.computeLPAssetName(
      treasuryDatum.baseAsset,
      treasuryDatum.raiseAsset
    ) ===
      PoolV2.computeLPAssetName(sellerDatum.baseAsset, sellerDatum.raiseAsset),
    "treasury, seller must share the same lbe id"
  );
  let currentAmount = 0n;
  for (const orderDatum of orderDatums) {
    invariant(
      PoolV2.computeLPAssetName(
        treasuryDatum.baseAsset,
        treasuryDatum.raiseAsset
      ) ===
        PoolV2.computeLPAssetName(orderDatum.baseAsset, orderDatum.raiseAsset),
      "treasury, order must share the same lbe id"
    );

    const ownerPaymentCredential = Addresses.inspect(
      orderDatum.owner
    ).payment;
    invariant(
      ownerPaymentCredential && ownerPaymentCredential.type === "Key",
      "Order owner must be pubkey hash"
    );
    currentAmount += orderDatum.amount;
  }
  invariant(treasuryDatum.isCancelled === false, "lbe has cancelled");
  let newAmount: bigint;
  if (action.type === "deposit") {
    newAmount = currentAmount + action.additionalAmount;
  } else {
    invariant(
      currentAmount >= action.withdrawalAmount,
      `Exceed the maximum withdrawal, withdrawal: ${action.withdrawalAmount}, available: ${currentAmount}`
    );
    newAmount = currentAmount - action.withdrawalAmount;
  }
  invariant(
    treasuryDatum.startTime <= currentTime,
    `The event hasn't really started yet, please wait a little longer.`
  );
  invariant(currentTime <= treasuryDatum.endTime, "The event has been ended!");
  const minimumRaise = treasuryDatum.minimumOrderRaise;
  if (minimumRaise !== undefined) {
    invariant(
      newAmount === 0n || newAmount >= minimumRaise,
      "Using Seller Tx: Order must higher than min raise"
    );
  }
}

export function validateCloseEvent(
  options: CloseEventOptions,
  networkId: NetworkId
): void {
  const { treasuryUtxo, headFactoryUtxo, tailFactoryUtxo, owner } = options;
  const config = LbeV2Constant.CONFIG[networkId];

  const rawTreasuryDatum = treasuryUtxo.datum;
  invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(rawTreasuryDatum)
  );
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );
  const lbeId = PoolV2.computeLPAssetName(
    treasuryDatum.baseAsset,
    treasuryDatum.raiseAsset
  );

  const rawHeadFactoryDatum = headFactoryUtxo.datum;
  invariant(rawHeadFactoryDatum, "Treasury utxo must have inline datum");
  const headFactoryDatum = LbeV2Types.FactoryDatum.fromPlutusData(
    DataObject.from(rawHeadFactoryDatum)
  );
  invariant(
    config.factoryAsset in headFactoryUtxo.assets,
    "Factory utxo assets must have factory asset"
  );

  const rawTailFactoryDatum = tailFactoryUtxo.datum;
  invariant(rawTailFactoryDatum, "Treasury utxo must have inline datum");
  const tailFactoryDatum = LbeV2Types.FactoryDatum.fromPlutusData(
    DataObject.from(rawTailFactoryDatum)
  );
  invariant(
    config.factoryAsset in tailFactoryUtxo.assets,
    "Factory utxo assets must have factory asset"
  );

  invariant(headFactoryDatum.tail === lbeId, "Head Factory is invalid");
  invariant(tailFactoryDatum.head === lbeId, "Tail Factory is invalid");

  invariant(treasuryDatum.isCancelled === true, "lbe must be cancelled");
  invariant(treasuryDatum.owner === owner, "Only Owner can close");
  invariant(treasuryDatum.isManagerCollected, "Manager must be collected");
  invariant(
    treasuryDatum.totalPenalty === 0n && treasuryDatum.reserveRaise === 0n,
    "All Orders have been refunded"
  );
}

export function validateAddSeller(
  options: AddSellersOptions,
  lucid: Lucid,
  networkId: NetworkId
): void {
  const { addSellerCount, treasuryUtxo, managerUtxo, currentSlot } = options;
  const currentTime = lucid.utils.slotsToUnixTime(currentSlot);
  const config = LbeV2Constant.CONFIG[networkId];

  const rawTreasuryDatum = treasuryUtxo.datum;
  invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(rawTreasuryDatum)
  );
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );

  const rawManagerDatum = managerUtxo.datum;
  invariant(rawManagerDatum, "Manager utxo must have inline datum");
  const managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
    DataObject.from(rawManagerDatum)
  );
  invariant(
    config.managerAsset in managerUtxo.assets,
    "Manager utxo assets must have manager asset"
  );

  invariant(addSellerCount > 0, "Must add at least one seller");
  invariant(
    PoolV2.computeLPAssetName(
      treasuryDatum.baseAsset,
      treasuryDatum.raiseAsset
    ) ===
      PoolV2.computeLPAssetName(
        managerDatum.baseAsset,
        managerDatum.raiseAsset
      ),
    "treasury, manager must have same Lbe ID"
  );
  invariant(
    currentTime < treasuryDatum.endTime,
    "Must add seller before encounter phase"
  );
}

export function validateCountingSeller(
  options: CountingSellersOptions,
  lucid: Lucid,
  networkId: NetworkId
): void {
  const { treasuryUtxo, managerUtxo, sellerUtxos, currentSlot } = options;
  const currentTime = lucid.utils.slotsToUnixTime(currentSlot);
  const config = LbeV2Constant.CONFIG[networkId];

  const rawTreasuryDatum = treasuryUtxo.datum;
  invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(rawTreasuryDatum)
  );
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );

  const rawManagerDatum = managerUtxo.datum;
  invariant(rawManagerDatum, "Manager utxo must have inline datum");
  const managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
    DataObject.from(rawManagerDatum)
  );
  invariant(
    config.managerAsset in managerUtxo.assets,
    "Manager utxo assets must have manager asset"
  );
  invariant(
    PoolV2.computeLPAssetName(
      treasuryDatum.baseAsset,
      treasuryDatum.raiseAsset
    ) ===
      PoolV2.computeLPAssetName(
        managerDatum.baseAsset,
        managerDatum.raiseAsset
      ),
    "treasury, manager must share the same lbe id"
  );

  const _sellerDatums = sellerUtxos.map((utxo) => {
    const rawSellerDatum = utxo.datum;
    invariant(rawSellerDatum, "Seller utxo must have inline datum");
    invariant(
      config.sellerAsset in utxo.assets,
      "Seller utxo assets must have seller asset"
    );
    const sellerDatum = LbeV2Types.SellerDatum.fromPlutusData(
      DataObject.from(rawSellerDatum),
      networkId
    );
    invariant(
      PoolV2.computeLPAssetName(
        treasuryDatum.baseAsset,
        treasuryDatum.raiseAsset
      ) ===
        PoolV2.computeLPAssetName(
          sellerDatum.baseAsset,
          sellerDatum.raiseAsset
        ),
      "treasury, seller must share the same lbe id"
    );
    return sellerDatum;
  });

  invariant(
    sellerUtxos.length >= LbeV2Constant.MINIMUM_SELLER_COLLECTED ||
      BigInt(sellerUtxos.length) === managerDatum.sellerCount,
    "not collect enough sellers"
  );
  invariant(sellerUtxos.length > 0, "At least one seller input is required.");
  invariant(
    currentTime > treasuryDatum.endTime || treasuryDatum.isCancelled === true,
    "lbe is not cancel or discovery phase is not ended"
  );
}

export function validateCollectManager(
  options: CollectManagerOptions,
  lucid: Lucid,
  networkId: NetworkId
): void {
  const { treasuryUtxo, managerUtxo, currentSlot } = options;
  const currentTime = lucid.utils.slotsToUnixTime(currentSlot);
  const config = LbeV2Constant.CONFIG[networkId];

  const rawTreasuryDatum = treasuryUtxo.datum;
  invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(rawTreasuryDatum)
  );
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );

  const rawManagerDatum = managerUtxo.datum;
  invariant(rawManagerDatum, "Manager utxo must have inline datum");
  const managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
    DataObject.from(rawManagerDatum)
  );
  invariant(
    config.managerAsset in managerUtxo.assets,
    "Manager utxo assets must have manager asset"
  );
  invariant(
    PoolV2.computeLPAssetName(
      treasuryDatum.baseAsset,
      treasuryDatum.raiseAsset
    ) ===
      PoolV2.computeLPAssetName(
        managerDatum.baseAsset,
        managerDatum.raiseAsset
      ),
    "treasury, manager must share the same lbe id"
  );

  invariant(
    currentTime > treasuryDatum.endTime || treasuryDatum.isCancelled === true,
    "lbe is not cancel or discovery phase is not ended"
  );
  invariant(
    managerDatum.sellerCount === 0n,
    "Must collect all seller before collecting manager"
  );
  invariant(
    treasuryDatum.isManagerCollected === false,
    "LBE collected manager yet"
  );
}

export function validateCollectOrders(
  options: CollectOrdersOptions,
  networkId: NetworkId
): void {
  const { treasuryUtxo, orderUtxos } = options;
  const config = LbeV2Constant.CONFIG[networkId];

  const rawTreasuryDatum = treasuryUtxo.datum;
  invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(rawTreasuryDatum)
  );
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );
  let collectAmount = 0n;
  for (const orderUtxo of orderUtxos) {
    const rawOrderDatum = orderUtxo.datum;
    invariant(rawOrderDatum, "Order utxo must have inline datum");
    const orderDatum = LbeV2Types.OrderDatum.fromPlutusData(
      DataObject.from(rawOrderDatum),
      networkId
    );
    invariant(orderDatum.isCollected === false, "Order must not be collected");
    invariant(
      config.orderAsset in orderUtxo.assets,
      "Order utxo assets must have order asset"
    );
    invariant(
      PoolV2.computeLPAssetName(
        treasuryDatum.baseAsset,
        treasuryDatum.raiseAsset
      ) ===
        PoolV2.computeLPAssetName(orderDatum.baseAsset, orderDatum.raiseAsset),
      "treasury, order must share the same lbe id"
    );
    collectAmount += orderDatum.amount + orderDatum.penaltyAmount;
  }

  const remainAmount =
    treasuryDatum.reserveRaise +
    treasuryDatum.totalPenalty -
    treasuryDatum.collectedFund;
  invariant(
    treasuryDatum.isManagerCollected === true,
    "LBE didn't collect manager"
  );
  invariant(
    orderUtxos.length >= LbeV2Constant.MINIMUM_ORDER_COLLECTED ||
      collectAmount === remainAmount,
    `validateCollectOrders: not collect enough orders LBE having base asset ${treasuryDatum.baseAsset.toString()} and raise asset ${treasuryDatum.raiseAsset.toString()}`
  );
}

export function validateRedeemOrders(
  options: RedeemOrdersOptions,
  networkId: NetworkId
): void {
  const { treasuryUtxo, orderUtxos } = options;
  const config = LbeV2Constant.CONFIG[networkId];

  const rawTreasuryDatum = treasuryUtxo.datum;
  invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(rawTreasuryDatum)
  );
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );
  let redeemAmount = 0n;
  for (const orderUtxo of orderUtxos) {
    const rawOrderDatum = orderUtxo.datum;
    invariant(rawOrderDatum, "Order utxo must have inline datum");
    const orderDatum = LbeV2Types.OrderDatum.fromPlutusData(
      DataObject.from(rawOrderDatum),
      networkId
    );
    invariant(
      config.orderAsset in orderUtxo.assets,
      "Order utxo assets must have order asset"
    );
    invariant(
      PoolV2.computeLPAssetName(
        treasuryDatum.baseAsset,
        treasuryDatum.raiseAsset
      ) ===
        PoolV2.computeLPAssetName(orderDatum.baseAsset, orderDatum.raiseAsset),
      "treasury, order must share the same lbe id"
    );
    redeemAmount += orderDatum.amount + orderDatum.penaltyAmount;
  }

  invariant(treasuryDatum.totalLiquidity > 0n, "LBE didn't create pool");
  invariant(
    orderUtxos.length >= LbeV2Constant.MINIMUM_ORDER_REDEEMED ||
      redeemAmount === treasuryDatum.collectedFund,
    `validateCollectOrders: not collect enough orders LBE having base asset ${treasuryDatum.baseAsset.toString()} and raise asset ${treasuryDatum.raiseAsset.toString()}`
  );
}

export function validateRefundOrders(
  options: RefundOrdersOptions,
  networkId: NetworkId
): void {
  const { treasuryUtxo, orderUtxos } = options;
  const config = LbeV2Constant.CONFIG[networkId];

  const rawTreasuryDatum = treasuryUtxo.datum;
  invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(rawTreasuryDatum)
  );
  invariant(
    config.treasuryAsset in treasuryUtxo.assets,
    "Treasury utxo assets must have treasury asset"
  );
  let refundAmount = 0n;
  for (const orderUtxo of orderUtxos) {
    const rawOrderDatum = orderUtxo.datum;
    invariant(rawOrderDatum, "Order utxo must have inline datum");
    const orderDatum = LbeV2Types.OrderDatum.fromPlutusData(
      DataObject.from(rawOrderDatum),
      networkId
    );
    invariant(
      config.orderAsset in orderUtxo.assets,
      "Order utxo assets must have order asset"
    );
    invariant(
      PoolV2.computeLPAssetName(
        treasuryDatum.baseAsset,
        treasuryDatum.raiseAsset
      ) ===
        PoolV2.computeLPAssetName(orderDatum.baseAsset, orderDatum.raiseAsset),
      "treasury, order must share the same lbe id"
    );
    refundAmount += orderDatum.amount + orderDatum.penaltyAmount;
  }

  invariant(treasuryDatum.isCancelled === true, "LBE is not cancelled");
  invariant(
    treasuryDatum.isManagerCollected === true,
    "LBE didn't collect manager"
  );
  invariant(
    orderUtxos.length >= LbeV2Constant.MINIMUM_ORDER_REDEEMED ||
      refundAmount === treasuryDatum.collectedFund,
    `validateCollectOrders: not collect enough orders LBE having base asset ${treasuryDatum.baseAsset.toString()} and raise asset ${treasuryDatum.raiseAsset.toString()}`
  );
}

export function validateCreateAmmPool(
  options: CreateAmmPoolTxOptions,
  networkId: NetworkId
): void {
  const { treasuryUtxo, ammFactoryUtxo } = options;
  const rawTreasuryDatum = treasuryUtxo.datum;
  invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
  const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
    networkId,
    DataObject.from(rawTreasuryDatum)
  );

  const rawAmmFactoryDatum = ammFactoryUtxo.datum;
  invariant(rawAmmFactoryDatum, "Amm Factory utxo must have inline datum");
  const ammFactory = FactoryV2.Datum.fromPlutusData(
    DataObject.from(rawAmmFactoryDatum)
  );

  const {
    baseAsset,
    raiseAsset,
    isManagerCollected,
    collectedFund,
    reserveBase,
    reserveRaise,
    totalPenalty,
    isCancelled,
    minimumRaise,
    totalLiquidity,
  } = treasuryDatum;

  const lpAssetName = PoolV2.computeLPAssetName(baseAsset, raiseAsset);

  invariant(
    lpAssetName > ammFactory.head && lpAssetName < ammFactory.tail,
    "Invalid factory"
  );
  invariant(
    isManagerCollected && collectedFund === reserveRaise + totalPenalty,
    "must collect all before create pool"
  );
  invariant(!isCancelled, "LBE must not be cancelled");
  invariant(collectedFund >= (minimumRaise ?? 1n), "Lbe do not raise enough");

  const initialLiquidity = DexV2Calculation.calculateInitialLiquidity({
    amountA: reserveBase,
    amountB: reserveRaise + totalPenalty,
  });
  invariant(
    initialLiquidity > PoolV2.MINIMUM_LIQUIDITY,
    "Can not create pool because initialLiquidity is too low"
  );
  invariant(totalLiquidity === 0n, "Lbe creating is already success");
}
