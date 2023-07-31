import JSONBig from "json-bigint";
import { Address, Data } from "lucid-cardano";

import { FIXED_BATCHER_FEE } from "../src/batcher-fee-reduction/configs.internal";
import { FIXED_DEPOSIT_ADA } from "../src/constants";
import { Asset } from "../src/types/asset";
import { NetworkId } from "../src/types/network";
import { OrderDatum, OrderStepType } from "../src/types/order";

let testSender: Address;
let testReceiver: Address;
let testReceiverDatumHash: string;
let testAsset: Asset;
let networkId: NetworkId;
beforeAll(() => {
  testSender =
    "addr_test1qpssc0r090a9u0pyvdr9y76sm2xzx04n6d4j0y5hukcx6rxz4dtgkhfdynadkea0qezv99wljdl076xkg2krm96nn8jszmh3w7";
  testReceiver =
    "addr_test1wqq9fn7ynjzx3kfddmnsjn69tgm8hrr333adhvw0sfx30lqy38kcs";
  testReceiverDatumHash =
    "b8b912cdbcc998f3f0c18e951928ca179de85735c4fc2d82e8d10777";
  testAsset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    tokenName: "4d494e",
  };
  networkId = NetworkId.TESTNET;
});

test("SwapExactIn Order to PlutusData Converter", () => {
  const order1: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderStepType.SWAP_EXACT_IN,
      desiredAsset: testAsset,
      minimumReceived: 10n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const order2: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: undefined,
    step: {
      type: OrderStepType.SWAP_EXACT_IN,
      desiredAsset: testAsset,
      minimumReceived: 10n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const convertedOrder1 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order2)))
  );
  expect(JSONBig.stringify(order1)).toEqual(JSONBig.stringify(convertedOrder1));
  expect(JSONBig.stringify(order2)).toEqual(JSONBig.stringify(convertedOrder2));
});

test("SwapExactOut Order to PlutusData Converter", () => {
  const order1: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderStepType.SWAP_EXACT_OUT,
      desiredAsset: testAsset,
      expectedReceived: 10n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const order2: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: undefined,
    step: {
      type: OrderStepType.SWAP_EXACT_OUT,
      desiredAsset: testAsset,
      expectedReceived: 10n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const convertedOrder1 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order2)))
  );
  expect(JSONBig.stringify(order1)).toEqual(JSONBig.stringify(convertedOrder1));
  expect(JSONBig.stringify(order2)).toEqual(JSONBig.stringify(convertedOrder2));
});

test("Deposit Order to PlutusData Converter", () => {
  const order1: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderStepType.DEPOSIT,
      minimumLP: 10n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const order2: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: undefined,
    step: {
      type: OrderStepType.DEPOSIT,
      minimumLP: 10n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const convertedOrder1 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order2)))
  );
  expect(JSONBig.stringify(order1)).toEqual(JSONBig.stringify(convertedOrder1));
  expect(JSONBig.stringify(order2)).toEqual(JSONBig.stringify(convertedOrder2));
});

test("Withdraw Order to PlutusData Converter", () => {
  const order1: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderStepType.WITHDRAW,
      minimumAssetA: 10n,
      minimumAssetB: 11n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const order2: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: undefined,
    step: {
      type: OrderStepType.WITHDRAW,
      minimumAssetA: 10n,
      minimumAssetB: 11n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const convertedOrder1 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order2)))
  );
  expect(JSONBig.stringify(order1)).toEqual(JSONBig.stringify(convertedOrder1));
  expect(JSONBig.stringify(order2)).toEqual(JSONBig.stringify(convertedOrder2));
});

test("Zap Order to PlutusData Converter", () => {
  const order1: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderStepType.ZAP_IN,
      desiredAsset: testAsset,
      minimumLP: 11n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const order2: OrderDatum = {
    sender: testSender,
    receiver: testReceiver,
    receiverDatumHash: undefined,
    step: {
      type: OrderStepType.ZAP_IN,
      desiredAsset: testAsset,
      minimumLP: 11n,
    },
    batcherFee: FIXED_BATCHER_FEE,
    depositADA: FIXED_DEPOSIT_ADA,
  };

  const convertedOrder1 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderDatum.fromPlutusData(
    networkId,
    Data.from(Data.to(OrderDatum.toPlutusData(order2)))
  );
  expect(JSONBig.stringify(order1)).toEqual(JSONBig.stringify(convertedOrder1));
  expect(JSONBig.stringify(order2)).toEqual(JSONBig.stringify(convertedOrder2));
});
