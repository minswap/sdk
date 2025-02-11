import { Utxo } from "@spacebudz/lucid";

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
  factoryUtxo: Utxo;
  lbeV2Parameters: LbeV2Types.LbeV2Parameters;
  currentSlot: number;
  sellerOwner: string;
  sellerCount?: number;
  projectDetails?: LbeV2ProjectDetails;
};

export type LbeV2UpdateEventOptions = {
  owner: string;
  treasuryUtxo: Utxo;
  lbeV2Parameters: LbeV2Types.LbeV2Parameters;
  currentSlot: number;
  projectDetails?: LbeV2ProjectDetails;
};

export type LbeV2CancelEventOptions = {
  treasuryUtxo: Utxo;
  cancelData:
    | { reason: LbeV2Types.CancelReason.BY_OWNER; owner: string }
    | { reason: LbeV2Types.CancelReason.NOT_REACH_MINIMUM }
    | { reason: LbeV2Types.CancelReason.CREATED_POOL; ammPoolUtxo: Utxo };
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
  existingOrderUtxos: Utxo[];
  treasuryUtxo: Utxo;
  sellerUtxo: Utxo;
  owner: string;
  action: LbeV2ManageOrderAction;
};

export type CloseEventOptions = {
  treasuryUtxo: Utxo;
  headFactoryUtxo: Utxo;
  tailFactoryUtxo: Utxo;
  currentSlot: number;
  owner: string;
};

export type AddSellersOptions = {
  treasuryUtxo: Utxo;
  managerUtxo: Utxo;
  addSellerCount: number;
  sellerOwner: string;
  currentSlot: number;
};

export type CountingSellersOptions = {
  treasuryUtxo: Utxo;
  managerUtxo: Utxo;
  sellerUtxos: Utxo[];
  currentSlot: number;
};

export type CollectManagerOptions = {
  treasuryUtxo: Utxo;
  managerUtxo: Utxo;
  currentSlot: number;
};

export type CollectOrdersOptions = {
  treasuryUtxo: Utxo;
  orderUtxos: Utxo[];
  currentSlot: number;
};

export type RedeemOrdersOptions = {
  treasuryUtxo: Utxo;
  orderUtxos: Utxo[];
  currentSlot: number;
};

export type RefundOrdersOptions = {
  treasuryUtxo: Utxo;
  orderUtxos: Utxo[];
  currentSlot: number;
};

export type CreateAmmPoolTxOptions = {
  treasuryUtxo: Utxo;
  ammFactoryUtxo: Utxo;
  currentSlot: number;
};

export type CalculationRedeemAmountParams = {
  userAmount: bigint;
  totalPenalty: bigint;
  reserveRaise: bigint;
  totalLiquidity: bigint;
  maxRaise?: bigint;
};
