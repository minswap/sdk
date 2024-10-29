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
import { RedeemerWrapper } from "./types/common";
import { FactoryV2 } from "./types/factory";
import { LbeV2Types } from "./types/lbe-v2";
import { NetworkEnvironment, NetworkId } from "./types/network";
import { lucidToNetworkEnv } from "./utils/network.internal";
import { buildUtxoToStoreDatum } from "./utils/tx.internal";

export type LbeV2CreateEventOptions = {
  factoryUtxo: UTxO;
  lbeV2Parameters: LbeV2Types.LbeV2Parameters;
  currentSlot: number;
  sellerOwner: Address;
  sellerCount?: number;
  projectDetails?: string[];
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
  networkEnv: NetworkEnvironment;
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

const THREE_HOUR_IN_MS = 3 * 60 * 60 * 1000;

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

  // MARK: CREATE EVENT
  private validateCreateEvent(options: LbeV2CreateEventOptions): void {
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

  async createTreasury(options: LbeV2CreateEventOptions): Promise<TxComplete> {
    this.validateCreateEvent(options);
    const { lbeV2Parameters, factoryUtxo, projectDetails, currentSlot } =
      options;
    const sellerCount: number =
      options.sellerCount ?? Number(LbeV2Constant.DEFAULT_SELLER_COUNT);
    const config = LbeV2Constant.CONFIG[this.networkId];
    const deployed = LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId];

    const datum = factoryUtxo.datum;
    invariant(datum, "Factory utxo must have inline datum");
    const factory = LbeV2Types.FactoryDatum.fromPlutusData(Data.from(datum));
    const { baseAsset, raiseAsset, owner } = lbeV2Parameters;
    const lbeV2Id = PoolV2.computeLPAssetName(baseAsset, raiseAsset);

    const treasuryDatum: LbeV2Types.TreasuryDatum =
      LbeV2Types.LbeV2Parameters.toLbeV2TreasuryDatum(
        this.networkId,
        lbeV2Parameters
      );

    const lucidTx = this.lucid.newTx();

    // READ FROM
    const factoryRefs = await this.lucid.utxosByOutRef([deployed.factory]);
    invariant(
      factoryRefs.length === 1,
      "cannot find deployed script for LbeV2 Factory"
    );
    lucidTx.readFrom(factoryRefs);

    // SPENT
    const redeemer: LbeV2Types.FactoryRedeemer = {
      type: LbeV2Types.FactoryRedeemerType.CREATE_TREASURY,
      baseAsset: baseAsset,
      raiseAsset: raiseAsset,
    };
    lucidTx.collectFrom(
      [factoryUtxo],
      Data.to(
        RedeemerWrapper.toPlutusData(
          LbeV2Types.FactoryRedeemer.toPlutusData(redeemer)
        )
      )
    );

    // MINT
    const mintAssets: Assets = {};
    mintAssets[config.factoryAsset] = 1n;
    mintAssets[config.treasuryAsset] = 1n;
    mintAssets[config.managerAsset] = 1n;
    mintAssets[config.sellerAsset] = BigInt(sellerCount);
    lucidTx.mintAssets(
      mintAssets,
      Data.to(LbeV2Types.FactoryRedeemer.toPlutusData(redeemer))
    );

    // VALID TIME RANGE
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);
    lucidTx
      .validFrom(currentTime)
      .validTo(
        Math.min(
          Number(lbeV2Parameters.startTime) - 1,
          currentTime + THREE_HOUR_IN_MS
        )
      );

    // PAY TO
    lucidTx
      .payToContract(
        config.factoryAddress,
        {
          inline: Data.to(
            LbeV2Types.FactoryDatum.toPlutusData({
              head: factory.head,
              tail: lbeV2Id,
            })
          ),
        },
        {
          [config.factoryAsset]: 1n,
        }
      )
      .payToContract(
        config.factoryAddress,
        {
          inline: Data.to(
            LbeV2Types.FactoryDatum.toPlutusData({
              head: lbeV2Id,
              tail: factory.tail,
            })
          ),
        },
        {
          [config.factoryAsset]: 1n,
        }
      )
      .payToContract(
        config.treasuryAddress,
        {
          inline: Data.to(LbeV2Types.TreasuryDatum.toPlutusData(treasuryDatum)),
        },
        {
          [config.treasuryAsset]: 1n,
          lovelace:
            LbeV2Constant.TREASURY_MIN_ADA +
            LbeV2Constant.CREATE_POOL_COMMISSION,
          [Asset.toString(baseAsset)]: lbeV2Parameters.reserveBase,
        }
      )
      .payToContract(
        config.managerAddress,
        {
          inline: Data.to(
            LbeV2Types.ManagerDatum.toPlutusData({
              factoryPolicyId: config.factoryHash,
              baseAsset: baseAsset,
              raiseAsset: raiseAsset,
              sellerCount: BigInt(sellerCount),
              reserveRaise: 0n,
              totalPenalty: 0n,
            })
          ),
        },
        {
          [config.managerAsset]: 1n,
          lovelace: LbeV2Constant.MANAGER_MIN_ADA,
        }
      );
    for (let i = 0; i < sellerCount; ++i) {
      lucidTx.payToContract(
        config.sellerAddress,
        {
          inline: Data.to(
            LbeV2Types.SellerDatum.toPlutusData({
              factoryPolicyId: config.factoryHash,
              owner: owner,
              baseAsset: baseAsset,
              raiseAsset: raiseAsset,
              amount: 0n,
              penaltyAmount: 0n,
            })
          ),
        },
        {
          [config.sellerAsset]: 1n,
          lovelace: LbeV2Constant.SELLER_MIN_ADA,
        }
      );
    }

    // SIGN by OWNER
    const ownerPaymentCredential =
      this.lucid.utils.getAddressDetails(owner).paymentCredential;
    invariant(
      ownerPaymentCredential && ownerPaymentCredential?.type === "Key",
      "owner payment credential must be public key"
    );
    lucidTx.addSigner(owner);

    // METADATA / EXTRA METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.CREATE_EVENT],
      extraData: projectDetails ?? [],
    });
    return lucidTx.complete();
  }

  // MARK: CANCEL EVENT
  validateCancelEvent(options: LbeV2CancelEventOptions): void {
    const { treasuryUtxo, cancelData, currentSlot } = options;
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);
    const datum = treasuryUtxo.datum;
    invariant(datum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      Data.from(datum)
    );
    const {
      revocable,
      baseAsset,
      raiseAsset,
      endTime,
      startTime,
      totalLiquidity,
      minimumRaise,
      isManagerCollected,
      totalPenalty,
      reserveRaise,
      owner,
      isCancelled,
    } = treasuryDatum;
    const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
    invariant(isCancelled, "Event already cancelled");
    switch (cancelData.reason) {
      case LbeV2Types.CancelReason.BY_OWNER: {
        invariant(
          owner === cancelData.owner,
          "validateCancelEvent: Invalid project owner"
        );
        if (revocable) {
          invariant(
            BigInt(currentTime) < endTime,
            "Cancel before discovery phase end"
          );
        } else {
          invariant(
            BigInt(currentTime) < startTime,
            "Cancel before discovery phase start"
          );
        }
        break;
      }
      case LbeV2Types.CancelReason.CREATED_POOL: {
        const ammPoolUtxo = cancelData.ammPoolUtxo;
        invariant(ammPoolUtxo.datum, "ammFactory utxo must have inline datum");
        const ammPool = PoolV2.Datum.fromPlutusData(
          Data.from(ammPoolUtxo.datum)
        );
        invariant(
          lbeId === PoolV2.computeLPAssetName(ammPool.assetA, ammPool.assetB),
          "treasury and Amm Pool must share the same lbe id"
        );
        invariant(totalLiquidity === 0n, "LBE has created pool");
        break;
      }
      case LbeV2Types.CancelReason.NOT_REACH_MINIMUM: {
        if (minimumRaise && isManagerCollected) {
          invariant(
            reserveRaise + totalPenalty < minimumRaise,
            "Not pass minimum raise"
          );
        }
        break;
      }
    }
  }

  async cancelEvent(options: LbeV2CancelEventOptions): Promise<TxComplete> {
    this.validateCancelEvent(options);
    const { treasuryUtxo, cancelData, currentSlot } = options;
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const datum = treasuryUtxo.datum;
    invariant(datum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      Data.from(datum)
    );
    const { revocable, startTime, endTime, owner } = treasuryDatum;

    const lucidTx = this.lucid.newTx();
    // READ FROM
    const treasuryRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].treasury,
    ]);
    invariant(
      treasuryRefs.length === 1,
      "cannot find deployed script for LbeV2 Factory"
    );
    lucidTx.readFrom(treasuryRefs);

    // COLLECT FROM
    const treasuryRedeemer = {
      type: LbeV2Types.TreasuryRedeemerType.CANCEL_LBE,
      reason: cancelData.reason,
    };
    lucidTx.collectFrom(
      [treasuryUtxo],
      Data.to(LbeV2Types.TreasuryRedeemer.toPlutusData(treasuryRedeemer))
    );

    // PAY TO
    const newTreasuryDatum: LbeV2Types.TreasuryDatum = {
      ...treasuryDatum,
      isCancelled: true,
    };
    lucidTx.payToContract(
      config.treasuryAddress,
      {
        inline: Data.to(
          LbeV2Types.TreasuryDatum.toPlutusData(newTreasuryDatum)
        ),
      },
      treasuryUtxo.assets
    );

    // CONDITION DEPEND ON REASON
    let validTo = currentTime + THREE_HOUR_IN_MS;
    switch (cancelData.reason) {
      case LbeV2Types.CancelReason.BY_OWNER: {
        validTo = Math.min(
          validTo,
          Number(revocable ? endTime : startTime) - 1000
        );
        lucidTx.addSigner(owner).attachMetadata(674, {
          msg: [MetadataMessage.CANCEL_EVENT_BY_OWNER],
        });
        break;
      }
      case LbeV2Types.CancelReason.CREATED_POOL: {
        lucidTx.readFrom([cancelData.ammPoolUtxo]).attachMetadata(674, {
          msg: [MetadataMessage.CANCEL_EVENT_BY_WORKER],
        });
        break;
      }
      case LbeV2Types.CancelReason.NOT_REACH_MINIMUM: {
        lucidTx.attachMetadata(674, {
          msg: [MetadataMessage.CANCEL_EVENT_BY_WORKER],
        });
        break;
      }
    }

    lucidTx.validTo(validTo);
    return lucidTx.complete();
  }

  // MARK: DEPOSIT OR WITHDRAW ORDER
  validateDepositOrWithdrawOrder(options: LbeV2DepositOrWithdrawOptions): void {
    const {
      treasuryUtxo,
      sellerUtxo,
      existingOrderUtxos: orderUtxos,
      currentSlot,
      action,
    } = options;
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      Data.from(rawTreasuryDatum)
    );

    const rawSellerDatum = sellerUtxo.datum;
    invariant(rawSellerDatum, "Seller utxo must have inline datum");
    const sellerDatum = LbeV2Types.SellerDatum.fromPlutusData(
      Data.from(rawSellerDatum),
      this.networkId
    );

    const orderDatums = orderUtxos.map((utxo) => {
      const rawOrderDatum = utxo.datum;
      invariant(rawOrderDatum, "Factory utxo must have inline datum");
      return LbeV2Types.OrderDatum.fromPlutusData(
        Data.from(rawOrderDatum),
        this.networkId
      );
    });

    invariant(
      PoolV2.computeLPAssetName(
        treasuryDatum.baseAsset,
        treasuryDatum.raiseAsset
      ) ===
        PoolV2.computeLPAssetName(
          sellerDatum.baseAsset,
          sellerDatum.raiseAsset
        ),
      "treasury, seller must share the same lbe id"
    );
    let currentAmount = 0n;
    for (const orderDatum of orderDatums) {
      invariant(
        PoolV2.computeLPAssetName(
          treasuryDatum.baseAsset,
          treasuryDatum.raiseAsset
        ) ===
          PoolV2.computeLPAssetName(
            orderDatum.baseAsset,
            orderDatum.raiseAsset
          ),
        "treasury, order must share the same lbe id"
      );

      const ownerPaymentCredential = this.lucid.utils.getAddressDetails(
        orderDatum.owner
      ).paymentCredential;
      invariant(
        ownerPaymentCredential && ownerPaymentCredential.type === "Key",
        "Order owner must be pubkey hash"
      );
      currentAmount += orderDatum.amount;
    }
    invariant(treasuryDatum.isCancelled === false, "lbe has cancelled");
    let newAmount: bigint;
    if (action.type === "deposit") {
      newAmount = currentAmount + action.additionalAmount;
    } else {
      invariant(
        currentAmount <= action.withdrawalAmount,
        `Exceed the maximum withdrawal, withdrawal: ${action.withdrawalAmount}, available: ${currentAmount}`
      );
      newAmount = currentAmount - action.withdrawalAmount;
    }
    invariant(
      treasuryDatum.startTime <= currentTime,
      `The event hasn't really started yet, please wait a little longer.`
    );
    invariant(
      currentTime <= treasuryDatum.endTime,
      "The event has been ended!"
    );
    const minimumRaise = treasuryDatum.minimumOrderRaise;
    if (minimumRaise !== undefined) {
      invariant(
        newAmount === 0n || newAmount >= minimumRaise,
        "Using Seller Tx: Order must higher than min raise"
      );
    }
  }

  calculatePenaltyAmount(options: {
    time: bigint;
    totalInputAmount: bigint;
    totalOutputAmount: bigint;
    penaltyConfig?: LbeV2Types.PenaltyConfig;
  }): bigint {
    const { penaltyConfig, time, totalInputAmount, totalOutputAmount } =
      options;
    if (penaltyConfig !== undefined) {
      const { penaltyStartTime, percent } = penaltyConfig;
      if (time < penaltyStartTime) {
        return 0n;
      }
      if (totalInputAmount > totalOutputAmount) {
        const withdrawAmount = totalInputAmount - totalOutputAmount;
        // calculate totalInputAmount
        return (withdrawAmount * percent) / 100n;
      }
      return 0n;
    }
    return 0n;
  }

  async depositOrWithdrawOrder(
    options: LbeV2DepositOrWithdrawOptions
  ): Promise<TxComplete> {
    this.validateDepositOrWithdrawOrder(options);
    const {
      treasuryUtxo,
      sellerUtxo,
      existingOrderUtxos: orderUtxos,
      currentSlot,
      owner,
      action,
    } = options;
    const config = LbeV2Constant.CONFIG[this.networkId];

    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      Data.from(rawTreasuryDatum)
    );

    const rawSellerDatum = sellerUtxo.datum;
    invariant(rawSellerDatum, "Seller utxo must have inline datum");
    const sellerDatum = LbeV2Types.SellerDatum.fromPlutusData(
      Data.from(rawSellerDatum),
      this.networkId
    );

    const orderDatums = orderUtxos.map((utxo) => {
      const rawOrderDatum = utxo.datum;
      invariant(rawOrderDatum, "Factory utxo must have inline datum");
      return LbeV2Types.OrderDatum.fromPlutusData(
        Data.from(rawOrderDatum),
        this.networkId
      );
    });

    let currentAmount = 0n;
    let totalInputPenalty = 0n;
    for (const orderDatum of orderDatums) {
      currentAmount += orderDatum.amount;
      totalInputPenalty += orderDatum.penaltyAmount;
    }
    let newAmount: bigint;
    if (action.type === "deposit") {
      newAmount = currentAmount + action.additionalAmount;
    } else {
      newAmount = currentAmount - action.withdrawalAmount;
    }

    const validTo = Math.min(
      Number(treasuryDatum.endTime),
      currentTime + THREE_HOUR_IN_MS
    );
    const txPenaltyAmount = this.calculatePenaltyAmount({
      penaltyConfig: treasuryDatum.penaltyConfig,
      time: BigInt(validTo),
      totalInputAmount: currentAmount,
      totalOutputAmount: newAmount,
    });

    const lucidTx = this.lucid.newTx();

    // READ FROM
    const sellerRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].seller,
    ]);
    invariant(
      sellerRefs.length === 1,
      "cannot find deployed script for LbeV2 Seller"
    );
    lucidTx.readFrom(sellerRefs).readFrom([treasuryUtxo]);

    if (orderUtxos.length !== 0) {
      const orderRefs = await this.lucid.utxosByOutRef([
        LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].order,
      ]);
      invariant(
        orderRefs.length === 1,
        "cannot find deployed script for LbeV2 Order"
      );
      lucidTx.readFrom(orderRefs);
    }

    // COLLECT FROM
    lucidTx.collectFrom(
      [sellerUtxo],
      Data.to(
        LbeV2Types.SellerRedeemer.toPlutusData(
          LbeV2Types.SellerRedeemer.USING_SELLER
        )
      )
    );
    lucidTx.collectFrom(
      orderUtxos,
      Data.to(
        LbeV2Types.OrderRedeemer.toPlutusData(
          LbeV2Types.OrderRedeemer.UPDATE_ORDER
        )
      )
    );

    // ADD SIGNER
    for (const orderDatum of orderDatums) {
      lucidTx.addSigner(orderDatum.owner);
    }

    // MINT
    let orderTokenMintAmount = 0n;
    if (newAmount !== 0n || totalInputPenalty + txPenaltyAmount !== 0n) {
      orderTokenMintAmount += 1n;
    }
    if (orderUtxos.length > 0) {
      orderTokenMintAmount -= BigInt(orderUtxos.length);
    }
    if (orderTokenMintAmount !== 0n) {
      const factoryRefs = await this.lucid.utxosByOutRef([
        LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].factory,
      ]);
      invariant(
        factoryRefs.length === 1,
        "cannot find deployed script for LbeV2 Factory"
      );
      lucidTx
        .readFrom(factoryRefs)
        .mintAssets({ [config.orderAsset]: orderTokenMintAmount });
    }

    // PAY TO
    const newSellerDatum = {
      ...sellerDatum,
      amount: sellerDatum.amount + newAmount - currentAmount,
      penaltyAmount: sellerDatum.penaltyAmount + txPenaltyAmount,
    };
    lucidTx.payToContract(
      config.sellerAddress,
      { inline: Data.to(LbeV2Types.SellerDatum.toPlutusData(newSellerDatum)) },
      sellerUtxo.assets
    );

    const newPenaltyAmount = totalInputPenalty + txPenaltyAmount;
    if (newAmount + newPenaltyAmount > 0n) {
      const newOrderDatum: LbeV2Types.OrderDatum = {
        factoryPolicyId: config.factoryHash,
        baseAsset: treasuryDatum.baseAsset,
        raiseAsset: treasuryDatum.raiseAsset,
        owner: owner,
        amount: newAmount,
        isCollected: false,
        penaltyAmount: newPenaltyAmount,
      };
      const orderAssets: Assets = {
        lovelace:
          LbeV2Constant.ORDER_MIN_ADA + LbeV2Constant.ORDER_COMMISSION * 2n,
        [config.orderAsset]: 1n,
      };
      const raiseAsset = Asset.toString(treasuryDatum.raiseAsset);
      if (raiseAsset in orderAssets) {
        orderAssets[raiseAsset] += newAmount + newPenaltyAmount;
      } else {
        orderAssets[raiseAsset] = newAmount + newPenaltyAmount;
      }
      lucidTx.payToContract(
        config.orderAddress,
        { inline: Data.to(LbeV2Types.OrderDatum.toPlutusData(newOrderDatum)) },
        orderAssets
      );
    }

    // VALID TIME
    lucidTx.validFrom(currentTime).validTo(validTo);

    // METADATA
    if (action.type === "deposit") {
      lucidTx.attachMetadata(674, {
        msg: [MetadataMessage.LBE_V2_DEPOSIT_ORDER_EVENT],
      });
    } else {
      lucidTx.attachMetadata(674, {
        msg: [MetadataMessage.LBE_V2_WITHDRAW_ORDER_EVENT],
      });
    }

    return lucidTx.complete();
  }

  // MARK: CLOSE EVENT
  validateCloseEvent(options: CloseEventOptions): void {
    const { treasuryUtxo, headFactoryUtxo, tailFactoryUtxo, owner } = options;
    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      Data.from(rawTreasuryDatum)
    );
    const lbeId = PoolV2.computeLPAssetName(
      treasuryDatum.baseAsset,
      treasuryDatum.raiseAsset
    );

    const rawHeadFactoryDatum = headFactoryUtxo.datum;
    invariant(rawHeadFactoryDatum, "Treasury utxo must have inline datum");
    const headFactoryDatum = LbeV2Types.FactoryDatum.fromPlutusData(
      Data.from(rawHeadFactoryDatum)
    );

    const rawTailFactoryDatum = tailFactoryUtxo.datum;
    invariant(rawTailFactoryDatum, "Treasury utxo must have inline datum");
    const tailFactoryDatum = LbeV2Types.FactoryDatum.fromPlutusData(
      Data.from(rawTailFactoryDatum)
    );

    invariant(headFactoryDatum.tail === lbeId, "Head Factory is invalid");
    invariant(tailFactoryDatum.head === lbeId, "Tail Factory is invalid");

    invariant(treasuryDatum.isCancelled === true, "lbe must be cancelled");
    invariant(treasuryDatum.owner === owner, "Only Owner can close");
    invariant(treasuryDatum.isManagerCollected, "Manager must be collected");
    invariant(
      treasuryDatum.totalPenalty === 0n && treasuryDatum.reserveRaise === 0n,
      "All Orders have been refunded"
    );
  }

  async closeEventTx(options: CloseEventOptions): Promise<TxComplete> {
    this.validateCloseEvent(options);
    const { treasuryUtxo, headFactoryUtxo, tailFactoryUtxo, currentSlot } =
      options;
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      Data.from(rawTreasuryDatum)
    );

    const rawHeadFactoryDatum = headFactoryUtxo.datum;
    invariant(rawHeadFactoryDatum, "Treasury utxo must have inline datum");
    const headFactoryDatum = LbeV2Types.FactoryDatum.fromPlutusData(
      Data.from(rawHeadFactoryDatum)
    );

    const rawTailFactoryDatum = tailFactoryUtxo.datum;
    invariant(rawTailFactoryDatum, "Treasury utxo must have inline datum");
    const tailFactoryDatum = LbeV2Types.FactoryDatum.fromPlutusData(
      Data.from(rawTailFactoryDatum)
    );

    const lucidTx = this.lucid.newTx();

    // READ FROM
    const factoryRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].factory,
    ]);
    invariant(
      factoryRefs.length === 1,
      "cannot find deployed script for LbeV2 Factory"
    );
    lucidTx.readFrom(factoryRefs);

    const treasuryRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].treasury,
    ]);
    invariant(
      treasuryRefs.length === 1,
      "cannot find deployed script for LbeV2 Treasury"
    );
    lucidTx.readFrom(treasuryRefs);

    // COLLECT FROM
    lucidTx
      .collectFrom(
        [treasuryUtxo],
        Data.to(
          LbeV2Types.TreasuryRedeemer.toPlutusData({
            type: LbeV2Types.TreasuryRedeemerType.CLOSE_EVENT,
          })
        )
      )
      .collectFrom(
        [headFactoryUtxo, tailFactoryUtxo],
        Data.to(
          RedeemerWrapper.toPlutusData(
            LbeV2Types.FactoryRedeemer.toPlutusData({
              type: LbeV2Types.FactoryRedeemerType.CLOSE_TREASURY,
              baseAsset: treasuryDatum.baseAsset,
              raiseAsset: treasuryDatum.raiseAsset,
            })
          )
        )
      );

    // MINT
    lucidTx.mintAssets(
      {
        [config.factoryAsset]: -1n,
        [config.treasuryAsset]: -1n,
      },
      Data.to(
        LbeV2Types.FactoryRedeemer.toPlutusData({
          type: LbeV2Types.FactoryRedeemerType.CLOSE_TREASURY,
          baseAsset: treasuryDatum.baseAsset,
          raiseAsset: treasuryDatum.raiseAsset,
        })
      )
    );

    // PAY TO
    lucidTx.payToContract(
      config.factoryAddress,
      {
        inline: Data.to(
          LbeV2Types.FactoryDatum.toPlutusData({
            head: headFactoryDatum.head,
            tail: tailFactoryDatum.tail,
          })
        ),
      },
      {
        [config.factoryAsset]: 1n,
      }
    );

    // ADD SIGNER
    lucidTx.addSigner(treasuryDatum.owner);

    // VALID TIME
    lucidTx.validFrom(currentTime).validTo(currentTime + THREE_HOUR_IN_MS);

    // METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.CLOSE_EVENT],
    });

    return await lucidTx.complete();
  }

  // MARK: ADD MORE SELLER
  validateAddSeller(options: AddSellersOptions): void {
    const { addSellerCount, treasuryUtxo, managerUtxo, currentSlot } = options;
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      Data.from(rawTreasuryDatum)
    );

    const rawManagerDatum = managerUtxo.datum;
    invariant(rawManagerDatum, "Treasury utxo must have inline datum");
    const managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
      Data.from(rawManagerDatum)
    );

    invariant(addSellerCount > 0, "Must add at least one seller");
    invariant(
      PoolV2.computeLPAssetName(
        treasuryDatum.baseAsset,
        treasuryDatum.raiseAsset
      ) ===
        PoolV2.computeLPAssetName(
          managerDatum.baseAsset,
          managerDatum.raiseAsset
        ),
      "treasury, manager must have same Lbe ID"
    );
    invariant(
      currentTime < treasuryDatum.endTime,
      "Must add seller before encounter phase"
    );
  }

  async addSellers(options: AddSellersOptions): Promise<TxComplete> {
    this.validateAddSeller(options);
    const {
      treasuryUtxo,
      managerUtxo,
      addSellerCount,
      sellerOwner,
      currentSlot,
    } = options;
    const currentTime = this.lucid.utils.slotToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      Data.from(rawTreasuryDatum)
    );

    const rawManagerDatum = managerUtxo.datum;
    invariant(rawManagerDatum, "Treasury utxo must have inline datum");
    const managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
      Data.from(rawManagerDatum)
    );

    const lucidTx = this.lucid.newTx();

    // READ FROM
    const factoryRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].factory,
    ]);
    invariant(
      factoryRefs.length === 1,
      "cannot find deployed script for LbeV2 Factory"
    );
    lucidTx.readFrom(factoryRefs);

    const managerRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].manager,
    ]);
    invariant(
      managerRefs.length === 1,
      "cannot find deployed script for LbeV2 Manager"
    );
    lucidTx.readFrom(managerRefs);

    lucidTx.readFrom([treasuryUtxo]);

    // COLLECT FROM
    lucidTx.collectFrom(
      [managerUtxo],
      Data.to(
        LbeV2Types.ManagerRedeemer.toPlutusData(
          LbeV2Types.ManagerRedeemer.ADD_SELLERS
        )
      )
    );

    // MINT
    lucidTx.mintAssets(
      { [config.sellerAsset]: BigInt(addSellerCount) },
      Data.to(
        LbeV2Types.FactoryRedeemer.toPlutusData({
          type: LbeV2Types.FactoryRedeemerType.MINT_SELLER,
        })
      )
    );

    // PAY TO
    const newManagerDatum: LbeV2Types.ManagerDatum = {
      ...managerDatum,
      sellerCount: managerDatum.sellerCount + BigInt(addSellerCount),
    };
    lucidTx.payToContract(
      config.managerAddress,
      {
        inline: Data.to(LbeV2Types.ManagerDatum.toPlutusData(newManagerDatum)),
      },
      { ...managerUtxo.assets }
    );
    for (let i = 0; i < addSellerCount; ++i) {
      lucidTx.payToContract(
        config.sellerAddress,
        {
          inline: Data.to(
            LbeV2Types.SellerDatum.toPlutusData({
              factoryPolicyId: config.factoryHash,
              owner: sellerOwner,
              baseAsset: treasuryDatum.baseAsset,
              raiseAsset: treasuryDatum.raiseAsset,
              amount: 0n,
              penaltyAmount: 0n,
            })
          ),
        },
        {
          [config.sellerAsset]: 1n,
          lovelace: LbeV2Constant.SELLER_MIN_ADA,
        }
      );
    }

    // VALID TIME RANGE
    lucidTx
      .validFrom(currentTime)
      .validTo(
        Math.min(
          currentTime + THREE_HOUR_IN_MS,
          Number(treasuryDatum.endTime) - 1000
        )
      );

    // METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.ADD_SELLERS],
    });

    return lucidTx.complete();
  }
}
