import { Address, Constr, Data } from "lucid-cardano";

import { AddressPlutusData } from "./address";
import { Asset } from "./asset";
import { NetworkId } from "./tx";

export enum OrderStepType {
    SWAP_EXACT_IN = 0,
    SWAP_EXACT_OUT,
    DEPOSIT,
    WITHDRAW,
    ZAP_IN,
}

export type SwapExactInStep = {
    type: OrderStepType.SWAP_EXACT_IN;
    desiredAsset: Asset;
    minimumReceived: bigint;
};

export type SwapExactOutStep = {
    type: OrderStepType.SWAP_EXACT_OUT;
    desiredAsset: Asset;
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
    desiredAsset: Asset;
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
    export function toPlutusData(datum: OrderDatum): Constr<Data> {
        const { sender, receiver, receiverDatumHash, step, batcherFee, depositADA } =
            datum;
        const senderConstr = AddressPlutusData.toPlutusData(sender);
        const receiverConstr = AddressPlutusData.toPlutusData(receiver);
        const receiverDatumHashConstr = receiverDatumHash
            ? new Constr(0, [receiverDatumHash])
            : new Constr(1, []);
        let datumConstr: Constr<Data>
        switch (step.type) {
            case OrderStepType.SWAP_EXACT_IN: {
                datumConstr = new Constr(0, [
                    senderConstr,
                    receiverConstr,
                    receiverDatumHashConstr,
                    new Constr(OrderStepType.SWAP_EXACT_IN, [
                        Asset.toPlutusData(step.desiredAsset),
                        step.minimumReceived,
                    ]),
                    batcherFee,
                    depositADA,
                ]);
                break;
            }
            case OrderStepType.SWAP_EXACT_OUT: {
                datumConstr = new Constr(0, [
                    senderConstr,
                    receiverConstr,
                    receiverDatumHashConstr,
                    new Constr(OrderStepType.SWAP_EXACT_OUT, [
                        Asset.toPlutusData(step.desiredAsset),
                        step.expectedReceived,
                    ]),
                    batcherFee,
                    depositADA,
                ]);
                break
            }
            case OrderStepType.DEPOSIT: {
                datumConstr = new Constr(0, [
                    senderConstr,
                    receiverConstr,
                    receiverDatumHashConstr,
                    new Constr(OrderStepType.DEPOSIT, [step.minimumLP]),
                    batcherFee,
                    depositADA,
                ]);
                break
            }
            case OrderStepType.WITHDRAW: {
                datumConstr = new Constr(0, [
                    senderConstr,
                    receiverConstr,
                    receiverDatumHashConstr,
                    new Constr(OrderStepType.WITHDRAW, [
                        step.minimumAssetA,
                        step.minimumAssetB,
                    ]),
                    batcherFee,
                    depositADA,
                ]);
                break;
            }
            case OrderStepType.ZAP_IN: {
                datumConstr = new Constr(0, [
                    senderConstr,
                    receiverConstr,
                    receiverDatumHashConstr,
                    new Constr(OrderStepType.ZAP_IN, [
                        Asset.toPlutusData(step.desiredAsset),
                        step.minimumLP,
                    ]),
                    batcherFee,
                    depositADA,
                ]);
                break;
            }
        }

        return datumConstr
    }

    export function fromPlutusData(networkId: NetworkId, data: Constr<Data>): OrderDatum {
        if (data.index !== 0) {
            throw new Error(`Index of Order Datum must be 0, actual: ${data.index}`)
        }
        const sender = AddressPlutusData.fromPlutusData(networkId, data.fields[0] as Constr<Data>)
        const receiver = AddressPlutusData.fromPlutusData(networkId, data.fields[1] as Constr<Data>)
        let receiverDatumHash: string | undefined = undefined
        const maybeReceiverDatumHash = data.fields[2] as Constr<Data>
        switch (maybeReceiverDatumHash.index) {
            case 0: {
                receiverDatumHash = maybeReceiverDatumHash.fields[0] as string
                break
            }
            case 1: {
                receiverDatumHash = undefined
                break
            }
            default: {
                throw new Error(`Index of Receiver Datum Hash must be 0 or 1, actual: ${maybeReceiverDatumHash.index}`)
            }
        }
        let step: OrderStep
        const orderStepConstr = data.fields[3] as Constr<Data>
        switch (orderStepConstr.index) {
            case OrderStepType.SWAP_EXACT_IN: {
                step = {
                    type: OrderStepType.SWAP_EXACT_IN,
                    desiredAsset: Asset.fromPlutusData(orderStepConstr.fields[0] as Constr<Data>),
                    minimumReceived: orderStepConstr.fields[1] as bigint
                }
                break;
            }
            case OrderStepType.SWAP_EXACT_OUT: {
                step = {
                    type: OrderStepType.SWAP_EXACT_OUT,
                    desiredAsset: Asset.fromPlutusData(orderStepConstr.fields[0] as Constr<Data>),
                    expectedReceived: orderStepConstr.fields[1] as bigint
                }
                break
            }
            case OrderStepType.DEPOSIT: {
                step = {
                    type: OrderStepType.DEPOSIT,
                    minimumLP: orderStepConstr.fields[0] as bigint
                }
                break
            }
            case OrderStepType.WITHDRAW: {
                step = {
                    type: OrderStepType.WITHDRAW,
                    minimumAssetA: orderStepConstr.fields[0] as bigint,
                    minimumAssetB: orderStepConstr.fields[1] as bigint
                }
                break
            }
            case OrderStepType.ZAP_IN: {
                step = {
                    type: OrderStepType.ZAP_IN,
                    desiredAsset: Asset.fromPlutusData(orderStepConstr.fields[0] as Constr<Data>),
                    minimumLP: orderStepConstr.fields[1] as bigint
                }
                break;
            }
            default: {
                throw new Error(`Index of Order Step must be in 0-4, actual: ${orderStepConstr.index}`)
            }
        }

        const batcherFee = data.fields[4] as bigint
        const depositADA = data.fields[5] as bigint
        return {
            sender: sender,
            receiver: receiver,
            receiverDatumHash: receiverDatumHash,
            step: step,
            batcherFee: batcherFee,
            depositADA: depositADA
        }
    }
}

export enum OrderRedeemer {
    APPLY_ORDER = 0,
    CANCEL_ORDER,
}
