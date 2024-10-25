import invariant from "@minswap/tiny-invariant";
import {
  Address,
  Assets,
  Constr,
  Data,
  Lucid,
  TxComplete,
  UTxO,
} from "lucid-cardano";

import {
  FIXED_DEPOSIT_ADA,
  LbeV2Constant,
  MAX_POOL_V2_TRADING_FEE_NUMERATOR,
  MetadataMessage,
  MIN_POOL_V2_TRADING_FEE_NUMERATOR,
  PoolV2,
  StableOrder,
  StableswapConstant,
} from ".";
import { calculateBatcherFee } from "./batcher-fee-reduction/calculate";
import { Asset } from "./types/asset";
import { LbeV2Types } from "./types/lbe-v2";
import { NetworkEnvironment, NetworkId } from "./types/network";
import { lucidToNetworkEnv } from "./utils/network.internal";
import { buildUtxoToStoreDatum } from "./utils/tx.internal";

export type CreateLbeV2EventOptions = {
  networkEnv: NetworkEnvironment;
  factoryUtxo: UTxO;
  lbeV2Parameters: LbeV2Types.LbeV2Parameters;
  currentSlot: number;
  sellerOwner: Address;
  sellerCount?: number;
  projectDetails?: string[];
};

export class LbeV2 {
  private readonly lucid: Lucid;
  private readonly networkId: NetworkId;
  private readonly networkEnv: NetworkEnvironment;

  constructor(lucid: Lucid) {
    this.lucid = lucid;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
    this.networkEnv = lucidToNetworkEnv(lucid.network);
  }

