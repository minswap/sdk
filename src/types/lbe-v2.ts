import { Data } from "lucid-cardano";

import {
  FactoryValidateFactory,
  FactoryValidateFactoryMinting,
  ManagerValidateManagerSpending,
  OrderValidateOrder,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "./lbe-v2-plutus";

export type FactoryRedeemer = FactoryValidateFactory["redeemer"];
export type ManagerRedeemer = ManagerValidateManagerSpending["redeemer"];
export type MintRedeemer = FactoryValidateFactoryMinting["redeemer"];
export type OrderRedeemer = OrderValidateOrder["redeemer"];
export type SellerRedeemer = SellerValidateSellerSpending["redeemer"];
export type TreasuryRedeemer = TreasuryValidateTreasurySpending["redeemer"];

export namespace LbeV2 {
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
}
