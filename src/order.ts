import { Constr, Data } from "lucid-cardano";

import { AddressPlutusData } from "./plutus";
import { Address } from "./types";
import { parseAsset } from "./utils";

export enum OrderStepType {
  SWAP_EXACT_IN = 0,
  SWAP_EXACT_OUT,
  DEPOSIT,
  WITHDRAW,
  ZAP_IN,
}

export type SwapExactInStep = {
  type: OrderStepType.SWAP_EXACT_IN;
  desiredAsset: string;
  minimumReceived: bigint;
};

export type SwapExactOutStep = {
  type: OrderStepType.SWAP_EXACT_OUT;
  desiredAsset: string;
  expectedReceived: bigint;
};

export type DepositStep = {
  type: OrderStepType.DEPOSIT;
  minimumLP: bigint;
};

export type WithdrawStep = {
  type: OrderStepType.WITHDRAW;
  minimumAssetA: bigint;
  minimumAssetB: bigint;
};

export type ZapInStep = {
  type: OrderStepType.ZAP_IN;
  desiredAsset: string;
  minimumLP: bigint;
};

export type OrderStep =
  | SwapExactInStep
  | SwapExactOutStep
  | DepositStep
  | WithdrawStep
  | ZapInStep;

export type OrderDatum = {
  sender: Address;
  receiver: Address;
  receiverDatumHash?: string;
  step: OrderStep;
  batcherFee: bigint;
  depositADA: bigint;
};

export namespace OrderDatum {
  export function toCborHex(datum: OrderDatum): string {
    const { sender, receiver, receiverDatumHash, batcherFee, depositADA } =
      datum;
    const senderConstr = AddressPlutusData.toPlutusData(sender);
    const receiverConstr = AddressPlutusData.toPlutusData(receiver);
    const receiverDatumHashConstr = receiverDatumHash
      ? new Constr(0, [receiverDatumHash])
      : new Constr(1, []);
    switch (datum.step.type) {
      case OrderStepType.SWAP_EXACT_IN: {
        const desiredAsset = datum.step.desiredAsset;
        const [policyId, tokenName] = parseAsset(desiredAsset);
        const datumConstr = new Constr(0, [
          senderConstr,
          receiverConstr,
          receiverDatumHashConstr,
          new Constr(OrderStepType.SWAP_EXACT_IN, [
            new Constr(0, [policyId, tokenName]),
            datum.step.minimumReceived,
          ]),
          batcherFee,
          depositADA,
        ]);
        return Data.to(datumConstr);
      }
      case OrderStepType.SWAP_EXACT_OUT: {
        const desiredAsset = datum.step.desiredAsset;
        const [policyId, tokenName] = parseAsset(desiredAsset);
        const datumConstr = new Constr(0, [
          senderConstr,
          receiverConstr,
          receiverDatumHashConstr,
          new Constr(OrderStepType.SWAP_EXACT_OUT, [
            new Constr(0, [policyId, tokenName]),
            datum.step.expectedReceived,
          ]),
          batcherFee,
          depositADA,
        ]);
        return Data.to(datumConstr);
      }
      case OrderStepType.DEPOSIT: {
        const datumConstr = new Constr(0, [
          senderConstr,
          receiverConstr,
          receiverDatumHashConstr,
          new Constr(OrderStepType.DEPOSIT, [datum.step.minimumLP]),
          batcherFee,
          depositADA,
        ]);
        return Data.to(datumConstr);
      }
      case OrderStepType.WITHDRAW: {
        const datumConstr = new Constr(0, [
          senderConstr,
          receiverConstr,
          receiverDatumHashConstr,
          new Constr(OrderStepType.WITHDRAW, [
            datum.step.minimumAssetA,
            datum.step.minimumAssetB,
          ]),
          batcherFee,
          depositADA,
        ]);
        return Data.to(datumConstr);
      }
      case OrderStepType.ZAP_IN: {
        const desiredAsset = datum.step.desiredAsset;
        const [policyId, tokenName] = parseAsset(desiredAsset);
        const datumConstr = new Constr(0, [
          senderConstr,
          receiverConstr,
          receiverDatumHashConstr,
          new Constr(OrderStepType.ZAP_IN, [
            new Constr(0, [policyId, tokenName]),
            datum.step.minimumLP,
          ]),
          batcherFee,
          depositADA,
        ]);
        return Data.to(datumConstr);
      }
    }
  }
}
