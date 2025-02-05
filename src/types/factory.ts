import { Constr } from "@spacebudz/lucid";

import { DataObject, DataType } from "..";
import { Asset } from "./asset";
import { DexV2Constant } from "./constants";
import { NetworkId } from "./network";
import { TxIn, Value } from "./tx.internal";

export namespace FactoryV2 {
    export type Datum = {
        head: string;
        tail: string;
    }

    export namespace Datum {
        export function toPlutusData(datum: Datum): Constr<DataType> {
            return new Constr(0, [
                datum.head,
                datum.tail
            ])
        }

        export function fromPlutusData(data: Constr<DataType>): Datum {
            if (data.index !== 0) {
                throw new Error(`Index of Factory V2 Datum must be 0, actual: ${data.index}`);
            }
            return {
                head: data.fields[0] as string,
                tail: data.fields[1] as string
            }
        }
    }

    export type Redeemer = {
        assetA: Asset,
        assetB: Asset
    }

    export namespace Redeemer {
        export function toPlutusData(redeemer: Redeemer): Constr<DataType> {
            return new Constr(0, [
                Asset.toPlutusData(redeemer.assetA),
                Asset.toPlutusData(redeemer.assetB)
            ])
        }

        export function fromPlutusData(data: Constr<DataType>): Redeemer {
            if (data.index !== 0) {
                throw new Error(`Index of Factory V2 Datum must be 0, actual: ${data.index}`);
            }
            return {
                assetA: Asset.fromPlutusData(data.fields[0] as Constr<DataType>),
                assetB: Asset.fromPlutusData(data.fields[1] as Constr<DataType>)
            }
        }
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
            this.address = address
            this.txIn = txIn
            this.value = value
            this.datumCbor = datum
            this.datum = Datum.fromPlutusData(DataObject.from(datum))

            const config = DexV2Constant.CONFIG[networkId]
            if (!value.find((v) => v.unit === config.factoryAsset && v.quantity === "1")) {
                throw new Error("Cannot find the Factory Authentication Asset in the value")
            }
        }

        get head(): string {
            return this.datum.head
        }

        get tail(): string {
            return this.datum.tail
        }
    }
}