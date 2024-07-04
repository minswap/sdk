import { Address, Constr, Data } from "lucid-cardano";

import { AddressPlutusData } from "./address.internal";
import { Asset } from "./asset";
import { NetworkId } from "./network";

export namespace OrderV1 {
  export enum StepType {
    SWAP_EXACT_IN = 0,
    SWAP_EXACT_OUT,
    DEPOSIT,
    WITHDRAW,
    ZAP_IN,
  }

  export type SwapExactIn = {
    type: StepType.SWAP_EXACT_IN;
    desiredAsset: Asset;
    minimumReceived: bigint;
  };

  export type SwapExactOut = {
    type: StepType.SWAP_EXACT_OUT;
    desiredAsset: Asset;
    expectedReceived: bigint;
  };

  export type Deposit = {
    type: StepType.DEPOSIT;
    minimumLP: bigint;
  };

  export type Withdraw = {
    type: StepType.WITHDRAW;
    minimumAssetA: bigint;
    minimumAssetB: bigint;
  };

  export type ZapIn = {
    type: StepType.ZAP_IN;
    desiredAsset: Asset;
    minimumLP: bigint;
  };

  export type Step =
    | SwapExactIn
    | SwapExactOut
    | Deposit
    | Withdraw
    | ZapIn;

  export type Datum = {
    sender: Address;
    receiver: Address;
    receiverDatumHash?: string;
    step: Step;
    batcherFee: bigint;
    depositADA: bigint;
  };

  export namespace Datum {
    export function toPlutusData(datum: Datum): Constr<Data> {
      const {
        sender,
        receiver,
        receiverDatumHash,
        step,
        batcherFee,
        depositADA,
      } = datum;
      const senderConstr = AddressPlutusData.toPlutusData(sender);
      const receiverConstr = AddressPlutusData.toPlutusData(receiver);
      const receiverDatumHashConstr = receiverDatumHash
        ? new Constr(0, [receiverDatumHash])
        : new Constr(1, []);
      let datumConstr: Constr<Data>;
      switch (step.type) {
        case StepType.SWAP_EXACT_IN: {
          datumConstr = new Constr(0, [
            senderConstr,
            receiverConstr,
            receiverDatumHashConstr,
            new Constr(StepType.SWAP_EXACT_IN, [
              Asset.toPlutusData(step.desiredAsset),
              step.minimumReceived,
            ]),
            batcherFee,
            depositADA,
          ]);
          break;
        }
        case StepType.SWAP_EXACT_OUT: {
          datumConstr = new Constr(0, [
            senderConstr,
            receiverConstr,
            receiverDatumHashConstr,
            new Constr(StepType.SWAP_EXACT_OUT, [
              Asset.toPlutusData(step.desiredAsset),
              step.expectedReceived,
            ]),
            batcherFee,
            depositADA,
          ]);
          break;
        }
        case StepType.DEPOSIT: {
          datumConstr = new Constr(0, [
            senderConstr,
            receiverConstr,
            receiverDatumHashConstr,
            new Constr(StepType.DEPOSIT, [step.minimumLP]),
            batcherFee,
            depositADA,
          ]);
          break;
        }
        case StepType.WITHDRAW: {
          datumConstr = new Constr(0, [
            senderConstr,
            receiverConstr,
            receiverDatumHashConstr,
            new Constr(StepType.WITHDRAW, [
              step.minimumAssetA,
              step.minimumAssetB,
            ]),
            batcherFee,
            depositADA,
          ]);
          break;
        }
        case StepType.ZAP_IN: {
          datumConstr = new Constr(0, [
            senderConstr,
            receiverConstr,
            receiverDatumHashConstr,
            new Constr(StepType.ZAP_IN, [
              Asset.toPlutusData(step.desiredAsset),
              step.minimumLP,
            ]),
            batcherFee,
            depositADA,
          ]);
          break;
        }
      }

      return datumConstr;
    }

    export function fromPlutusData(
      networkId: NetworkId,
      data: Constr<Data>
    ): Datum {
      if (data.index !== 0) {
        throw new Error(`Index of Order Datum must be 0, actual: ${data.index}`);
      }
      const sender = AddressPlutusData.fromPlutusData(
        networkId,
        data.fields[0] as Constr<Data>
      );
      const receiver = AddressPlutusData.fromPlutusData(
        networkId,
        data.fields[1] as Constr<Data>
      );
      let receiverDatumHash: string | undefined = undefined;
      const maybeReceiverDatumHash = data.fields[2] as Constr<Data>;
      switch (maybeReceiverDatumHash.index) {
        case 0: {
          receiverDatumHash = maybeReceiverDatumHash.fields[0] as string;
          break;
        }
        case 1: {
          receiverDatumHash = undefined;
          break;
        }
        default: {
          throw new Error(
            `Index of Receiver Datum Hash must be 0 or 1, actual: ${maybeReceiverDatumHash.index}`
          );
        }
      }
      let step: Step;
      const orderStepConstr = data.fields[3] as Constr<Data>;
      switch (orderStepConstr.index) {
        case StepType.SWAP_EXACT_IN: {
          step = {
            type: StepType.SWAP_EXACT_IN,
            desiredAsset: Asset.fromPlutusData(
              orderStepConstr.fields[0] as Constr<Data>
            ),
            minimumReceived: orderStepConstr.fields[1] as bigint,
          };
          break;
        }
        case StepType.SWAP_EXACT_OUT: {
          step = {
            type: StepType.SWAP_EXACT_OUT,
            desiredAsset: Asset.fromPlutusData(
              orderStepConstr.fields[0] as Constr<Data>
            ),
            expectedReceived: orderStepConstr.fields[1] as bigint,
          };
          break;
        }
        case StepType.DEPOSIT: {
          step = {
            type: StepType.DEPOSIT,
            minimumLP: orderStepConstr.fields[0] as bigint,
          };
          break;
        }
        case StepType.WITHDRAW: {
          step = {
            type: StepType.WITHDRAW,
            minimumAssetA: orderStepConstr.fields[0] as bigint,
            minimumAssetB: orderStepConstr.fields[1] as bigint,
          };
          break;
        }
        case StepType.ZAP_IN: {
          step = {
            type: StepType.ZAP_IN,
            desiredAsset: Asset.fromPlutusData(
              orderStepConstr.fields[0] as Constr<Data>
            ),
            minimumLP: orderStepConstr.fields[1] as bigint,
          };
          break;
        }
        default: {
          throw new Error(
            `Index of Order Step must be in 0-4, actual: ${orderStepConstr.index}`
          );
        }
      }

      const batcherFee = data.fields[4] as bigint;
      const depositADA = data.fields[5] as bigint;
      return {
        sender: sender,
        receiver: receiver,
        receiverDatumHash: receiverDatumHash,
        step: step,
        batcherFee: batcherFee,
        depositADA: depositADA,
      };
    }
  }

  export enum Redeemer {
    APPLY_ORDER = 0,
    CANCEL_ORDER,
  }
}
