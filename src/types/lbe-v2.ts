import { Address, Constr, Data } from "lucid-cardano";

import { Asset, LbeV2Constant, NetworkId } from "..";
import { AddressPlutusData } from "./address.internal";
import { Bool, Dummy, Options } from "./common";
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
    export function toPlutusData(data: ReceiverDatum): Constr<Data> {
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

    export function fromPlutusData(data: Constr<Data>): ReceiverDatum {
      switch (data.index) {
        case 0: {
          return { type: ReceiverDatumType.NO_DATUM };
        }
        case 1: {
          return {
            type: ReceiverDatumType.DATUM_HASH,
            hash: data.fields[0] as string,
          };
        }
        case 2: {
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
    export function toPlutusData(data: PenaltyConfig): Constr<Data> {
      return new Constr(0, [data.penaltyStartTime, data.percent]);
    }

    export function fromPlutusData(data: Constr<Data>): PenaltyConfig {
      switch (data.index) {
        case 0: {
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
    export function toPlutusData(datum: TreasuryDatum): Constr<Data> {
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
        Options.toPlutusData(minimumOrderRaise, Dummy.toPlutusData),
        Options.toPlutusData(minimumRaise, Dummy.toPlutusData),
        Options.toPlutusData(maximumRaise, Dummy.toPlutusData),

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
      data: Constr<Data>
    ): TreasuryDatum {
      if (data.index !== 0) {
        throw new Error(
          `Index of Treasury Datum must be 0, actual: ${data.index}`
        );
      }

      const fields = data.fields;
      return {
        factoryPolicyId: fields[0] as string,
        managerHash: fields[1] as string,
        sellerHash: fields[2] as string,
        orderHash: fields[3] as string,
        baseAsset: Asset.fromPlutusData(fields[4] as Constr<Data>),

        raiseAsset: Asset.fromPlutusData(fields[5] as Constr<Data>),
        startTime: fields[6] as bigint,
        endTime: fields[7] as bigint,
        owner: AddressPlutusData.fromPlutusData(
          networkId,
          fields[8] as Constr<Data>
        ),
        receiver: AddressPlutusData.fromPlutusData(
          networkId,
          fields[9] as Constr<Data>
        ),

        receiverDatum: ReceiverDatum.fromPlutusData(fields[10] as Constr<Data>),
        poolAllocation: fields[11] as bigint,
        minimumOrderRaise: Options.fromPlutusData<bigint>(
          fields[12] as Constr<Data>,
          Dummy.fromPlutusData
        ),
        minimumRaise: Options.fromPlutusData<bigint>(
          fields[13] as Constr<Data>,
          Dummy.fromPlutusData
        ),
        maximumRaise: Options.fromPlutusData<bigint>(
          fields[14] as Constr<Data>,
          Dummy.fromPlutusData
        ),

        reserveBase: fields[15] as bigint,
        penaltyConfig: Options.fromPlutusData(
          fields[16] as Constr<Data>,
          PenaltyConfig.fromPlutusData
        ),
        poolBaseFee: fields[17] as bigint,
        revocable: Bool.fromPlutusData(fields[18] as Constr<Data>),
        collectedFund: fields[19] as bigint,

        reserveRaise: fields[20] as bigint,
        totalPenalty: fields[21] as bigint,
        totalLiquidity: fields[22] as bigint,
        isCancelled: Bool.fromPlutusData(fields[23] as Constr<Data>),
        isManagerCollected: Bool.fromPlutusData(fields[24] as Constr<Data>),
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
    export function toPlutusData(data: TreasuryRedeemer): Constr<Data> {
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

        raiseAsset: lbeV2Parameters.baseAsset,
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
    export function toPlutusData(data: FactoryDatum): Constr<Data> {
      return new Constr(0, [data.head, data.tail]);
    }

    export function fromPlutusData(data: Constr<Data>): FactoryDatum {
      switch (data.index) {
        case 0: {
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
    export function toPlutusData(data: FactoryRedeemer): Constr<Data> {
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

  export type ManagerDatum = {
    factoryPolicyId: string;
    baseAsset: Asset;
    raiseAsset: Asset;
    sellerCount: bigint;
    reserveRaise: bigint;
    totalPenalty: bigint;
  };

  export namespace ManagerDatum {
    export function toPlutusData(data: ManagerDatum): Constr<Data> {
      return new Constr(0, [
        data.factoryPolicyId,
        Asset.toPlutusData(data.baseAsset),
        Asset.toPlutusData(data.raiseAsset),
        data.sellerCount,
        data.reserveRaise,
        data.totalPenalty,
      ]);
    }

    export function fromPlutusData(data: Constr<Data>): ManagerDatum {
      switch (data.index) {
        case 0: {
          const fields = data.fields;
          return {
            factoryPolicyId: fields[0] as string,
            baseAsset: Asset.fromPlutusData(fields[1] as Constr<Data>),
            raiseAsset: Asset.fromPlutusData(fields[2] as Constr<Data>),
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
    export function toPlutusData(data: ManagerRedeemer): Constr<Data> {
      return new Constr(data, []);
    }
  }

  export type SellerDatum = {
    factoryPolicyId: string;
    owner: Address;
    baseAsset: Asset;
    raiseAsset: Asset;
    amount: bigint;
    penaltyAmount: bigint;
  };

  export namespace SellerDatum {
    export function toPlutusData(data: SellerDatum): Constr<Data> {
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
      data: Constr<Data>,
      networkId: NetworkId
    ): SellerDatum {
      switch (data.index) {
        case 0: {
          const fields = data.fields;
          return {
            factoryPolicyId: fields[0] as string,
            owner: AddressPlutusData.fromPlutusData(
              networkId,
              fields[1] as Constr<Data>
            ),
            baseAsset: Asset.fromPlutusData(fields[2] as Constr<Data>),
            raiseAsset: Asset.fromPlutusData(fields[3] as Constr<Data>),
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
    export function toPlutusData(data: SellerRedeemer): Constr<Data> {
      return new Constr(data, []);
    }
  }

  export type OrderDatum = {
    factoryPolicyId: string;
    baseAsset: Asset;
    raiseAsset: Asset;
    owner: Address;
    amount: bigint;
    isCollected: boolean;
    penaltyAmount: bigint;
  };

  export namespace OrderDatum {
    export function toPlutusData(data: OrderDatum): Constr<Data> {
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
      data: Constr<Data>,
      networkId: NetworkId
    ): OrderDatum {
      switch (data.index) {
        case 0: {
          const fields = data.fields;
          return {
            factoryPolicyId: fields[0] as string,
            baseAsset: Asset.fromPlutusData(fields[1] as Constr<Data>),
            raiseAsset: Asset.fromPlutusData(fields[2] as Constr<Data>),
            owner: AddressPlutusData.fromPlutusData(
              networkId,
              fields[3] as Constr<Data>
            ),
            amount: fields[4] as bigint,
            isCollected: Bool.fromPlutusData(fields[5] as Constr<Data>),
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
    export function toPlutusData(data: OrderRedeemer): Constr<Data> {
      return new Constr(data, []);
    }
  }
}
