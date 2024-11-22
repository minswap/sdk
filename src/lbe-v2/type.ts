import { Address, UTxO } from "lucid-cardano";

import { LbeV2Types } from "../types/lbe-v2";

export type LbeV2SocialLinks = {
  twitter?: string;
  telegram?: string;
  discord?: string;
  website?: string;
};

export type LbeV2Tokenomic = {
  tag: string;
  percentage: string;
};

export type LbeV2ProjectDetails = {
  eventName: string;
  description?: string;
  socialLinks?: LbeV2SocialLinks;
  tokenomics?: LbeV2Tokenomic[];
};

export type LbeV2CreateEventOptions = {
  factoryUtxo: UTxO;
  lbeV2Parameters: LbeV2Types.LbeV2Parameters;
  currentSlot: number;
  sellerOwner: Address;
  sellerCount?: number;
  projectDetails?: LbeV2ProjectDetails;
};

export type LbeV2UpdateEventOptions = {
  owner: Address;
  treasuryUtxo: UTxO;
  lbeV2Parameters: LbeV2Types.LbeV2Parameters;
  currentSlot: number;
  projectDetails?: LbeV2ProjectDetails;
};

export type LbeV2CancelEventOptions = {
  treasuryUtxo: UTxO;
  cancelData:
    | { reason: LbeV2Types.CancelReason.BY_OWNER; owner: Address }
    | { reason: LbeV2Types.CancelReason.NOT_REACH_MINIMUM }
    | { reason: LbeV2Types.CancelReason.CREATED_POOL; ammPoolUtxo: UTxO };
  currentSlot: number;
};

export type LbeV2ManageOrderAction =
  | {
      type: "deposit";
      additionalAmount: bigint;
    }
  | {
      type: "withdraw";
      withdrawalAmount: bigint;
    };

export type LbeV2DepositOrWithdrawOptions = {
  currentSlot: number;
  existingOrderUtxos: UTxO[];
  treasuryUtxo: UTxO;
  sellerUtxo: UTxO;
  owner: Address;
  action: LbeV2ManageOrderAction;
};

export type CloseEventOptions = {
  treasuryUtxo: UTxO;
  headFactoryUtxo: UTxO;
  tailFactoryUtxo: UTxO;
  currentSlot: number;
  owner: Address;
};

export type AddSellersOptions = {
  treasuryUtxo: UTxO;
  managerUtxo: UTxO;
  addSellerCount: number;
  sellerOwner: Address;
  currentSlot: number;
};

export type CountingSellersOptions = {
  treasuryUtxo: UTxO;
  managerUtxo: UTxO;
  sellerUtxos: UTxO[];
  currentSlot: number;
};

export type CollectManagerOptions = {
  treasuryUtxo: UTxO;
  managerUtxo: UTxO;
  currentSlot: number;
};

export type CollectOrdersOptions = {
  treasuryUtxo: UTxO;
  orderUtxos: UTxO[];
  currentSlot: number;
};

export type RedeemOrdersOptions = {
  treasuryUtxo: UTxO;
  orderUtxos: UTxO[];
  currentSlot: number;
};

export type RefundOrdersOptions = {
  treasuryUtxo: UTxO;
  orderUtxos: UTxO[];
  currentSlot: number;
};

export type CreateAmmPoolTxOptions = {
  treasuryUtxo: UTxO;
  ammFactoryUtxo: UTxO;
  currentSlot: number;
};

export type CalculationRedeemAmountParams = {
  userAmount: bigint;
  totalPenalty: bigint;
  reserveRaise: bigint;
  totalLiquidity: bigint;
  maxRaise?: bigint;
};
