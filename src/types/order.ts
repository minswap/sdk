import invariant from "@minswap/tiny-invariant";
import { Constr } from "@spacebudz/lucid";

import { DataObject, DataType } from "..";
import { AddressPlutusData } from "./address.internal";
import { Asset } from "./asset";
import { NetworkId } from "./network";
import { TxIn, Value } from "./tx.internal";

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

  export type Step = SwapExactIn | SwapExactOut | Deposit | Withdraw | ZapIn;

  export type Datum = {
    sender: string;
    receiver: string;
    receiverDatumHash?: string;
    step: Step;
    batcherFee: bigint;
    depositADA: bigint;
  };

  export namespace Datum {
    export function toPlutusData(datum: Datum): Constr<DataType> {
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
      let datumConstr: Constr<DataType>;
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
      data: Constr<DataType>
    ): Datum {
      if (data.index !== 0) {
        throw new Error(
          `Index of Order Datum must be 0, actual: ${data.index}`
        );
      }
      const sender = AddressPlutusData.fromPlutusData(
        networkId,
        data.fields[0] as Constr<DataType>
      );
      const receiver = AddressPlutusData.fromPlutusData(
        networkId,
        data.fields[1] as Constr<DataType>
      );
      let receiverDatumHash: string | undefined = undefined;
      const maybeReceiverDatumHash = data.fields[2] as Constr<DataType>;
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
      const orderStepConstr = data.fields[3] as Constr<DataType>;
      switch (orderStepConstr.index) {
        case StepType.SWAP_EXACT_IN: {
          step = {
            type: StepType.SWAP_EXACT_IN,
            desiredAsset: Asset.fromPlutusData(
              orderStepConstr.fields[0] as Constr<DataType>
            ),
            minimumReceived: orderStepConstr.fields[1] as bigint,
          };
          break;
        }
        case StepType.SWAP_EXACT_OUT: {
          step = {
            type: StepType.SWAP_EXACT_OUT,
            desiredAsset: Asset.fromPlutusData(
              orderStepConstr.fields[0] as Constr<DataType>
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
              orderStepConstr.fields[0] as Constr<DataType>
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

export namespace StableOrder {
  export enum StepType {
    SWAP = 0,
    DEPOSIT,
    WITHDRAW,
    WITHDRAW_IMBALANCE,
    ZAP_OUT,
  }

  export type SwapStep = {
    type: StepType.SWAP;
    assetInIndex: bigint;
    assetOutIndex: bigint;
    minimumAssetOut: bigint;
  };

  export type DepositStep = {
    type: StepType.DEPOSIT;
    minimumLP: bigint;
  };

  export type WithdrawStep = {
    type: StepType.WITHDRAW;
    minimumAmounts: bigint[];
  };

  export type WithdrawImbalanceStep = {
    type: StepType.WITHDRAW_IMBALANCE;
    withdrawAmounts: bigint[];
  };

  export type ZapOutStep = {
    type: StepType.ZAP_OUT;
    assetOutIndex: bigint;
    minimumAssetOut: bigint;
  };

  export type Step =
    | SwapStep
    | DepositStep
    | WithdrawStep
    | WithdrawImbalanceStep
    | ZapOutStep;

  export type Datum = {
    sender: string;
    receiver: string;
    receiverDatumHash?: string;
    step: Step;
    batcherFee: bigint;
    depositADA: bigint;
  };

  export namespace Datum {
    export function toPlutusData(datum: Datum): Constr<DataType> {
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
      let stepConstr: Constr<DataType>;
      switch (step.type) {
        case StepType.SWAP: {
          stepConstr = new Constr(StepType.SWAP, [
            step.assetInIndex,
            step.assetOutIndex,
            step.minimumAssetOut,
          ]);
          break;
        }
        case StepType.DEPOSIT: {
          stepConstr = new Constr(StepType.DEPOSIT, [step.minimumLP]);
          break;
        }
        case StepType.WITHDRAW: {
          stepConstr = new Constr(StepType.WITHDRAW, [step.minimumAmounts]);
          break;
        }
        case StepType.WITHDRAW_IMBALANCE: {
          stepConstr = new Constr(StepType.WITHDRAW_IMBALANCE, [
            step.withdrawAmounts,
          ]);
          break;
        }
        case StepType.ZAP_OUT: {
          stepConstr = new Constr(StepType.ZAP_OUT, [
            step.assetOutIndex,
            step.minimumAssetOut,
          ]);
          break;
        }
      }

      return new Constr(0, [
        senderConstr,
        receiverConstr,
        receiverDatumHashConstr,
        stepConstr,
        batcherFee,
        depositADA,
      ]);
    }

    export function fromPlutusData(
      networkId: NetworkId,
      data: Constr<DataType>
    ): Datum {
      if (data.index !== 0) {
        throw new Error(
          `Index of Order Datum must be 0, actual: ${data.index}`
        );
      }
      const sender = AddressPlutusData.fromPlutusData(
        networkId,
        data.fields[0] as Constr<DataType>
      );
      const receiver = AddressPlutusData.fromPlutusData(
        networkId,
        data.fields[1] as Constr<DataType>
      );
      let receiverDatumHash: string | undefined = undefined;
      const maybeReceiverDatumHash = data.fields[2] as Constr<DataType>;
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
      const orderStepConstr = data.fields[3] as Constr<DataType>;
      switch (orderStepConstr.index) {
        case StepType.SWAP: {
          step = {
            type: StepType.SWAP,
            assetInIndex: orderStepConstr.fields[0] as bigint,
            assetOutIndex: orderStepConstr.fields[1] as bigint,
            minimumAssetOut: orderStepConstr.fields[2] as bigint,
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
            minimumAmounts: orderStepConstr.fields[0] as bigint[],
          };
          break;
        }
        case StepType.WITHDRAW_IMBALANCE: {
          step = {
            type: StepType.WITHDRAW_IMBALANCE,
            withdrawAmounts: orderStepConstr.fields[0] as bigint[],
          };
          break;
        }
        case StepType.ZAP_OUT: {
          step = {
            type: StepType.ZAP_OUT,
            assetOutIndex: orderStepConstr.fields[0] as bigint,
            minimumAssetOut: orderStepConstr.fields[1] as bigint,
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

export namespace OrderV2 {
  export enum AuthorizationMethodType {
    SIGNATURE = 0,
    SPEND_SCRIPT,
    WITHDRAW_SCRIPT,
    MINT_SCRIPT,
  }

  export type AuthorizationMethod = {
    type: AuthorizationMethodType;
    hash: string;
  };

  export namespace AuthorizationMethod {
    export function fromPlutusData(data: Constr<DataType>): AuthorizationMethod {
      let type: AuthorizationMethodType;
      if (data.fields.length !== 1) {
        throw Error(
          `Field length of AuthorizationMethod must be in 1, actual: ${data.fields.length}`
        );
      }
      switch (data.index) {
        case AuthorizationMethodType.SIGNATURE: {
          type = AuthorizationMethodType.SIGNATURE;
          break;
        }
        case AuthorizationMethodType.SPEND_SCRIPT: {
          type = AuthorizationMethodType.SPEND_SCRIPT;
          break;
        }
        case AuthorizationMethodType.WITHDRAW_SCRIPT: {
          type = AuthorizationMethodType.WITHDRAW_SCRIPT;
          break;
        }
        case AuthorizationMethodType.MINT_SCRIPT: {
          type = AuthorizationMethodType.MINT_SCRIPT;
          break;
        }
        default: {
          throw new Error(
            `Index of AuthorizationMethod must be in 0-3, actual: ${data.index}`
          );
        }
      }
      return {
        type: type,
        hash: data.fields[0] as string,
      };
    }
    export function toPlutusData(method: AuthorizationMethod): Constr<DataType> {
      return new Constr(method.type, [method.hash]);
    }
  }

  export enum Direction {
    B_TO_A = 0,
    A_TO_B,
  }

  export namespace Direction {
    export function fromPlutusData(data: Constr<DataType>): Direction {
      switch (data.index) {
        case Direction.B_TO_A: {
          return Direction.B_TO_A;
        }
        case Direction.A_TO_B: {
          return Direction.A_TO_B;
        }
        default: {
          throw new Error(
            `Index of Direction must be in 0-1, actual: ${data.index}`
          );
        }
      }
    }
    export function toPlutusData(direction: Direction): Constr<DataType> {
      return new Constr(direction, []);
    }
  }

  export enum Killable {
    PENDING_ON_FAILED = 0,
    KILL_ON_FAILED,
  }

  export namespace Killable {
    export function fromPlutusData(data: Constr<DataType>): Killable {
      switch (data.index) {
        case Killable.PENDING_ON_FAILED: {
          return Killable.PENDING_ON_FAILED;
        }
        case Killable.KILL_ON_FAILED: {
          return Killable.KILL_ON_FAILED;
        }
        default: {
          throw new Error(
            `Index of Killable must be in 0-1, actual: ${data.index}`
          );
        }
      }
    }
    export function toPlutusData(killable: Killable): Constr<DataType> {
      return new Constr(killable, []);
    }
  }

  export enum AmountType {
    SPECIFIC_AMOUNT = 0,
    ALL,
  }

  export type DepositAmount =
    | {
        type: AmountType.SPECIFIC_AMOUNT;
        depositAmountA: bigint;
        depositAmountB: bigint;
      }
    | {
        type: AmountType.ALL;
        deductedAmountA: bigint;
        deductedAmountB: bigint;
      };

  export namespace DepositAmount {
    export function fromPlutusData(data: Constr<DataType>): DepositAmount {
      switch (data.index) {
        case AmountType.SPECIFIC_AMOUNT: {
          return {
            type: AmountType.SPECIFIC_AMOUNT,
            depositAmountA: data.fields[0] as bigint,
            depositAmountB: data.fields[1] as bigint,
          };
        }
        case AmountType.ALL: {
          return {
            type: AmountType.ALL,
            deductedAmountA: data.fields[0] as bigint,
            deductedAmountB: data.fields[1] as bigint,
          };
        }
        default: {
          throw new Error(
            `Index of DepositAmount must be in 0-1, actual: ${data.index}`
          );
        }
      }
    }
    export function toPlutusData(amount: DepositAmount): Constr<DataType> {
      switch (amount.type) {
        case AmountType.SPECIFIC_AMOUNT: {
          return new Constr(AmountType.SPECIFIC_AMOUNT, [
            amount.depositAmountA,
            amount.depositAmountB,
          ]);
        }
        case AmountType.ALL: {
          return new Constr(AmountType.ALL, [
            amount.deductedAmountA,
            amount.deductedAmountB,
          ]);
        }
      }
    }
  }

  export type SwapAmount =
    | {
        type: AmountType.SPECIFIC_AMOUNT;
        swapAmount: bigint;
      }
    | {
        type: AmountType.ALL;
        deductedAmount: bigint;
      };

  export namespace SwapAmount {
    export function fromPlutusData(data: Constr<DataType>): SwapAmount {
      switch (data.index) {
        case AmountType.SPECIFIC_AMOUNT: {
          return {
            type: AmountType.SPECIFIC_AMOUNT,
            swapAmount: data.fields[0] as bigint,
          };
        }
        case AmountType.ALL: {
          return {
            type: AmountType.ALL,
            deductedAmount: data.fields[0] as bigint,
          };
        }
        default: {
          throw new Error(
            `Index of SwapAmount must be in 0-1, actual: ${data.index}`
          );
        }
      }
    }
    export function toPlutusData(amount: SwapAmount): Constr<DataType> {
      switch (amount.type) {
        case AmountType.SPECIFIC_AMOUNT: {
          return new Constr(AmountType.SPECIFIC_AMOUNT, [amount.swapAmount]);
        }
        case AmountType.ALL: {
          return new Constr(AmountType.ALL, [amount.deductedAmount]);
        }
      }
    }
  }

  export type WithdrawAmount =
    | {
        type: AmountType.SPECIFIC_AMOUNT;
        withdrawalLPAmount: bigint;
      }
    | {
        type: AmountType.ALL;
        deductedLPAmount: bigint;
      };

  export namespace WithdrawAmount {
    export function fromPlutusData(data: Constr<DataType>): WithdrawAmount {
      switch (data.index) {
        case AmountType.SPECIFIC_AMOUNT: {
          return {
            type: AmountType.SPECIFIC_AMOUNT,
            withdrawalLPAmount: data.fields[0] as bigint,
          };
        }
        case AmountType.ALL: {
          return {
            type: AmountType.ALL,
            deductedLPAmount: data.fields[0] as bigint,
          };
        }
        default: {
          throw new Error(
            `Index of WithdrawAmount must be in 0-1, actual: ${data.index}`
          );
        }
      }
    }
    export function toPlutusData(amount: WithdrawAmount): Constr<DataType> {
      switch (amount.type) {
        case AmountType.SPECIFIC_AMOUNT: {
          return new Constr(AmountType.SPECIFIC_AMOUNT, [
            amount.withdrawalLPAmount,
          ]);
        }
        case AmountType.ALL: {
          return new Constr(AmountType.ALL, [amount.deductedLPAmount]);
        }
      }
    }
  }

  export type Route = {
    lpAsset: Asset;
    direction: Direction;
  };

  export namespace Route {
    export function fromPlutusData(data: Constr<DataType>): Route {
      if (data.index !== 0) {
        throw new Error(
          `Index of Order Route must be 0, actual: ${data.index}`
        );
      }
      return {
        lpAsset: Asset.fromPlutusData(data.fields[0] as Constr<DataType>),
        direction: Direction.fromPlutusData(data.fields[1] as Constr<DataType>),
      };
    }
    export function toPlutusData(route: Route): Constr<DataType> {
      return new Constr(0, [
        Asset.toPlutusData(route.lpAsset),
        Direction.toPlutusData(route.direction),
      ]);
    }
  }

  export enum StepType {
    SWAP_EXACT_IN = 0,
    STOP,
    OCO,
    SWAP_EXACT_OUT,
    DEPOSIT,
    WITHDRAW,
    ZAP_OUT,
    PARTIAL_SWAP,
    WITHDRAW_IMBALANCE,
    SWAP_ROUTING,
    DONATION,
  }

  export type SwapExactIn = {
    type: StepType.SWAP_EXACT_IN;
    direction: Direction;
    swapAmount: SwapAmount;
    minimumReceived: bigint;
    killable: Killable;
  };

  export type Stop = {
    type: StepType.STOP;
    direction: Direction;
    swapAmount: SwapAmount;
    stopReceived: bigint;
  };

  export type OCO = {
    type: StepType.OCO;
    direction: Direction;
    swapAmount: SwapAmount;
    minimumReceived: bigint;
    stopReceived: bigint;
  };

  export type SwapExactOut = {
    type: StepType.SWAP_EXACT_OUT;
    direction: Direction;
    maximumSwapAmount: SwapAmount;
    expectedReceived: bigint;
    killable: Killable;
  };

  export type Deposit = {
    type: StepType.DEPOSIT;
    depositAmount: DepositAmount;
    minimumLP: bigint;
    killable: Killable;
  };

  export type Withdraw = {
    type: StepType.WITHDRAW;
    withdrawalAmount: WithdrawAmount;
    minimumAssetA: bigint;
    minimumAssetB: bigint;
    killable: Killable;
  };

  export type ZapOut = {
    type: StepType.ZAP_OUT;
    direction: Direction;
    withdrawalAmount: WithdrawAmount;
    minimumReceived: bigint;
    killable: Killable;
  };

  export type PartialSwap = {
    type: StepType.PARTIAL_SWAP;
    direction: Direction;
    totalSwapAmount: bigint;
    ioRatioNumerator: bigint;
    ioRatioDenominator: bigint;
    hops: bigint;
    minimumSwapAmountRequired: bigint;
    maxBatcherFeeEachTime: bigint;
  };

  export type WithdrawImbalance = {
    type: StepType.WITHDRAW_IMBALANCE;
    withdrawalAmount: WithdrawAmount;
    ratioAssetA: bigint;
    ratioAssetB: bigint;
    minimumAssetA: bigint;
    killable: Killable;
  };

  export type SwapRouting = {
    type: StepType.SWAP_ROUTING;
    routings: Route[];
    swapAmount: SwapAmount;
    minimumReceived: bigint;
  };

  export type Donation = {
    type: StepType.DONATION;
  };

  export type Step =
    | SwapExactIn
    | Stop
    | OCO
    | SwapExactOut
    | Deposit
    | Withdraw
    | ZapOut
    | PartialSwap
    | WithdrawImbalance
    | SwapRouting
    | Donation;

  export namespace Step {
    export function fromPlutusData(data: Constr<DataType>): Step {
      switch (data.index) {
        case StepType.SWAP_EXACT_IN: {
          return {
            type: StepType.SWAP_EXACT_IN,
            direction: Direction.fromPlutusData(data.fields[0] as Constr<DataType>),
            swapAmount: SwapAmount.fromPlutusData(
              data.fields[1] as Constr<DataType>
            ),
            minimumReceived: data.fields[2] as bigint,
            killable: Killable.fromPlutusData(data.fields[3] as Constr<DataType>),
          };
        }
        case StepType.STOP: {
          return {
            type: StepType.STOP,
            direction: Direction.fromPlutusData(data.fields[0] as Constr<DataType>),
            swapAmount: SwapAmount.fromPlutusData(
              data.fields[1] as Constr<DataType>
            ),
            stopReceived: data.fields[2] as bigint,
          };
        }
        case StepType.OCO: {
          return {
            type: StepType.OCO,
            direction: Direction.fromPlutusData(data.fields[0] as Constr<DataType>),
            swapAmount: SwapAmount.fromPlutusData(
              data.fields[1] as Constr<DataType>
            ),
            minimumReceived: data.fields[2] as bigint,
            stopReceived: data.fields[3] as bigint,
          };
        }
        case StepType.SWAP_EXACT_OUT: {
          return {
            type: StepType.SWAP_EXACT_OUT,
            direction: Direction.fromPlutusData(data.fields[0] as Constr<DataType>),
            maximumSwapAmount: SwapAmount.fromPlutusData(
              data.fields[1] as Constr<DataType>
            ),
            expectedReceived: data.fields[2] as bigint,
            killable: Killable.fromPlutusData(data.fields[3] as Constr<DataType>),
          };
        }
        case StepType.DEPOSIT: {
          return {
            type: StepType.DEPOSIT,
            depositAmount: DepositAmount.fromPlutusData(
              data.fields[0] as Constr<DataType>
            ),
            minimumLP: data.fields[1] as bigint,
            killable: Killable.fromPlutusData(data.fields[2] as Constr<DataType>),
          };
        }
        case StepType.WITHDRAW: {
          return {
            type: StepType.WITHDRAW,
            withdrawalAmount: WithdrawAmount.fromPlutusData(
              data.fields[0] as Constr<DataType>
            ),
            minimumAssetA: data.fields[1] as bigint,
            minimumAssetB: data.fields[2] as bigint,
            killable: Killable.fromPlutusData(data.fields[3] as Constr<DataType>),
          };
        }
        case StepType.ZAP_OUT: {
          return {
            type: StepType.ZAP_OUT,
            direction: Direction.fromPlutusData(data.fields[0] as Constr<DataType>),
            withdrawalAmount: WithdrawAmount.fromPlutusData(
              data.fields[1] as Constr<DataType>
            ),
            minimumReceived: data.fields[2] as bigint,
            killable: Killable.fromPlutusData(data.fields[3] as Constr<DataType>),
          };
        }
        case StepType.PARTIAL_SWAP: {
          return {
            type: StepType.PARTIAL_SWAP,
            direction: Direction.fromPlutusData(data.fields[0] as Constr<DataType>),
            totalSwapAmount: data.fields[1] as bigint,
            ioRatioNumerator: data.fields[2] as bigint,
            ioRatioDenominator: data.fields[3] as bigint,
            hops: data.fields[4] as bigint,
            minimumSwapAmountRequired: data.fields[5] as bigint,
            maxBatcherFeeEachTime: data.fields[6] as bigint,
          };
        }
        case StepType.WITHDRAW_IMBALANCE: {
          return {
            type: StepType.WITHDRAW_IMBALANCE,
            withdrawalAmount: WithdrawAmount.fromPlutusData(
              data.fields[0] as Constr<DataType>
            ),
            ratioAssetA: data.fields[1] as bigint,
            ratioAssetB: data.fields[2] as bigint,
            minimumAssetA: data.fields[3] as bigint,
            killable: Killable.fromPlutusData(data.fields[4] as Constr<DataType>),
          };
        }
        case StepType.SWAP_ROUTING: {
          return {
            type: StepType.SWAP_ROUTING,
            routings: (data.fields[0] as Constr<DataType>[]).map(
              Route.fromPlutusData
            ),
            swapAmount: SwapAmount.fromPlutusData(
              data.fields[1] as Constr<DataType>
            ),
            minimumReceived: data.fields[2] as bigint,
          };
        }
        case StepType.DONATION: {
          return {
            type: StepType.DONATION,
          };
        }

        default: {
          throw new Error(
            `Index of Step must be in 0-10, actual: ${data.index}`
          );
        }
      }
    }
    export function toPlutusData(step: Step): Constr<DataType> {
      switch (step.type) {
        case StepType.SWAP_EXACT_IN: {
          return new Constr(step.type, [
            Direction.toPlutusData(step.direction),
            SwapAmount.toPlutusData(step.swapAmount),
            step.minimumReceived,
            Killable.toPlutusData(step.killable),
          ]);
        }
        case StepType.STOP: {
          return new Constr(step.type, [
            Direction.toPlutusData(step.direction),
            SwapAmount.toPlutusData(step.swapAmount),
            step.stopReceived,
          ]);
        }
        case StepType.OCO: {
          return new Constr(step.type, [
            Direction.toPlutusData(step.direction),
            SwapAmount.toPlutusData(step.swapAmount),
            step.minimumReceived,
            step.stopReceived,
          ]);
        }
        case StepType.SWAP_EXACT_OUT: {
          return new Constr(step.type, [
            Direction.toPlutusData(step.direction),
            SwapAmount.toPlutusData(step.maximumSwapAmount),
            step.expectedReceived,
            Killable.toPlutusData(step.killable),
          ]);
        }
        case StepType.DEPOSIT: {
          return new Constr(step.type, [
            DepositAmount.toPlutusData(step.depositAmount),
            step.minimumLP,
            Killable.toPlutusData(step.killable),
          ]);
        }
        case StepType.WITHDRAW: {
          return new Constr(step.type, [
            WithdrawAmount.toPlutusData(step.withdrawalAmount),
            step.minimumAssetA,
            step.minimumAssetB,
            Killable.toPlutusData(step.killable),
          ]);
        }
        case StepType.ZAP_OUT: {
          return new Constr(step.type, [
            Direction.toPlutusData(step.direction),
            WithdrawAmount.toPlutusData(step.withdrawalAmount),
            step.minimumReceived,
            Killable.toPlutusData(step.killable),
          ]);
        }
        case StepType.PARTIAL_SWAP: {
          return new Constr(step.type, [
            Direction.toPlutusData(step.direction),
            step.totalSwapAmount,
            step.ioRatioNumerator,
            step.ioRatioDenominator,
            step.hops,
            step.minimumSwapAmountRequired,
            step.maxBatcherFeeEachTime,
          ]);
        }
        case StepType.WITHDRAW_IMBALANCE: {
          return new Constr(step.type, [
            WithdrawAmount.toPlutusData(step.withdrawalAmount),
            step.ratioAssetA,
            step.ratioAssetB,
            step.minimumAssetA,
            Killable.toPlutusData(step.killable),
          ]);
        }
        case StepType.SWAP_ROUTING: {
          return new Constr(step.type, [
            step.routings.map(Route.toPlutusData),
            SwapAmount.toPlutusData(step.swapAmount),
            step.minimumReceived,
          ]);
        }
        case StepType.DONATION: {
          return new Constr(step.type, []);
        }
      }
    }
  }

  export type ExpirySetting = {
    expiredTime: bigint;
    maxCancellationTip: bigint;
  };

  export enum ExtraDatumType {
    NO_DATUM = 0,
    DATUM_HASH,
    INLINE_DATUM,
  }

  export type ExtraDatum =
    | {
        type: ExtraDatumType.NO_DATUM;
      }
    | {
        type: ExtraDatumType.DATUM_HASH | ExtraDatumType.INLINE_DATUM;
        hash: string;
      };

  export namespace ExtraDatum {
    export function fromPlutusData(data: Constr<DataType>): ExtraDatum {
      switch (data.index) {
        case ExtraDatumType.NO_DATUM: {
          invariant(
            data.fields.length === 0,
            `Field Length of ExtraDatum.NO_DATUM must be 0, actually ${data.fields.length}`
          );
          return {
            type: ExtraDatumType.NO_DATUM,
          };
        }
        case ExtraDatumType.DATUM_HASH: {
          invariant(
            data.fields.length === 1,
            `Field Length of ExtraDatum.DATUM_HASH must be 1, actually ${data.fields.length}`
          );
          return {
            type: ExtraDatumType.DATUM_HASH,
            hash: data.fields[0] as string,
          };
        }
        case ExtraDatumType.INLINE_DATUM: {
          invariant(
            data.fields.length === 1,
            `Field Length of ExtraDatum.INLINE_DATUM must be 1, actually ${data.fields.length}`
          );
          return {
            type: ExtraDatumType.INLINE_DATUM,
            hash: data.fields[0] as string,
          };
        }
        default: {
          throw new Error(
            `Index of ExtraDatum must be in 0-2, actual: ${data.index}`
          );
        }
      }
    }

    export function toPlutusData(extraDatum: ExtraDatum): Constr<DataType> {
      switch (extraDatum.type) {
        case ExtraDatumType.NO_DATUM: {
          return new Constr(extraDatum.type, []);
        }
        case ExtraDatumType.DATUM_HASH: {
          return new Constr(extraDatum.type, [extraDatum.hash]);
        }
        case ExtraDatumType.INLINE_DATUM: {
          return new Constr(extraDatum.type, [extraDatum.hash]);
        }
      }
    }
  }

  export type Datum = {
    canceller: AuthorizationMethod;
    refundReceiver: string;
    refundReceiverDatum: ExtraDatum;
    successReceiver: string;
    successReceiverDatum: ExtraDatum;
    lpAsset: Asset;
    step: Step;
    maxBatcherFee: bigint;
    expiredOptions?: ExpirySetting;
  };

  export namespace Datum {
    export function fromPlutusData(
      networkId: NetworkId,
      data: Constr<DataType>
    ): Datum {
      if (data.index !== 0) {
        throw new Error(
          `Index of Order Datum must be 0, actual: ${data.index}`
        );
      }
      if (data.fields.length !== 9) {
        throw new Error(
          `Fields Length of Order Datum must be 9, actual: ${data.index}`
        );
      }
      const maybeExpiry = data.fields[8] as Constr<DataType>;
      let expiry: bigint[] | undefined;
      switch (maybeExpiry.index) {
        case 0: {
          if (maybeExpiry.fields.length !== 1) {
            throw new Error(
              `Order maybeExpiry length must have 1 field, actual: ${maybeExpiry.fields.length}`
            );
          }
          if (
            !Array.isArray(maybeExpiry.fields[0]) ||
            maybeExpiry.fields[0].length !== 2
          ) {
            throw new Error(
              `maybeExpiry field0's length must be 2-element array, actual: ${maybeExpiry.fields[0]}`
            );
          }
          expiry = maybeExpiry.fields[0] as bigint[];
          break;
        }
        case 1: {
          expiry = undefined;
          if (maybeExpiry.fields.length !== 0) {
            throw new Error(
              `Order undefined Expiry must have 0 elements, actual: ${maybeExpiry.fields.length}`
            );
          }
          break;
        }
        default: {
          throw new Error(
            `Index of Maybe Expiry must be 0 or 1, actual: ${maybeExpiry.index}`
          );
        }
      }
      return {
        canceller: AuthorizationMethod.fromPlutusData(
          data.fields[0] as Constr<DataType>
        ),
        refundReceiver: AddressPlutusData.fromPlutusData(
          networkId,
          data.fields[1] as Constr<DataType>
        ),
        refundReceiverDatum: ExtraDatum.fromPlutusData(
          data.fields[2] as Constr<DataType>
        ),
        successReceiver: AddressPlutusData.fromPlutusData(
          networkId,
          data.fields[3] as Constr<DataType>
        ),
        successReceiverDatum: ExtraDatum.fromPlutusData(
          data.fields[4] as Constr<DataType>
        ),
        lpAsset: Asset.fromPlutusData(data.fields[5] as Constr<DataType>),
        step: Step.fromPlutusData(data.fields[6] as Constr<DataType>),
        maxBatcherFee: data.fields[7] as bigint,
        expiredOptions: expiry
          ? {
              expiredTime: expiry[0],
              maxCancellationTip: expiry[1],
            }
          : undefined,
      };
    }

    export function toPlutusData(datum: Datum): Constr<DataType> {
      return new Constr(0, [
        AuthorizationMethod.toPlutusData(datum.canceller),
        AddressPlutusData.toPlutusData(datum.refundReceiver),
        ExtraDatum.toPlutusData(datum.refundReceiverDatum),
        AddressPlutusData.toPlutusData(datum.successReceiver),
        ExtraDatum.toPlutusData(datum.successReceiverDatum),
        Asset.toPlutusData(datum.lpAsset),
        Step.toPlutusData(datum.step),
        datum.maxBatcherFee,
        datum.expiredOptions
          ? new Constr(0, [
              [
                datum.expiredOptions.expiredTime,
                datum.expiredOptions.maxCancellationTip,
              ],
            ])
          : new Constr(1, []),
      ]);
    }
  }

  export enum Redeemer {
    APPLY_ORDER = 0,
    CANCEL_ORDER_BY_OWNER,
    CANCEL_EXPIRED_ORDER_BY_ANYONE,
  }

  export class State {
    public readonly address: string;
    public readonly txIn: TxIn;
    public readonly value: Value;
    public readonly datumCbor: string;
    public readonly datum: Datum;

    constructor(
      networkId: NetworkId,
      address: string,
      txIn: TxIn,
      value: Value,
      datum: string
    ) {
      this.address = address;
      this.txIn = txIn;
      this.value = value;
      this.datumCbor = datum;
      this.datum = Datum.fromPlutusData(networkId, DataObject.from(datum));
    }
  }
}
