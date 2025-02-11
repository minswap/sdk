import invariant from "@minswap/tiny-invariant";
import { Constr } from "@spacebudz/lucid";

import { Asset, DataObject, DataType, LbeV2Constant, NetworkId, PoolV2 } from "..";
import { AddressPlutusData } from "./address.internal";
import { Bool, Options } from "./common";
import { TxIn, Value } from "./tx.internal";

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

  export namespace ReceiverDatum {
    export function toPlutusData(data: ReceiverDatum): Constr<DataType> {
      switch (data.type) {
        case ReceiverDatumType.NO_DATUM: {
          return new Constr(0, []);
        }
        case ReceiverDatumType.DATUM_HASH: {
          return new Constr(1, [data.hash]);
        }
        case ReceiverDatumType.INLINE_DATUM: {
          return new Constr(2, [data.hash]);
        }
      }
    }

    export function fromPlutusData(data: Constr<DataType>): ReceiverDatum {
      switch (data.index) {
        case ReceiverDatumType.NO_DATUM: {
          invariant(
            data.fields.length === 0,
            `NO_DATUM Receiver Datum fields length must be 0, actual: ${data.fields.length}`
          );
          return { type: ReceiverDatumType.NO_DATUM };
        }
        case ReceiverDatumType.DATUM_HASH: {
          invariant(
            data.fields.length === 1,
            `DATUM_HASH Receiver Datum fields length must be 1, actual: ${data.fields.length}`
          );
          return {
            type: ReceiverDatumType.DATUM_HASH,
            hash: data.fields[0] as string,
          };
        }
        case ReceiverDatumType.INLINE_DATUM: {
          invariant(
            data.fields.length === 1,
            `INLINE_DATUM Receiver Datum fields length must be 1, actual: ${data.fields.length}`
          );
          return {
            type: ReceiverDatumType.INLINE_DATUM,
            hash: data.fields[0] as string,
          };
        }
        default: {
          throw Error(
            `Index of Receiver Datum must be 0, 1 or 2, actual: ${data.index}`
          );
        }
      }
    }
  }

  export type PenaltyConfig = {
    penaltyStartTime: bigint;
    percent: bigint;
  };

  export namespace PenaltyConfig {
    export function toPlutusData(data: PenaltyConfig): Constr<DataType> {
      return new Constr(0, [data.penaltyStartTime, data.percent]);
    }

    export function fromPlutusData(data: Constr<DataType>): PenaltyConfig {
      switch (data.index) {
        case 0: {
          invariant(
            data.fields.length === 2,
            `Penalty Config fields length must be 2, actual: ${data.fields.length}`
          );
          return {
            penaltyStartTime: data.fields[0] as bigint,
            percent: data.fields[1] as bigint,
          };
        }
        default: {
          throw Error(
            `Index of Penalty Config must be 0, actual: ${data.index}`
          );
        }
      }
    }
  }

  export type TreasuryDatum = {
    factoryPolicyId: string;
    managerHash: string;
    sellerHash: string;
    orderHash: string;
    baseAsset: Asset;

    raiseAsset: Asset;
    startTime: bigint;
    endTime: bigint;
    owner: string;
    receiver: string;

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
    export function toPlutusData(datum: TreasuryDatum): Constr<DataType> {
      const {
        factoryPolicyId,
        managerHash,
        sellerHash,
        orderHash,
        baseAsset,

        raiseAsset,
        startTime,
        endTime,
        owner,
        receiver,

        receiverDatum,
        poolAllocation,
        minimumOrderRaise,
        minimumRaise,
        maximumRaise,

        reserveBase,
        penaltyConfig,
        poolBaseFee,
        revocable,
        collectedFund,

        reserveRaise,
        totalPenalty,
        totalLiquidity,
        isCancelled,
        isManagerCollected,
      } = datum;
      return new Constr(0, [
        factoryPolicyId,
        managerHash,
        sellerHash,
        orderHash,
        Asset.toPlutusData(baseAsset),

        Asset.toPlutusData(raiseAsset),
        startTime,
        endTime,
        AddressPlutusData.toPlutusData(owner),
        AddressPlutusData.toPlutusData(receiver),

        ReceiverDatum.toPlutusData(receiverDatum),
        poolAllocation,
        Options.toPlutusData(minimumOrderRaise, (x) => x),
        Options.toPlutusData(minimumRaise, (x) => x),
        Options.toPlutusData(maximumRaise, (x) => x),

        reserveBase,
        Options.toPlutusData(penaltyConfig, PenaltyConfig.toPlutusData),
        poolBaseFee,
        Bool.toPlutusData(revocable),
        collectedFund,

        reserveRaise,
        totalPenalty,
        totalLiquidity,
        Bool.toPlutusData(isCancelled),
        Bool.toPlutusData(isManagerCollected),
      ]);
    }

    export function fromPlutusData(
      networkId: NetworkId,
      data: Constr<DataType>
    ): TreasuryDatum {
      if (data.index !== 0) {
        throw new Error(
          `Index of Treasury Datum must be 0, actual: ${data.index}`
        );
      }

      invariant(
        data.fields.length === 25,
        `Treasury Datum fields length must be 25, actual: ${data.fields.length}`
      );
      const fields = data.fields;
      return {
        factoryPolicyId: fields[0] as string,
        managerHash: fields[1] as string,
        sellerHash: fields[2] as string,
        orderHash: fields[3] as string,
        baseAsset: Asset.fromPlutusData(fields[4] as Constr<DataType>),

        raiseAsset: Asset.fromPlutusData(fields[5] as Constr<DataType>),
        startTime: fields[6] as bigint,
        endTime: fields[7] as bigint,
        owner: AddressPlutusData.fromPlutusData(
          networkId,
          fields[8] as Constr<DataType>
        ),
        receiver: AddressPlutusData.fromPlutusData(
          networkId,
          fields[9] as Constr<DataType>
        ),

        receiverDatum: ReceiverDatum.fromPlutusData(fields[10] as Constr<DataType>),
        poolAllocation: fields[11] as bigint,
        minimumOrderRaise: Options.fromPlutusData<bigint>(
          fields[12] as Constr<DataType>,
          (data) => data as bigint
        ),
        minimumRaise: Options.fromPlutusData<bigint>(
          fields[13] as Constr<DataType>,
          (data) => data as bigint
        ),
        maximumRaise: Options.fromPlutusData<bigint>(
          fields[14] as Constr<DataType>,
          (data) => data as bigint
        ),

        reserveBase: fields[15] as bigint,
        penaltyConfig: Options.fromPlutusData(
          fields[16] as Constr<DataType>,
          (data) => PenaltyConfig.fromPlutusData(data as Constr<DataType>)
        ),
        poolBaseFee: fields[17] as bigint,
        revocable: Bool.fromPlutusData(fields[18] as Constr<DataType>),
        collectedFund: fields[19] as bigint,

        reserveRaise: fields[20] as bigint,
        totalPenalty: fields[21] as bigint,
        totalLiquidity: fields[22] as bigint,
        isCancelled: Bool.fromPlutusData(fields[23] as Constr<DataType>),
        isManagerCollected: Bool.fromPlutusData(fields[24] as Constr<DataType>),
      };
    }
  }

  export enum TreasuryRedeemerType {
    COLLECT_MANAGER = 0,
    COLLECT_ORDERS = 1,
    CREATE_AMM_POOL = 2,
    REDEEM_ORDERS = 3,
    CLOSE_EVENT = 4,
    CANCEL_LBE = 5,
    UPDATE_LBE = 6,
  }

  export enum CancelReason {
    CREATED_POOL = 0,
    BY_OWNER = 1,
    NOT_REACH_MINIMUM = 2,
  }

  export type TreasuryRedeemer =
    | {
        type:
          | TreasuryRedeemerType.COLLECT_MANAGER
          | TreasuryRedeemerType.COLLECT_ORDERS
          | TreasuryRedeemerType.CREATE_AMM_POOL
          | TreasuryRedeemerType.REDEEM_ORDERS
          | TreasuryRedeemerType.CLOSE_EVENT
          | TreasuryRedeemerType.UPDATE_LBE;
      }
    | {
        type: TreasuryRedeemerType.CANCEL_LBE;
        reason: CancelReason;
      };

  export namespace TreasuryRedeemer {
    export function toPlutusData(data: TreasuryRedeemer): Constr<DataType> {
      switch (data.type) {
        case TreasuryRedeemerType.COLLECT_MANAGER:
        case TreasuryRedeemerType.COLLECT_ORDERS:
        case TreasuryRedeemerType.CREATE_AMM_POOL:
        case TreasuryRedeemerType.REDEEM_ORDERS:
        case TreasuryRedeemerType.CLOSE_EVENT:
        case TreasuryRedeemerType.UPDATE_LBE: {
          return new Constr(data.type, []);
        }
        case TreasuryRedeemerType.CANCEL_LBE: {
          return new Constr(data.type, [new Constr(data.reason, [])]);
        }
      }
    }
  }

  export class TreasuryState {
    public readonly address: string;
    public readonly txIn: TxIn;
    public readonly value: Value;
    public readonly datumCbor: string;
    public readonly datum: TreasuryDatum;

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
      this.datum = TreasuryDatum.fromPlutusData(networkId, DataObject.from(datum));

      const config = LbeV2Constant.CONFIG[networkId];
      if (
        !value.find(
          (v) => v.unit === config.treasuryAsset && v.quantity === "1"
        )
      ) {
        throw new Error(
          "Cannot find the Treasury Authentication Asset in the value"
        );
      }
    }

    get lbeId(): string {
      return PoolV2.computeLPAssetName(
        this.datum.baseAsset,
        this.datum.raiseAsset
      );
    }
  }

  export type LbeV2Parameters = {
    baseAsset: Asset;
    reserveBase: bigint;
    raiseAsset: Asset;
    startTime: bigint;
    endTime: bigint;
    owner: string;
    receiver: string;
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
      networkId: NetworkId,
      lbeV2Parameters: LbeV2Parameters
    ): TreasuryDatum {
      const config = LbeV2Constant.CONFIG[networkId];
      const treasuryDatum: TreasuryDatum = {
        factoryPolicyId: config.factoryHash,
        managerHash: config.managerHash,
        sellerHash: config.sellerHash,
        orderHash: config.orderHash,
        baseAsset: lbeV2Parameters.baseAsset,

        raiseAsset: lbeV2Parameters.raiseAsset,
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

  export type FactoryDatum = {
    head: string;
    tail: string;
  };

  export namespace FactoryDatum {
    export function toPlutusData(data: FactoryDatum): Constr<DataType> {
      return new Constr(0, [data.head, data.tail]);
    }

    export function fromPlutusData(data: Constr<DataType>): FactoryDatum {
      switch (data.index) {
        case 0: {
          invariant(
            data.fields.length === 2,
            `Factory Datum fields length must be 2, actual: ${data.fields.length}`
          );
          return {
            head: data.fields[0] as string,
            tail: data.fields[1] as string,
          };
        }
        default: {
          throw Error(`Index of FactoryDatum must be 0, actual: ${data.index}`);
        }
      }
    }
  }

  export enum FactoryRedeemerType {
    INITIALIZATION = 0,
    CREATE_TREASURY = 1,
    CLOSE_TREASURY = 2,
    MINT_MANAGER = 3,
    MINT_SELLER = 4,
    BURN_SELLER = 5,
    MINT_ORDER = 6,
    MINT_REDEEM_ORDERS = 7,
    MANAGE_ORDER = 8,
  }

  export type FactoryRedeemer =
    | {
        type:
          | FactoryRedeemerType.INITIALIZATION
          | FactoryRedeemerType.MINT_MANAGER
          | FactoryRedeemerType.MINT_SELLER
          | FactoryRedeemerType.BURN_SELLER
          | FactoryRedeemerType.MINT_ORDER
          | FactoryRedeemerType.MINT_REDEEM_ORDERS
          | FactoryRedeemerType.MANAGE_ORDER;
      }
    | {
        type:
          | FactoryRedeemerType.CREATE_TREASURY
          | FactoryRedeemerType.CLOSE_TREASURY;
        baseAsset: Asset;
        raiseAsset: Asset;
      };

  export namespace FactoryRedeemer {
    export function toPlutusData(data: FactoryRedeemer): Constr<DataType> {
      switch (data.type) {
        case FactoryRedeemerType.INITIALIZATION:
        case FactoryRedeemerType.MINT_MANAGER:
        case FactoryRedeemerType.MINT_SELLER:
        case FactoryRedeemerType.BURN_SELLER:
        case FactoryRedeemerType.MINT_ORDER:
        case FactoryRedeemerType.MINT_REDEEM_ORDERS:
        case FactoryRedeemerType.MANAGE_ORDER: {
          return new Constr(data.type, []);
        }
        case FactoryRedeemerType.CREATE_TREASURY:
        case FactoryRedeemerType.CLOSE_TREASURY: {
          return new Constr(data.type, [
            Asset.toPlutusData(data.baseAsset),
            Asset.toPlutusData(data.raiseAsset),
          ]);
        }
      }
    }
  }

  export class FactoryState {
    public readonly address: string;
    public readonly txIn: TxIn;
    public readonly value: Value;
    public readonly datumCbor: string;
    public readonly datum: FactoryDatum;

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
      this.datum = FactoryDatum.fromPlutusData(DataObject.from(datum));

      const config = LbeV2Constant.CONFIG[networkId];
      if (
        !value.find((v) => v.unit === config.factoryAsset && v.quantity === "1")
      ) {
        throw new Error(
          "Cannot find the Factory Authentication Asset in the value"
        );
      }
    }

    get head(): string {
      return this.datum.head;
    }

    get tail(): string {
      return this.datum.tail;
    }
  }

  export type ManagerDatum = {
    factoryPolicyId: string;
    baseAsset: Asset;
    raiseAsset: Asset;
    sellerCount: bigint;
    reserveRaise: bigint;
    totalPenalty: bigint;
  };

  export namespace ManagerDatum {
    export function toPlutusData(data: ManagerDatum): Constr<DataType> {
      return new Constr(0, [
        data.factoryPolicyId,
        Asset.toPlutusData(data.baseAsset),
        Asset.toPlutusData(data.raiseAsset),
        data.sellerCount,
        data.reserveRaise,
        data.totalPenalty,
      ]);
    }

    export function fromPlutusData(data: Constr<DataType>): ManagerDatum {
      switch (data.index) {
        case 0: {
          const fields = data.fields;
          invariant(
            fields.length === 6,
            `Manager Datum fields length must be 6, actual: ${fields.length}`
          );
          return {
            factoryPolicyId: fields[0] as string,
            baseAsset: Asset.fromPlutusData(fields[1] as Constr<DataType>),
            raiseAsset: Asset.fromPlutusData(fields[2] as Constr<DataType>),
            sellerCount: fields[3] as bigint,
            reserveRaise: fields[4] as bigint,
            totalPenalty: fields[5] as bigint,
          };
        }
        default: {
          throw Error(`Index of FactoryDatum must be 0, actual: ${data.index}`);
        }
      }
    }
  }

  export enum ManagerRedeemer {
    ADD_SELLERS = 0,
    COLLECT_SELLERS = 1,
    SPEND_MANAGER = 2,
  }
  export namespace ManagerRedeemer {
    export function toPlutusData(data: ManagerRedeemer): Constr<DataType> {
      return new Constr(data, []);
    }
  }

  export class ManagerState {
    public readonly address: string;
    public readonly txIn: TxIn;
    public readonly value: Value;
    public readonly datumCbor: string;
    public readonly datum: ManagerDatum;

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
      this.datum = ManagerDatum.fromPlutusData(DataObject.from(datum));

      const config = LbeV2Constant.CONFIG[networkId];
      if (
        !value.find((v) => v.unit === config.managerAsset && v.quantity === "1")
      ) {
        throw new Error(
          "Cannot find the Manager Authentication Asset in the value"
        );
      }
    }

    get lbeId(): string {
      return PoolV2.computeLPAssetName(
        this.datum.baseAsset,
        this.datum.raiseAsset
      );
    }
  }

  export type SellerDatum = {
    factoryPolicyId: string;
    owner: string;
    baseAsset: Asset;
    raiseAsset: Asset;
    amount: bigint;
    penaltyAmount: bigint;
  };

  export namespace SellerDatum {
    export function toPlutusData(data: SellerDatum): Constr<DataType> {
      return new Constr(0, [
        data.factoryPolicyId,
        AddressPlutusData.toPlutusData(data.owner),
        Asset.toPlutusData(data.baseAsset),
        Asset.toPlutusData(data.raiseAsset),
        data.amount,
        data.penaltyAmount,
      ]);
    }

    export function fromPlutusData(
      data: Constr<DataType>,
      networkId: NetworkId
    ): SellerDatum {
      switch (data.index) {
        case 0: {
          const fields = data.fields;
          invariant(
            fields.length === 6,
            `Seller Datum fields length must be 6, actual: ${fields.length}`
          );
          return {
            factoryPolicyId: fields[0] as string,
            owner: AddressPlutusData.fromPlutusData(
              networkId,
              fields[1] as Constr<DataType>
            ),
            baseAsset: Asset.fromPlutusData(fields[2] as Constr<DataType>),
            raiseAsset: Asset.fromPlutusData(fields[3] as Constr<DataType>),
            amount: fields[4] as bigint,
            penaltyAmount: fields[5] as bigint,
          };
        }
        default: {
          throw Error(`Index of SellerDatum must be 0, actual: ${data.index}`);
        }
      }
    }
  }

  export enum SellerRedeemer {
    USING_SELLER = 0,
    COUNTING_SELLERS = 1,
  }

  export namespace SellerRedeemer {
    export function toPlutusData(data: SellerRedeemer): Constr<DataType> {
      return new Constr(data, []);
    }
  }

  export class SellerState {
    public readonly address: string;
    public readonly txIn: TxIn;
    public readonly value: Value;
    public readonly datumCbor: string;
    public readonly datum: SellerDatum;

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
      this.datum = SellerDatum.fromPlutusData(DataObject.from(datum), networkId);

      const config = LbeV2Constant.CONFIG[networkId];
      if (
        !value.find((v) => v.unit === config.sellerAsset && v.quantity === "1")
      ) {
        throw new Error(
          "Cannot find the Seller Authentication Asset in the value"
        );
      }
    }

    get lbeId(): string {
      return PoolV2.computeLPAssetName(
        this.datum.baseAsset,
        this.datum.raiseAsset
      );
    }
  }

  export type OrderDatum = {
    factoryPolicyId: string;
    baseAsset: Asset;
    raiseAsset: Asset;
    owner: string;
    amount: bigint;
    isCollected: boolean;
    penaltyAmount: bigint;
  };

  export namespace OrderDatum {
    export function toPlutusData(data: OrderDatum): Constr<DataType> {
      return new Constr(0, [
        data.factoryPolicyId,
        Asset.toPlutusData(data.baseAsset),
        Asset.toPlutusData(data.raiseAsset),
        AddressPlutusData.toPlutusData(data.owner),
        data.amount,
        Bool.toPlutusData(data.isCollected),
        data.penaltyAmount,
      ]);
    }

    export function fromPlutusData(
      data: Constr<DataType>,
      networkId: NetworkId
    ): OrderDatum {
      switch (data.index) {
        case 0: {
          const fields = data.fields;
          invariant(
            fields.length === 7,
            `Order Datum fields length must be 7, actual: ${fields.length}`
          );
          return {
            factoryPolicyId: fields[0] as string,
            baseAsset: Asset.fromPlutusData(fields[1] as Constr<DataType>),
            raiseAsset: Asset.fromPlutusData(fields[2] as Constr<DataType>),
            owner: AddressPlutusData.fromPlutusData(
              networkId,
              fields[3] as Constr<DataType>
            ),
            amount: fields[4] as bigint,
            isCollected: Bool.fromPlutusData(fields[5] as Constr<DataType>),
            penaltyAmount: fields[6] as bigint,
          };
        }
        default: {
          throw Error(`Index of OrderDatum must be 0, actual: ${data.index}`);
        }
      }
    }
  }

  export enum OrderRedeemer {
    UPDATE_ORDER = 0,
    COLLECT_ORDER = 1,
    REDEEM_ORDER = 2,
  }

  export namespace OrderRedeemer {
    export function toPlutusData(data: OrderRedeemer): Constr<DataType> {
      return new Constr(data, []);
    }
  }
  export class OrderState {
    public readonly address: string;
    public readonly txIn: TxIn;
    public readonly value: Value;
    public readonly datumCbor: string;
    public readonly datum: OrderDatum;

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
      this.datum = OrderDatum.fromPlutusData(DataObject.from(datum), networkId);

      const config = LbeV2Constant.CONFIG[networkId];
      if (
        !value.find((v) => v.unit === config.orderAsset && v.quantity === "1")
      ) {
        throw new Error(
          "Cannot find the Order Authentication Asset in the value"
        );
      }
    }

    get lbeId(): string {
      return PoolV2.computeLPAssetName(
        this.datum.baseAsset,
        this.datum.raiseAsset
      );
    }

    get owner(): string {
      return this.datum.owner;
    }
  }
}
