import { Address, Data } from "lucid-cardano";

import { Asset } from "..";
import {
  FactoryValidateFactory,
  FactoryValidateFactoryMinting,
  ManagerValidateManagerSpending,
  OrderValidateOrder,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "./lbe-v2-plutus";
import { AddressPlutusData } from "./address.internal";

export namespace LbeV2PlutusSchema {
  export type FactoryDatum = FactoryValidateFactory["datum"];
  export type TreasuryDatum =
    TreasuryValidateTreasurySpending["treasuryInDatum"];
  export type ManagerDatum = ManagerValidateManagerSpending["managerInDatum"];
  export type SellerDatum = SellerValidateSellerSpending["sellerInDatum"];
  export type OrderDatum = OrderValidateOrder["datum"];

  export function toFactoryDatum(datum: FactoryDatum): string {
    return Data.to(datum, FactoryValidateFactory.datum);
  }
  export function fromFactoryDatum(rawDatum: string): FactoryDatum {
    return Data.from(rawDatum, FactoryValidateFactory.datum);
  }

  export function toTreasuryDatum(datum: TreasuryDatum): string {
    return Data.to(datum, TreasuryValidateTreasurySpending.treasuryInDatum);
  }
  export function fromTreasuryDatum(rawDatum: string): TreasuryDatum {
    return Data.from(
      rawDatum,
      TreasuryValidateTreasurySpending.treasuryInDatum
    );
  }

  export function toManagerDatum(datum: ManagerDatum): string {
    return Data.to(datum, ManagerValidateManagerSpending.managerInDatum);
  }
  export function fromManagerDatum(rawDatum: string): ManagerDatum {
    return Data.from(rawDatum, ManagerValidateManagerSpending.managerInDatum);
  }

  export function toSellerDatum(datum: SellerDatum): string {
    return Data.to(datum, SellerValidateSellerSpending.sellerInDatum);
  }
  export function fromSellerDatum(rawDatum: string): SellerDatum {
    return Data.from(rawDatum, SellerValidateSellerSpending.sellerInDatum);
  }

  export function toOrderDatum(datum: OrderDatum): string {
    return Data.to(datum, OrderValidateOrder.datum);
  }
  export function fromOrderDatum(rawDatum: string): OrderDatum {
    return Data.from(rawDatum, OrderValidateOrder.datum);
  }

  export type FactoryRedeemer = FactoryValidateFactory["redeemer"];
  export type ManagerRedeemer = ManagerValidateManagerSpending["redeemer"];
  export type MintRedeemer = FactoryValidateFactoryMinting["redeemer"];
  export type OrderRedeemer = OrderValidateOrder["redeemer"];
  export type SellerRedeemer = SellerValidateSellerSpending["redeemer"];
  export type TreasuryRedeemer = TreasuryValidateTreasurySpending["redeemer"];

  export function toRedeemerFactory(redeemer: FactoryRedeemer): string {
    return Data.to(redeemer, FactoryValidateFactory.redeemer);
  }

  export function toRedeemerMinting(redeemer: MintRedeemer): string {
    return Data.to(redeemer, FactoryValidateFactoryMinting.redeemer);
  }
  export function toRedeemerTreasury(redeemer: TreasuryRedeemer): string {
    return Data.to(redeemer, TreasuryValidateTreasurySpending.redeemer);
  }

  export function toRedeemerManager(redeemer: ManagerRedeemer): string {
    return Data.to(redeemer, ManagerValidateManagerSpending.redeemer);
  }

  export function toRedeemerSellerSpend(redeemer: SellerRedeemer): string {
    return Data.to(redeemer, SellerValidateSellerSpending.redeemer);
  }

  export function toRedeemerOrder(redeemer: OrderRedeemer): string {
    return Data.to(redeemer, OrderValidateOrder.redeemer);
  }

  export type LbeV2Asset = { policyId: string; assetName: string };

  export function toLbeV2Asset(asset: Asset): LbeV2Asset {
    return {
      policyId: asset.policyId,
      assetName: asset.tokenName,
    };
  }
  export function fromLbeV2Asset(asset: LbeV2Asset): Asset {
    return {
      policyId: asset.policyId,
      tokenName: asset.assetName,
    };
  }
}

export namespace LbeV2Types {
  export enum ReceiverDatumType {
    NO_DATUM = 0,
    DATUM_HASH,
    INLINE_DATUM,
  }

  export type ReceiverDatum =
    | {
        type: ReceiverDatumType.NO_DATUM;
      }
    | {
        type: ReceiverDatumType.DATUM_HASH | ReceiverDatumType.INLINE_DATUM;
        hash: string;
      };

  export type PenaltyConfig = {
    penaltyStartTime: bigint;
    percent: bigint;
  };

  export type TreasuryDatum = {
    factoryPolicyId: string;
    managerHash: string;
    sellerHash: string;
    orderHash: string;
    baseAsset: Asset;

    raiseAsset: Asset;
    startTime: bigint;
    endTime: bigint;
    owner: Address;
    receiver: Address;

    receiverDatum: ReceiverDatum;
    poolAllocation: bigint;
    minimumOrderRaise?: bigint;
    minimumRaise?: bigint;
    maximumRaise?: bigint;

    reserveBase: bigint;
    penaltyConfig?: PenaltyConfig;
    poolBaseFee: bigint;
    revocable: boolean;
    collectedFund: bigint;

    reserveRaise: bigint;
    totalPenalty: bigint;
    totalLiquidity: bigint;
    isCancelled: boolean;
    isManagerCollected: boolean;
  };

  export namespace TreasuryDatum {
    export function toPlutusSchema(
      datum: TreasuryDatum
    ): LbeV2PlutusSchema.TreasuryDatum {
      return {
        ...datum,
        baseAsset: LbeV2PlutusSchema.toLbeV2Asset(datum.baseAsset),
        raiseAsset: LbeV2PlutusSchema.toLbeV2Asset(datum.raiseAsset),
        owner: AddressPlutusData
      };
    }
  }

  export type LbeV2Parameters = {
    baseAsset: Asset;
    reserveBase: bigint;
    raiseAsset: Asset;
    startTime: bigint;
    endTime: bigint;
    owner: Address;
    receiver: Address;
    poolAllocation: bigint;
    minimumOrderRaise?: bigint;
    minimumRaise?: bigint;
    maximumRaise?: bigint;
    penaltyConfig?: PenaltyConfig;
    revocable: boolean;
    poolBaseFee: bigint;
  };

  export namespace LbeV2Parameters {
    export function toLbeV2TreasuryDatum(
      lbeV2Parameters: LbeV2Parameters
    ): LbeV2Schema.TreasuryDatum {
      const treasuryDatum: LbeV2Schema.TreasuryDatum = {
        factoryPolicyId: warehouse.getFactoryHash(),
        managerHash: warehouse.getManagerHash(),
        sellerHash: warehouse.getSellerHash(),
        orderHash: warehouse.getOrderHash(),
        baseAsset: LbeV2Schema.toLbeV2Asset(lbeV2Parameters.baseAsset),
        raiseAsset: LbeV2Schema.toLbeV2Asset(lbeV2Parameters.raiseAsset),
        startTime: lbeV2Parameters.startTime,
        endTime: lbeV2Parameters.endTime,
        owner: lbeV2Parameters.owner,
        receiver: lbeV2Parameters.receiver,
        receiverDatum: {
          type: ReceiverDatumType.NO_DATUM,
        },
        poolAllocation: lbeV2Parameters.poolAllocation,
        minimumOrderRaise: lbeV2Parameters.minimumOrderRaise,
        minimumRaise: lbeV2Parameters.minimumRaise,
        maximumRaise: lbeV2Parameters.maximumRaise,
        reserveBase: lbeV2Parameters.reserveBase,
        penaltyConfig: lbeV2Parameters.penaltyConfig,
        poolBaseFee: lbeV2Parameters.poolBaseFee,
        revocable: lbeV2Parameters.revocable,
        collectedFund: 0n,
        reserveRaise: 0n,
        totalPenalty: 0n,
        totalLiquidity: 0n,
        isCancelled: false,
        isManagerCollected: false,
      };
      return treasuryDatum;
    }
  }
}
