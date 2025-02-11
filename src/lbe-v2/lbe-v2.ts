import invariant from "@minswap/tiny-invariant";
import {
  Addresses,
  Assets,
  Constr,
  Lucid,
  Tx,
  TxComplete, Utxo,
} from "@spacebudz/lucid";
import JSONBig from "json-bigint";

import {
  compareUtxo, DataObject,
  DexV2Calculation,
  DexV2Constant,
  LbeV2Constant,
  MetadataMessage,
  PoolV2,
} from "..";
import { Asset } from "../types/asset";
import { RedeemerWrapper } from "../types/common";
import { FactoryV2 } from "../types/factory";
import { LbeV2Types } from "../types/lbe-v2";
import { NetworkEnvironment, NetworkId } from "../types/network";
import { lucidToNetworkEnv } from "../utils/network.internal";
import {
  AddSellersOptions,
  CalculationRedeemAmountParams,
  CloseEventOptions,
  CollectManagerOptions,
  CollectOrdersOptions,
  CountingSellersOptions,
  CreateAmmPoolTxOptions,
  LbeV2CancelEventOptions,
  LbeV2CreateEventOptions,
  LbeV2DepositOrWithdrawOptions,
  LbeV2UpdateEventOptions,
  RedeemOrdersOptions,
  RefundOrdersOptions,
} from "./type";
import {
  validateAddSeller,
  validateCancelEvent,
  validateCloseEvent,
  validateCollectManager,
  validateCollectOrders,
  validateCountingSeller,
  validateCreateAmmPool,
  validateCreateEvent,
  validateDepositOrWithdrawOrder,
  validateRedeemOrders,
  validateRefundOrders,
  validateUpdateEvent,
} from "./validation";

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

  async createEvent(options: LbeV2CreateEventOptions): Promise<TxComplete> {
    validateCreateEvent(options, this.lucid, this.networkId);
    const { lbeV2Parameters, factoryUtxo, projectDetails, currentSlot } =
      options;
    const sellerCount: number =
      options.sellerCount ?? Number(LbeV2Constant.DEFAULT_SELLER_COUNT);
    const config = LbeV2Constant.CONFIG[this.networkId];
    const deployed = LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId];

    const datum = factoryUtxo.datum;
    invariant(datum, "Factory utxo must have inline datum");
    const factory = LbeV2Types.FactoryDatum.fromPlutusData(DataObject.from(datum));
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
      DataObject.to(
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
    lucidTx.mint(
      mintAssets,
      DataObject.to(LbeV2Types.FactoryRedeemer.toPlutusData(redeemer))
    );

    // VALID TIME RANGE
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
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
          Inline: DataObject.to(
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
          Inline: DataObject.to(
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
          Inline: DataObject.to(LbeV2Types.TreasuryDatum.toPlutusData(treasuryDatum)),
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
          Inline: DataObject.to(
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
          Inline: DataObject.to(
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
      Addresses.inspect(owner).payment;
    invariant(
      ownerPaymentCredential && ownerPaymentCredential?.type === "Key",
      "owner payment credential must be public key"
    );
    lucidTx.addSigner(Addresses.addressToCredential(owner).hash);

    // METADATA / EXTRA METADATA
    const extraData: string[] | null =
      JSONBig.stringify(projectDetails).match(/.{1,64}/g);
    invariant(extraData, "cannot parse LbeV2 Project Details");
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.CREATE_EVENT],
      extraData: extraData ?? [],
    });
    return lucidTx.commit();
  }

  async updateEvent(options: LbeV2UpdateEventOptions): Promise<TxComplete> {
    validateUpdateEvent(options, this.lucid, this.networkId);

    const {
      owner,
      treasuryUtxo,
      lbeV2Parameters,
      currentSlot,
      projectDetails,
    } = options;
    const config = LbeV2Constant.CONFIG[this.networkId];
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);

    const datum = treasuryUtxo.datum;
    invariant(datum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(datum)
    );

    const newTreasuryDatum: LbeV2Types.TreasuryDatum =
      LbeV2Types.LbeV2Parameters.toLbeV2TreasuryDatum(
        this.networkId,
        lbeV2Parameters
      );
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
    lucidTx.collectFrom(
      [treasuryUtxo],
      DataObject.to(
        LbeV2Types.TreasuryRedeemer.toPlutusData({
          type: LbeV2Types.TreasuryRedeemerType.UPDATE_LBE,
        })
      )
    );

    // PAY TO
    lucidTx.payToContract(
      config.treasuryAddress,
      {
        Inline: DataObject.to(
          LbeV2Types.TreasuryDatum.toPlutusData(newTreasuryDatum)
        ),
      },
      {
        [config.treasuryAsset]: 1n,
        lovelace:
          LbeV2Constant.TREASURY_MIN_ADA + LbeV2Constant.CREATE_POOL_COMMISSION,
        [Asset.toString(newTreasuryDatum.baseAsset)]:
          lbeV2Parameters.reserveBase,
      }
    );

    // SIGNER
    lucidTx.addSigner(Addresses.addressToCredential(owner).hash);

    // TIME RANGE
    lucidTx
      .validFrom(currentTime)
      .validTo(
        Math.min(
          Number(treasuryDatum.startTime) - 1000,
          Number(lbeV2Parameters.startTime) - 1000,
          currentTime + THREE_HOUR_IN_MS
        )
      );

    // METADATA
    const extraData: string[] | null =
      projectDetails !== undefined
        ? JSONBig.stringify(projectDetails).match(/.{1,64}/g)
        : null;
    invariant(extraData, "cannot parse LbeV2 Project Details");
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.UPDATE_EVENT],
      extraData: extraData ?? [],
    });

    return await lucidTx.commit();
  }

  async cancelEvent(options: LbeV2CancelEventOptions): Promise<TxComplete> {
    validateCancelEvent(options, this.lucid, this.networkId);
    const { treasuryUtxo, cancelData, currentSlot } = options;
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const datum = treasuryUtxo.datum;
    invariant(datum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(datum)
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
      DataObject.to(LbeV2Types.TreasuryRedeemer.toPlutusData(treasuryRedeemer))
    );

    // PAY TO
    const newTreasuryDatum: LbeV2Types.TreasuryDatum = {
      ...treasuryDatum,
      isCancelled: true,
    };
    lucidTx.payToContract(
      config.treasuryAddress,
      {
        Inline: DataObject.to(
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
        lucidTx.addSigner(Addresses.addressToCredential(owner).hash).attachMetadata(674, {
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
    return lucidTx.commit();
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
    validateDepositOrWithdrawOrder(options, this.lucid, this.networkId);
    const {
      treasuryUtxo,
      sellerUtxo,
      existingOrderUtxos: orderUtxos,
      currentSlot,
      owner,
      action,
    } = options;
    const config = LbeV2Constant.CONFIG[this.networkId];

    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
    );

    const rawSellerDatum = sellerUtxo.datum;
    invariant(rawSellerDatum, "Seller utxo must have inline datum");
    const sellerDatum = LbeV2Types.SellerDatum.fromPlutusData(
      DataObject.from(rawSellerDatum),
      this.networkId
    );

    const orderDatums = orderUtxos.map((utxo) => {
      const rawOrderDatum = utxo.datum;
      invariant(rawOrderDatum, "Factory utxo must have inline datum");
      return LbeV2Types.OrderDatum.fromPlutusData(
        DataObject.from(rawOrderDatum),
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
    const newPenaltyAmount = totalInputPenalty + txPenaltyAmount;

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
      DataObject.to(
        LbeV2Types.SellerRedeemer.toPlutusData(
          LbeV2Types.SellerRedeemer.USING_SELLER
        )
      )
    );
    lucidTx.collectFrom(
      orderUtxos,
      DataObject.to(
        LbeV2Types.OrderRedeemer.toPlutusData(
          LbeV2Types.OrderRedeemer.UPDATE_ORDER
        )
      )
    );

    // ADD SIGNER
    for (const orderDatum of orderDatums) {
      lucidTx.addSigner(Addresses.addressToCredential(orderDatum.owner).hash);
    }

    // MINT
    let orderTokenMintAmount = 0n;
    if (newAmount + newPenaltyAmount > 0n) {
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
      lucidTx.readFrom(factoryRefs).mint(
        { [config.orderAsset]: orderTokenMintAmount },
        DataObject.to(
          LbeV2Types.FactoryRedeemer.toPlutusData({
            type: LbeV2Types.FactoryRedeemerType.MINT_ORDER,
          })
        )
      );
    }

    // PAY TO
    const newSellerDatum = {
      ...sellerDatum,
      amount: sellerDatum.amount + newAmount - currentAmount,
      penaltyAmount: sellerDatum.penaltyAmount + txPenaltyAmount,
    };

    const newSellerAssets: Assets = {
      ...sellerUtxo.assets,
    };
    if (orderUtxos.length === 0 && newAmount > 0n) {
      newSellerAssets.lovelace =
        newSellerAssets.lovelace + LbeV2Constant.SELLER_COMMISSION;
    }
    lucidTx.payToContract(
      config.sellerAddress,
      { Inline: DataObject.to(LbeV2Types.SellerDatum.toPlutusData(newSellerDatum)) },
      newSellerAssets
    );

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
      console.log(orderAssets);
      lucidTx.payToContract(
        config.orderAddress,
        { Inline: DataObject.to(LbeV2Types.OrderDatum.toPlutusData(newOrderDatum)) },
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

    return lucidTx.commit();
  }

  async closeEventTx(options: CloseEventOptions): Promise<TxComplete> {
    validateCloseEvent(options, this.networkId);
    const { treasuryUtxo, headFactoryUtxo, tailFactoryUtxo, currentSlot } =
      options;
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
    );

    const rawHeadFactoryDatum = headFactoryUtxo.datum;
    invariant(rawHeadFactoryDatum, "Treasury utxo must have inline datum");
    const headFactoryDatum = LbeV2Types.FactoryDatum.fromPlutusData(
      DataObject.from(rawHeadFactoryDatum)
    );

    const rawTailFactoryDatum = tailFactoryUtxo.datum;
    invariant(rawTailFactoryDatum, "Treasury utxo must have inline datum");
    const tailFactoryDatum = LbeV2Types.FactoryDatum.fromPlutusData(
      DataObject.from(rawTailFactoryDatum)
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
        DataObject.to(
          LbeV2Types.TreasuryRedeemer.toPlutusData({
            type: LbeV2Types.TreasuryRedeemerType.CLOSE_EVENT,
          })
        )
      )
      .collectFrom(
        [headFactoryUtxo, tailFactoryUtxo],
        DataObject.to(
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
    lucidTx.mint(
      {
        [config.factoryAsset]: -1n,
        [config.treasuryAsset]: -1n,
      },
      DataObject.to(
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
        Inline: DataObject.to(
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
    lucidTx.addSigner(Addresses.addressToCredential(treasuryDatum.owner).hash);

    // VALID TIME
    lucidTx.validFrom(currentTime).validTo(currentTime + THREE_HOUR_IN_MS);

    // METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.CLOSE_EVENT],
    });

    return await lucidTx.commit();
  }

  async addSellers(options: AddSellersOptions): Promise<TxComplete> {
    validateAddSeller(options, this.lucid, this.networkId);
    const {
      treasuryUtxo,
      managerUtxo,
      addSellerCount,
      sellerOwner,
      currentSlot,
    } = options;
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
    );

    const rawManagerDatum = managerUtxo.datum;
    invariant(rawManagerDatum, "Treasury utxo must have inline datum");
    const managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
      DataObject.from(rawManagerDatum)
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
      DataObject.to(
        LbeV2Types.ManagerRedeemer.toPlutusData(
          LbeV2Types.ManagerRedeemer.ADD_SELLERS
        )
      )
    );

    // MINT
    lucidTx.mint(
      { [config.sellerAsset]: BigInt(addSellerCount) },
      DataObject.to(
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
        Inline: DataObject.to(LbeV2Types.ManagerDatum.toPlutusData(newManagerDatum)),
      },
      { ...managerUtxo.assets }
    );
    for (let i = 0; i < addSellerCount; ++i) {
      lucidTx.payToContract(
        config.sellerAddress,
        {
          Inline: DataObject.to(
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
      msg: [MetadataMessage.LBE_V2_ADD_SELLERS],
    });

    return lucidTx.commit();
  }

  async countingSellers(options: CountingSellersOptions): Promise<TxComplete> {
    validateCountingSeller(options, this.lucid, this.networkId);
    const { treasuryUtxo, managerUtxo, sellerUtxos, currentSlot } = options;
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawManagerDatum = managerUtxo.datum;
    invariant(rawManagerDatum, "Treasury utxo must have inline datum");
    const managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
      DataObject.from(rawManagerDatum)
    );
    const sortedSellerUtxos = [...sellerUtxos].sort(compareUtxo);

    const sellerDatums = sortedSellerUtxos.map((utxo) => {
      const rawSellerDatum = utxo.datum;
      invariant(rawSellerDatum, "Seller utxo must have inline datum");
      const sellerDatum = LbeV2Types.SellerDatum.fromPlutusData(
        DataObject.from(rawSellerDatum),
        this.networkId
      );
      return sellerDatum;
    });

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

    const sellerRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].seller,
    ]);
    invariant(
      sellerRefs.length === 1,
      "cannot find deployed script for LbeV2 Seller"
    );
    lucidTx.readFrom(sellerRefs);

    lucidTx.readFrom([treasuryUtxo]);

    // COLLECT FROM
    lucidTx.collectFrom(
      [managerUtxo],
      DataObject.to(
        LbeV2Types.ManagerRedeemer.toPlutusData(
          LbeV2Types.ManagerRedeemer.COLLECT_SELLERS
        )
      )
    );
    lucidTx.collectFrom(
      sellerUtxos,
      DataObject.to(
        LbeV2Types.SellerRedeemer.toPlutusData(
          LbeV2Types.SellerRedeemer.COUNTING_SELLERS
        )
      )
    );

    // MINT
    lucidTx.mint(
      { [config.sellerAsset]: -BigInt(sellerUtxos.length) },
      DataObject.to(
        LbeV2Types.FactoryRedeemer.toPlutusData({
          type: LbeV2Types.FactoryRedeemerType.BURN_SELLER,
        })
      )
    );

    // PAY TO
    let totalReserveRaise = 0n;
    let totalPenalty = 0n;

    for (const sellerDatum of sellerDatums) {
      totalReserveRaise += sellerDatum.amount;
      totalPenalty += sellerDatum.penaltyAmount;
    }
    const newManagerDatum: LbeV2Types.ManagerDatum = {
      ...managerDatum,
      reserveRaise: managerDatum.reserveRaise + totalReserveRaise,
      totalPenalty: managerDatum.totalPenalty + totalPenalty,
      sellerCount: managerDatum.sellerCount - BigInt(sellerUtxos.length),
    };
    lucidTx.payToContract(
      config.managerAddress,
      {
        Inline: DataObject.to(LbeV2Types.ManagerDatum.toPlutusData(newManagerDatum)),
      },
      { ...managerUtxo.assets }
    );
    for (let i = 0; i < sellerDatums.length; ++i) {
      const sellerDatum = sellerDatums[i];
      const sellerUtxo = sortedSellerUtxos[i];
      lucidTx.payTo(sellerDatum.owner, {
        lovelace:
          sellerUtxo.assets["lovelace"] -
          LbeV2Constant.COLLECT_SELLER_COMMISSION,
      });
    }

    // VALID TIME RANGE
    lucidTx.validFrom(currentTime).validTo(currentTime + THREE_HOUR_IN_MS);

    // METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.LBE_V2_COUNTING_SELLERS],
    });

    return lucidTx.commit();
  }

  async collectManager(options: CollectManagerOptions): Promise<TxComplete> {
    validateCollectManager(options, this.lucid, this.networkId);
    const { treasuryUtxo, managerUtxo, currentSlot } = options;
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawManagerDatum = managerUtxo.datum;
    invariant(rawManagerDatum, "Treasury utxo must have inline datum");
    const managerDatum = LbeV2Types.ManagerDatum.fromPlutusData(
      DataObject.from(rawManagerDatum)
    );

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
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

    const treasuryRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].treasury,
    ]);
    invariant(
      treasuryRefs.length === 1,
      "cannot find deployed script for LbeV2 Treasury"
    );
    lucidTx.readFrom(treasuryRefs);

    // COLLECT FROM
    lucidTx.collectFrom(
      [managerUtxo],
      DataObject.to(
        LbeV2Types.ManagerRedeemer.toPlutusData(
          LbeV2Types.ManagerRedeemer.SPEND_MANAGER
        )
      )
    );
    lucidTx.collectFrom(
      [treasuryUtxo],
      DataObject.to(
        LbeV2Types.TreasuryRedeemer.toPlutusData({
          type: LbeV2Types.TreasuryRedeemerType.COLLECT_MANAGER,
        })
      )
    );

    // MINT
    lucidTx.mint(
      { [config.managerAsset]: -1n },
      DataObject.to(
        LbeV2Types.FactoryRedeemer.toPlutusData({
          type: LbeV2Types.FactoryRedeemerType.MINT_MANAGER,
        })
      )
    );

    // PAY TO
    lucidTx.payToContract(
      treasuryUtxo.address,
      {
        Inline: DataObject.to(
          LbeV2Types.TreasuryDatum.toPlutusData({
            ...treasuryDatum,
            isManagerCollected: true,
            reserveRaise: managerDatum.reserveRaise,
            totalPenalty: managerDatum.totalPenalty,
          })
        ),
      },
      treasuryUtxo.assets
    );

    // VALID TIME RANGE
    lucidTx.validFrom(currentTime).validTo(currentTime + THREE_HOUR_IN_MS);

    // METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.LBE_V2_COLLECT_MANAGER],
    });

    return lucidTx.commit();
  }

  async collectOrders(options: CollectOrdersOptions): Promise<TxComplete> {
    validateCollectOrders(options, this.networkId);
    const { treasuryUtxo, orderUtxos, currentSlot } = options;
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
    );

    const sortedOrderUtxos = [...orderUtxos].sort(compareUtxo);
    const orderDatums = sortedOrderUtxos.map((utxo) => {
      const rawOrderDatum = utxo.datum;
      invariant(rawOrderDatum, "Order utxo must have inline datum");
      return LbeV2Types.OrderDatum.fromPlutusData(
        DataObject.from(rawOrderDatum),
        this.networkId
      );
    });

    let deltaCollectedFund = 0n;
    for (const orderDatum of orderDatums) {
      deltaCollectedFund += orderDatum.amount + orderDatum.penaltyAmount;
    }

    const lucidTx = this.lucid.newTx();

    // READ FROM
    const orderRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].order,
    ]);
    invariant(
      orderRefs.length === 1,
      "cannot find deployed script for LbeV2 Order"
    );
    lucidTx.readFrom(orderRefs);

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
    lucidTx.collectFrom(
      orderUtxos,
      DataObject.to(
        LbeV2Types.OrderRedeemer.toPlutusData(
          LbeV2Types.OrderRedeemer.COLLECT_ORDER
        )
      )
    );
    lucidTx.collectFrom(
      [treasuryUtxo],
      DataObject.to(
        LbeV2Types.TreasuryRedeemer.toPlutusData({
          type: LbeV2Types.TreasuryRedeemerType.COLLECT_ORDERS,
        })
      )
    );

    // PAY TO
    const newTreasuryAssets: Assets = { ...treasuryUtxo.assets };
    const raiseAssetUnit = Asset.toString(treasuryDatum.raiseAsset);
    if (raiseAssetUnit in newTreasuryAssets) {
      newTreasuryAssets[raiseAssetUnit] =
        newTreasuryAssets[raiseAssetUnit] + deltaCollectedFund;
    } else {
      newTreasuryAssets[raiseAssetUnit] = deltaCollectedFund;
    }
    lucidTx.payToContract(
      config.treasuryAddress,
      {
        Inline: DataObject.to(
          LbeV2Types.TreasuryDatum.toPlutusData({
            ...treasuryDatum,
            collectedFund: treasuryDatum.collectedFund + deltaCollectedFund,
          })
        ),
      },
      newTreasuryAssets
    );
    for (let i = 0; i < orderDatums.length; ++i) {
      const orderDatum = orderDatums[i];
      const orderUtxo = sortedOrderUtxos[i];
      lucidTx.payToContract(
        orderUtxo.address,
        {
          Inline: DataObject.to(
            LbeV2Types.OrderDatum.toPlutusData({
              ...orderDatum,
              isCollected: true,
            })
          ),
        },
        {
          [config.orderAsset]: 1n,
          lovelace:
            LbeV2Constant.ORDER_MIN_ADA + LbeV2Constant.ORDER_COMMISSION,
        }
      );
    }

    // WITHDRAW
    lucidTx.withdraw(
      config.factoryRewardAddress,
      0n,
      DataObject.to(
        LbeV2Types.FactoryRedeemer.toPlutusData({
          type: LbeV2Types.FactoryRedeemerType.MANAGE_ORDER,
        })
      )
    );

    // VALID TIME RANGE
    lucidTx.validFrom(currentTime).validTo(currentTime + THREE_HOUR_IN_MS);

    // METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.LBE_V2_COLLECT_ORDER],
    });

    return lucidTx.commit();
  }

  calculateRedeemAmount(params: CalculationRedeemAmountParams): {
    liquidityAmount: bigint;
    returnedRaiseAmount: bigint;
  } {
    const { userAmount, totalPenalty, reserveRaise, totalLiquidity, maxRaise } =
      params;

    if (userAmount <= 0n) {
      throw new Error("User amount must be higher than 0n");
    }
    if (totalLiquidity <= 0n) {
      throw new Error("totalLiquidity must be higher than 0n");
    }
    if (reserveRaise <= 0n) {
      throw new Error("reserveRaise must be higher than 0n");
    }

    const totalReturnedRaiseAsset =
      maxRaise && maxRaise < totalPenalty + reserveRaise
        ? totalPenalty + reserveRaise - maxRaise
        : 0n;
    return {
      liquidityAmount: (totalLiquidity * userAmount) / reserveRaise,
      returnedRaiseAmount:
        (totalReturnedRaiseAsset * userAmount) / reserveRaise,
    };
  }

  async redeemOrders(options: RedeemOrdersOptions): Promise<TxComplete> {
    validateRedeemOrders(options, this.networkId);
    const { treasuryUtxo, orderUtxos, currentSlot } = options;
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
    );

    const sortedOrderUtxos = [...orderUtxos].sort(compareUtxo);
    const orderDatums = sortedOrderUtxos.map((utxo) => {
      const rawOrderDatum = utxo.datum;
      invariant(rawOrderDatum, "Order utxo must have inline datum");
      return LbeV2Types.OrderDatum.fromPlutusData(
        DataObject.from(rawOrderDatum),
        this.networkId
      );
    });

    const raiseAssetUnit = Asset.toString(treasuryDatum.raiseAsset);
    const dexV2Config = DexV2Constant.CONFIG[this.networkId];

    const lpAssetUnit =
      dexV2Config.lpPolicyId +
      PoolV2.computeLPAssetName(
        treasuryDatum.raiseAsset,
        treasuryDatum.baseAsset
      );

    const orderOutputs: { address: string; assets: Assets }[] = [];
    let totalFund = 0n;
    let totalOrderLiquidity = 0n;
    let totalOrderBonusRaise = 0n;
    for (const orderDatum of orderDatums) {
      let lpAmount = 0n;
      let bonusRaise = 0n;

      if (orderDatum.amount !== 0n) {
        const result = this.calculateRedeemAmount({
          userAmount: orderDatum.amount,
          totalPenalty: treasuryDatum.totalPenalty,
          reserveRaise: treasuryDatum.reserveRaise,
          totalLiquidity: treasuryDatum.totalLiquidity,
          maxRaise: treasuryDatum.maximumRaise,
        });
        lpAmount = result.liquidityAmount;
        bonusRaise = result.returnedRaiseAmount;
      }
      totalFund += orderDatum.amount + orderDatum.penaltyAmount;
      totalOrderLiquidity += lpAmount;
      totalOrderBonusRaise += bonusRaise;

      const orderOutAssets: Assets = {
        lovelace: LbeV2Constant.ORDER_MIN_ADA,
      };
      if (lpAmount > 0n) {
        orderOutAssets[lpAssetUnit] = lpAmount;
      }
      if (bonusRaise > 0n) {
        if (raiseAssetUnit in orderOutAssets) {
          orderOutAssets[raiseAssetUnit] =
            orderOutAssets[raiseAssetUnit] + bonusRaise;
        } else {
          orderOutAssets[raiseAssetUnit] = bonusRaise;
        }
      }
      orderOutputs.push({ address: orderDatum.owner, assets: orderOutAssets });
    }

    const lucidTx = this.lucid.newTx();

    // READ FROM
    const deployed = LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId];
    const orderRefs = await this.lucid.utxosByOutRef([deployed.order]);
    invariant(
      orderRefs.length === 1,
      "cannot find deployed script for LbeV2 Order"
    );
    lucidTx.readFrom(orderRefs);

    const treasuryRefs = await this.lucid.utxosByOutRef([deployed.treasury]);
    invariant(
      treasuryRefs.length === 1,
      "cannot find deployed script for LbeV2 Treasury"
    );
    lucidTx.readFrom(treasuryRefs);

    const factoryRefs = await this.lucid.utxosByOutRef([deployed.factory]);
    invariant(
      factoryRefs.length === 1,
      "cannot find deployed script for LbeV2 Factory"
    );
    lucidTx.readFrom(factoryRefs);

    // COLLECT FROM
    lucidTx.collectFrom(
      orderUtxos,
      DataObject.to(
        LbeV2Types.OrderRedeemer.toPlutusData(
          LbeV2Types.OrderRedeemer.REDEEM_ORDER
        )
      )
    );
    lucidTx.collectFrom(
      [treasuryUtxo],
      DataObject.to(
        LbeV2Types.TreasuryRedeemer.toPlutusData({
          type: LbeV2Types.TreasuryRedeemerType.REDEEM_ORDERS,
        })
      )
    );

    // PAY TO
    const newTreasuryAssets: Assets = { ...treasuryUtxo.assets };
    if (raiseAssetUnit in newTreasuryAssets && totalOrderBonusRaise > 0n) {
      newTreasuryAssets[raiseAssetUnit] =
        newTreasuryAssets[raiseAssetUnit] - totalOrderBonusRaise;
      if (newTreasuryAssets[raiseAssetUnit] === 0n) {
        delete newTreasuryAssets[raiseAssetUnit];
      }
    }
    if (lpAssetUnit in newTreasuryAssets && totalOrderLiquidity > 0n) {
      newTreasuryAssets[lpAssetUnit] =
        newTreasuryAssets[lpAssetUnit] - totalOrderLiquidity;
      if (newTreasuryAssets[lpAssetUnit] === 0n) {
        delete newTreasuryAssets[lpAssetUnit];
      }
    }
    lucidTx.payToContract(
      config.treasuryAddress,
      {
        Inline: DataObject.to(
          LbeV2Types.TreasuryDatum.toPlutusData({
            ...treasuryDatum,
            collectedFund: treasuryDatum.collectedFund - totalFund,
          })
        ),
      },
      newTreasuryAssets
    );
    for (const { assets, address } of orderOutputs) {
      lucidTx.payTo(address, assets);
    }

    // MINT
    lucidTx.mint(
      { [config.orderAsset]: -BigInt(orderDatums.length) },
      DataObject.to(
        LbeV2Types.FactoryRedeemer.toPlutusData({
          type: LbeV2Types.FactoryRedeemerType.MINT_REDEEM_ORDERS,
        })
      )
    );

    // WITHDRAW
    lucidTx.withdraw(
      config.factoryRewardAddress,
      0n,
      DataObject.to(
        LbeV2Types.FactoryRedeemer.toPlutusData({
          type: LbeV2Types.FactoryRedeemerType.MANAGE_ORDER,
        })
      )
    );

    // VALID TIME RANGE
    lucidTx.validFrom(currentTime).validTo(currentTime + THREE_HOUR_IN_MS);

    // METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.LBE_V2_REDEEM_LP],
    });

    return lucidTx.commit();
  }

  async refundOrders(options: RefundOrdersOptions): Promise<TxComplete> {
    validateRefundOrders(options, this.networkId);
    const { treasuryUtxo, orderUtxos, currentSlot } = options;
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
    );

    const sortedOrderUtxos = [...orderUtxos].sort(compareUtxo);
    const orderDatums = sortedOrderUtxos.map((utxo) => {
      const rawOrderDatum = utxo.datum;
      invariant(rawOrderDatum, "Order utxo must have inline datum");
      return LbeV2Types.OrderDatum.fromPlutusData(
        DataObject.from(rawOrderDatum),
        this.networkId
      );
    });

    const raiseAssetUnit = Asset.toString(treasuryDatum.raiseAsset);

    const orderOutputs: { address: string; assets: Assets }[] = [];
    let refundAmount = 0n;
    let totalOrderAmount = 0n;
    let totalOrderPenalty = 0n;
    for (const orderDatum of orderDatums) {
      const orderRefundAmount = orderDatum.amount + orderDatum.penaltyAmount;
      refundAmount += orderRefundAmount;
      totalOrderAmount += orderDatum.amount;
      totalOrderPenalty += orderDatum.penaltyAmount;
      const orderOutAssets: Assets = {
        lovelace: LbeV2Constant.ORDER_MIN_ADA,
      };
      if (orderRefundAmount > 0n) {
        if (raiseAssetUnit in orderOutAssets) {
          orderOutAssets[raiseAssetUnit] =
            orderOutAssets[raiseAssetUnit] + orderRefundAmount;
        } else {
          orderOutAssets[raiseAssetUnit] = orderRefundAmount;
        }
      }
      orderOutputs.push({
        address: orderDatum.owner,
        assets: orderOutAssets,
      });
    }

    const lucidTx = this.lucid.newTx();

    // READ FROM
    const deployed = LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId];
    const orderRefs = await this.lucid.utxosByOutRef([deployed.order]);
    invariant(
      orderRefs.length === 1,
      "cannot find deployed script for LbeV2 Order"
    );
    lucidTx.readFrom(orderRefs);

    const treasuryRefs = await this.lucid.utxosByOutRef([deployed.treasury]);
    invariant(
      treasuryRefs.length === 1,
      "cannot find deployed script for LbeV2 Treasury"
    );
    lucidTx.readFrom(treasuryRefs);

    const factoryRefs = await this.lucid.utxosByOutRef([deployed.factory]);
    invariant(
      factoryRefs.length === 1,
      "cannot find deployed script for LbeV2 Factory"
    );
    lucidTx.readFrom(factoryRefs);

    // COLLECT FROM
    lucidTx.collectFrom(
      orderUtxos,
      DataObject.to(
        LbeV2Types.OrderRedeemer.toPlutusData(
          LbeV2Types.OrderRedeemer.REDEEM_ORDER
        )
      )
    );
    lucidTx.collectFrom(
      [treasuryUtxo],
      DataObject.to(
        LbeV2Types.TreasuryRedeemer.toPlutusData({
          type: LbeV2Types.TreasuryRedeemerType.REDEEM_ORDERS,
        })
      )
    );

    // PAY TO
    const newTreasuryAssets: Assets = { ...treasuryUtxo.assets };
    if (raiseAssetUnit in newTreasuryAssets) {
      newTreasuryAssets[raiseAssetUnit] =
        newTreasuryAssets[raiseAssetUnit] - refundAmount;
      if (newTreasuryAssets[raiseAssetUnit] === 0n) {
        delete newTreasuryAssets[raiseAssetUnit];
      }
    }
    lucidTx.payToContract(
      config.treasuryAddress,
      {
        Inline: DataObject.to(
          LbeV2Types.TreasuryDatum.toPlutusData({
            ...treasuryDatum,
            collectedFund: treasuryDatum.collectedFund - refundAmount,
            reserveRaise: treasuryDatum.collectedFund - totalOrderAmount,
            totalPenalty: treasuryDatum.totalPenalty - totalOrderPenalty,
          })
        ),
      },
      newTreasuryAssets
    );
    for (const { assets, address } of orderOutputs) {
      lucidTx.payTo(address, assets);
    }

    // MINT
    lucidTx.mint(
      { [config.orderAsset]: -BigInt(orderDatums.length) },
      DataObject.to(
        LbeV2Types.FactoryRedeemer.toPlutusData({
          type: LbeV2Types.FactoryRedeemerType.MINT_REDEEM_ORDERS,
        })
      )
    );

    // WITHDRAW
    lucidTx.withdraw(
      config.factoryRewardAddress,
      0n,
      DataObject.to(
        LbeV2Types.FactoryRedeemer.toPlutusData({
          type: LbeV2Types.FactoryRedeemerType.MANAGE_ORDER,
        })
      )
    );

    // VALID TIME RANGE
    lucidTx.validFrom(currentTime).validTo(currentTime + THREE_HOUR_IN_MS);

    // METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.LBE_V2_REFUND],
    });

    return lucidTx.commit();
  }

  async createAmmPool(options: CreateAmmPoolTxOptions): Promise<TxComplete> {
    validateCreateAmmPool(options, this.networkId);
    const { treasuryUtxo, ammFactoryUtxo, currentSlot } = options;
    const currentTime = this.lucid.utils.slotsToUnixTime(currentSlot);
    const config = LbeV2Constant.CONFIG[this.networkId];

    const rawTreasuryDatum = treasuryUtxo.datum;
    invariant(rawTreasuryDatum, "Treasury utxo must have inline datum");
    const treasuryDatum = LbeV2Types.TreasuryDatum.fromPlutusData(
      this.networkId,
      DataObject.from(rawTreasuryDatum)
    );

    const {
      baseAsset,
      raiseAsset,
      maximumRaise,
      collectedFund,
      receiver,
      reserveBase,
      poolBaseFee,
      poolAllocation,
    } = treasuryDatum;

    let totalReserveRaise: bigint;
    if (maximumRaise && maximumRaise < collectedFund) {
      totalReserveRaise = maximumRaise;
    } else {
      totalReserveRaise = collectedFund;
    }
    const [assetA, assetB] =
      Asset.compare(baseAsset, raiseAsset) < 0
        ? [baseAsset, raiseAsset]
        : [raiseAsset, baseAsset];
    const lpAssetName = PoolV2.computeLPAssetName(assetA, assetB);
    const lpAsset: Asset = {
      tokenName: lpAssetName,
      policyId: DexV2Constant.CONFIG[this.networkId].lpPolicyId,
    };
    let reserveA: bigint;
    let reserveB: bigint;
    if (Asset.compare(assetA, baseAsset) === 0) {
      reserveA = reserveBase;
      reserveB = totalReserveRaise;
    } else {
      reserveA = totalReserveRaise;
      reserveB = reserveBase;
    }
    const poolReserveA = (reserveA * poolAllocation) / 100n;
    const poolReserveB = (reserveB * poolAllocation) / 100n;
    const totalLiquidity = DexV2Calculation.calculateInitialLiquidity({
      amountA: poolReserveA,
      amountB: poolReserveB,
    });
    const totalLbeLPs = totalLiquidity - PoolV2.MINIMUM_LIQUIDITY;
    const receiverLP = (totalLbeLPs * (poolAllocation - 50n)) / poolAllocation;
    const treasuryOutDatum: LbeV2Types.TreasuryDatum = {
      ...treasuryDatum,
      totalLiquidity: totalLbeLPs - receiverLP,
    };

    const lucidTx = this.lucid.newTx();

    // READ FROM
    const treasuryRefs = await this.lucid.utxosByOutRef([
      LbeV2Constant.DEPLOYED_SCRIPTS[this.networkId].treasury,
    ]);
    invariant(
      treasuryRefs.length === 1,
      "cannot find deployed script for LbeV2 Treasury"
    );

    lucidTx.readFrom(treasuryRefs);

    // SPENT
    lucidTx.collectFrom(
      [treasuryUtxo],
      DataObject.to(
        LbeV2Types.TreasuryRedeemer.toPlutusData({
          type: LbeV2Types.TreasuryRedeemerType.CREATE_AMM_POOL,
        })
      )
    );

    // PAY TO
    const receiveAssets: Assets = {};
    if (reserveA - poolReserveA !== 0n) {
      receiveAssets[Asset.toString(assetA)] = reserveA - poolReserveA;
    }
    if (reserveB - poolReserveB !== 0n) {
      receiveAssets[Asset.toString(assetB)] = reserveB - poolReserveB;
    }
    if (receiverLP) {
      receiveAssets[Asset.toString(lpAsset)] = receiverLP;
    }
    lucidTx.payTo(receiver, receiveAssets);

    const newTreasuryAssets: Assets = {
      ...treasuryUtxo.assets,
    };
    delete newTreasuryAssets[Asset.toString(baseAsset)];
    newTreasuryAssets[Asset.toString(raiseAsset)] -= totalReserveRaise;
    if (newTreasuryAssets[Asset.toString(raiseAsset)] === 0n) {
      delete newTreasuryAssets[Asset.toString(raiseAsset)];
    }
    if (totalLbeLPs - receiverLP !== 0n) {
      newTreasuryAssets[Asset.toString(lpAsset)] = totalLbeLPs - receiverLP;
    }
    newTreasuryAssets["lovelace"] -= LbeV2Constant.CREATE_POOL_COMMISSION;
    lucidTx.payToContract(
      config.treasuryAddress,
      {
        Inline: DataObject.to(
          LbeV2Types.TreasuryDatum.toPlutusData(treasuryOutDatum)
        ),
      },
      newTreasuryAssets
    );

    // CREATE POOL
    const poolBatchingStakeCredential = Addresses.inspect(
      DexV2Constant.CONFIG[this.networkId].poolBatchingAddress
    )?.delegation;
    invariant(
      poolBatchingStakeCredential,
      `cannot parse Liquidity Pool batching address`
    );
    const poolDatum: PoolV2.Datum = {
      poolBatchingStakeCredential: poolBatchingStakeCredential,
      assetA: assetA,
      assetB: assetB,
      totalLiquidity: totalLiquidity,
      reserveA: poolReserveA,
      reserveB: poolReserveB,
      baseFee: {
        feeANumerator: poolBaseFee,
        feeBNumerator: poolBaseFee,
      },
      feeSharingNumerator: undefined,
      allowDynamicFee: false,
    };
    await this.buildCreateAMMPool(lucidTx, poolDatum, ammFactoryUtxo, lpAsset);

    // VALID TIME RANGE
    lucidTx.validFrom(currentTime).validTo(currentTime + THREE_HOUR_IN_MS);

    // METADATA
    lucidTx.attachMetadata(674, {
      msg: [MetadataMessage.LBE_V2_CREATE_AMM_POOL],
    });

    return lucidTx.commit();
  }

  private async buildCreateAMMPool(
    lucidTx: Tx,
    poolDatum: PoolV2.Datum,
    factoryUtxo: Utxo,
    lpAsset: Asset
  ): Promise<void> {
    const dexV2Config = DexV2Constant.CONFIG[this.networkId];
    const { assetA, assetB, reserveA, reserveB, totalLiquidity } = poolDatum;
    const lpAssetName = lpAsset.tokenName;
    const poolAssets: Assets = {
      lovelace: PoolV2.DEFAULT_POOL_ADA,
      [Asset.toString(lpAsset)]:
        PoolV2.MAX_LIQUIDITY - (totalLiquidity - PoolV2.MINIMUM_LIQUIDITY),
      [dexV2Config.poolAuthenAsset]: 1n,
    };
    if (poolAssets[Asset.toString(assetA)]) {
      poolAssets[Asset.toString(assetA)] += reserveA;
    } else {
      poolAssets[Asset.toString(assetA)] = reserveA;
    }
    if (poolAssets[Asset.toString(assetB)]) {
      poolAssets[Asset.toString(assetB)] += reserveB;
    } else {
      poolAssets[Asset.toString(assetB)] = reserveB;
    }

    const rawFactoryDatum = factoryUtxo.datum;
    invariant(rawFactoryDatum, "Treasury utxo must have inline datum");
    const factoryDatum = FactoryV2.Datum.fromPlutusData(
      DataObject.from(rawFactoryDatum)
    );

    const newFactoryDatum1: FactoryV2.Datum = {
      head: factoryDatum.head,
      tail: lpAssetName,
    };
    const newFactoryDatum2: FactoryV2.Datum = {
      head: lpAssetName,
      tail: factoryDatum.tail,
    };

    // READ FROM
    const ammFactoryRefs = await this.lucid.utxosByOutRef([
      DexV2Constant.DEPLOYED_SCRIPTS[this.networkId].factory,
    ]);
    invariant(
      ammFactoryRefs.length === 1,
      "cannot find deployed script for Factory Validator"
    );
    const ammFactoryRef = ammFactoryRefs[0];

    const ammAuthenRefs = await this.lucid.utxosByOutRef([
      DexV2Constant.DEPLOYED_SCRIPTS[this.networkId].authen,
    ]);
    invariant(
      ammAuthenRefs.length === 1,
      "cannot find deployed script for Authen Minting Policy"
    );
    const ammAuthenRef = ammAuthenRefs[0];

    // COLLECT FROM
    lucidTx.collectFrom(
      [factoryUtxo],
      DataObject.to(
        FactoryV2.Redeemer.toPlutusData({
          assetA: assetA,
          assetB: assetB,
        })
      )
    );

    // PAY TO
    lucidTx
      .payToContract(
        dexV2Config.poolCreationAddress,
        {
          Inline: DataObject.to(PoolV2.Datum.toPlutusData(poolDatum)),
        },
        poolAssets
      )
      .payToContract(
        dexV2Config.factoryAddress,
        {
          Inline: DataObject.to(FactoryV2.Datum.toPlutusData(newFactoryDatum1)),
        },
        {
          [dexV2Config.factoryAsset]: 1n,
        }
      )
      .payToContract(
        dexV2Config.factoryAddress,
        {
          Inline: DataObject.to(FactoryV2.Datum.toPlutusData(newFactoryDatum2)),
        },
        {
          [dexV2Config.factoryAsset]: 1n,
        }
      );

    // MINT
    lucidTx.mint(
      {
        [Asset.toString(lpAsset)]: PoolV2.MAX_LIQUIDITY,
        [dexV2Config.factoryAsset]: 1n,
        [dexV2Config.poolAuthenAsset]: 1n,
      },
      DataObject.to(new Constr(1, []))
    );

    lucidTx.readFrom([ammFactoryRef, ammAuthenRef]);
  }
}