  // MARK: Create Event
  private validateCreateEvent(options: CreateLbeV2EventOptions): void {
    const { lbeV2Parameters, currentSlot, factoryUtxo } = options;
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);
    const { baseAsset, raiseAsset } = lbeV2Parameters;
    const datum = factoryUtxo.datum;
    invariant(datum, "Factory utxo must have inline datum");
    const factory = LbeV2Types.FactoryDatum.fromPlutusData(Data.from(datum));
    const config = LbeV2Constant.CONFIG[this.networkId];
    invariant(
      config.factoryAsset in factoryUtxo.assets,
      "Factory utxo assets must have factory asset"
    );
    const lbeV2Id = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
    invariant(
      factory.head < lbeV2Id && lbeV2Id < factory.tail,
      "LBE ID name must be between factory head and tail"
    );
    this.validateLbeV2Parameters(lbeV2Parameters, currentTime);
  }

  validateLbeV2Parameters(
    params: LbeV2Types.LbeV2Parameters,
    currentTime: number
  ): void {
    const {
      poolBaseFee,
      penaltyConfig,
      reserveBase,
      minimumRaise,
      maximumRaise,
      minimumOrderRaise,
      poolAllocation,
      startTime,
      endTime,
      baseAsset,
      raiseAsset,
    } = params;
    invariant(
      Asset.toString(baseAsset) !== Asset.toString(raiseAsset),
      "Base Asset, Raise Asset must be different"
    );
    invariant(
      Asset.toString(baseAsset) !== "lovelace",
      "Base Asset must not equal ADA"
    );
    invariant(startTime >= BigInt(currentTime), "LBE must start in future");
    invariant(startTime < endTime, "StartTime < EndTime");
    invariant(
      endTime - startTime <= LbeV2Constant.MAX_DISCOVERY_RANGE,
      "Discovery Phase must in a month"
    );
    invariant(
      poolAllocation >= LbeV2Constant.MIN_POOL_ALLOCATION_POINT,
      `Pool Allocation must greater than ${LbeV2Constant.MIN_POOL_ALLOCATION_POINT}`
    );
    invariant(
      poolAllocation <= LbeV2Constant.MAX_POOL_ALLOCATION_POINT,
      `Pool Allocation must less than ${LbeV2Constant.MAX_POOL_ALLOCATION_POINT}`
    );
    if (minimumOrderRaise) {
      invariant(minimumOrderRaise > 0n, "Minimum Order > 0");
    }
    if (maximumRaise) {
      invariant(maximumRaise > 0n, "Maximum Raise > 0");
    }
    if (minimumRaise) {
      invariant(minimumRaise > 0n, "Minimum Raise > 0");
      if (maximumRaise !== undefined) {
        invariant(minimumRaise < maximumRaise, "Minimum Raise < Maximum Raise");
      }
    }
    invariant(reserveBase > 0n, "Reserve Base > 0");
    if (penaltyConfig) {
      const { penaltyStartTime, percent } = penaltyConfig;
      invariant(
        penaltyStartTime > startTime,
        "Penalty Start Time > Start Time"
      );
      invariant(penaltyStartTime < endTime, "Penalty Start Time < End Time");
      invariant(
        penaltyStartTime >= endTime - LbeV2Constant.MAX_PENALTY_RANGE,
        "Maximum penalty period of 2 final days"
      );
      invariant(percent > 0n, "Penalty Percent > 0");
      invariant(
        percent <= LbeV2Constant.MAX_PENALTY_RATE,
        `Penalty Percent <= ${LbeV2Constant.MAX_PENALTY_RATE}`
      );
    }
    const poolBaseFeeMin = MIN_POOL_V2_TRADING_FEE_NUMERATOR;
    const poolBaseFeeMax = MAX_POOL_V2_TRADING_FEE_NUMERATOR;
    invariant(
      poolBaseFee >= poolBaseFeeMin && poolBaseFee <= poolBaseFeeMax,
      `Pool Base Fee must in range ${poolBaseFeeMin} - ${poolBaseFeeMax}`
    );
  }

  async createTreasury(options: CreateLbeV2EventOptions): Promise<TxComplete> {
    const {
      lbeV2Parameters,
      factoryUtxo,
      sellerOwner,
      projectDetails,
      networkEnv,
    } = options;
    const sellerCount: number =
      options.sellerCount ?? Number(LbeV2Constant.DEFAULT_SELLER_COUNT);
    this.validateCreateEvent(options);
    const factory = Result.unwrap(LbeV2Factory.fromUtxo(factoryUtxo));
    const warehouse = LbeV2Warehouse.getInstance(networkEnv);
    const factoryRedeemer = LbeV2FactoryRedeemer.toPlutusJson({
      type: LbeV2FactoryRedeemerType.CREATE_TREASURY,
      baseAsset: lbeV2Parameters.baseAsset,
      raiseAsset: lbeV2Parameters.raiseAsset,
    });
    const wrapperFactoryRedeemer =
      RedeemerWrapper.wrapRedeemer(factoryRedeemer);

    const treasuryValue = warehouse
      .getDefaultTreasuryValue()
      .add(lbeV2Parameters.baseAsset, lbeV2Parameters.reserveBase);

    const treasuryDatum: LbeV2TreasuryDatum =
      LbeV2TreasuryDatum.fromLbeV2Parameters(lbeV2Parameters);
    const treasuryOutput = new TxOut(
      warehouse.getTreasuryAddress(),
      treasuryValue,
      LbeV2TreasuryDatum.toDatumSource(treasuryDatum)
    );
    const lbeV2Id = PoolV2.computeLPAssetName(
      lbeV2Parameters.baseAsset,
      lbeV2Parameters.raiseAsset
    );
    const factoryHeadOutput = new TxOut(
      warehouse.getFactoryAddress(),
      warehouse.getDefaultFactoryValue(),
      LbeV2FactoryDatum.toDatumSource({
        head: factory.head,
        tail: lbeV2Id,
      })
    );

    const factoryTailOutput = new TxOut(
      warehouse.getFactoryAddress(),
      warehouse.getDefaultFactoryValue(),
      LbeV2FactoryDatum.toDatumSource({
        head: lbeV2Id,
        tail: factory.tail,
      })
    );

    const managerOutput = new TxOut(
      warehouse.getManagerAddress(),
      warehouse.getDefaultManagerValue(),
      LbeV2ManagerDatum.toDatumSource({
        factoryPolicyId: warehouse.getFactoryHash(),
        baseAsset: lbeV2Parameters.baseAsset,
        raiseAsset: lbeV2Parameters.raiseAsset,
        sellerCount: BigInt(sellerCount),
        reserveRaise: 0n,
        totalPenalty: 0n,
      })
    );

    const sellerOutputs: TxOut[] = [];
    for (let i = 0; i < sellerCount; i++) {
      const txOut = new TxOut(
        warehouse.getSellerAddress(),
        warehouse.getDefaultSellerValue(),
        LbeV2SellerDatum.toDatumSource({
          factoryPolicyId: warehouse.getFactoryHash(),
          owner: sellerOwner,
          baseAsset: lbeV2Parameters.baseAsset,
          raiseAsset: lbeV2Parameters.raiseAsset,
          amount: 0n,
          penaltyAmount: 0n,
        })
      );
      sellerOutputs.push(txOut);
    }

    const mintValue = new Value()
      .add(warehouse.getFactoryAsset(), 1n)
      .add(warehouse.getTreasuryAsset(), 1n)
      .add(warehouse.getManagerAsset(), 1n)
      .add(warehouse.getSellerAsset(), BigInt(sellerCount));

    const validTo = Math.min(
      Number(lbeV2Parameters.startTime) - 1,
      Date.now() + Duration.newHours(3).milliseconds
    );

    const txb: TxBuilderV2 = new TxBuilderV2(networkEnv);
    txb
      .readFrom(warehouse.getFactoryRefInput())
      .collectFromPlutusContract([factoryUtxo], wrapperFactoryRedeemer)
      .payTo(factoryHeadOutput)
      .payTo(factoryTailOutput)
      .payTo(treasuryOutput)
      .payTo(managerOutput)
      .payTo(...sellerOutputs)
      .mintAssets(mintValue, factoryRedeemer)
      .validToUnixTime(validTo)
      .addMessageMetadata("msg", [MetadataMessage.LBE_V2_CREATE_EVENT])
      .addMessageMetadata("extraData", projectDetails ?? []);

    if (Maybe.isJust(treasuryDatum.owner.toPubKeyHash())) {
      txb.addSigner(treasuryDatum.owner);
    }

    if (sponsorship) {
      const sellerFees = new Value();
      for (let i = 0; i < sellerCount; i++) {
        sellerFees.add(ADA, warehouse.getDefaultSellerValue().get(ADA));
      }
      const sResult = Sponsorship.validate({
        sponsorship,
        requiredValue: sellerFees,
      });
      if (sResult.type === "ok") {
        txb.collectFromPubKey(...sponsorship.utxos);
        txb.payTo(...sponsorship.changeOutputs);
      } else {
        throw sResult.error;
      }
    }

    return txb;
  }
}
