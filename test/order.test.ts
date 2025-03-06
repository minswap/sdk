import invariant from "@minswap/tiny-invariant";
import { Addresses } from "@spacebudz/lucid";

import {
  Asset,
  DataObject,
  FIXED_DEPOSIT_ADA,
  NetworkId,
  OrderV1,
  OrderV2,
  StableOrder,
} from "../src";
import {
  BATCHER_FEE,
  BATCHER_FEE_DEX_V2,
  DexVersion,
} from "../src/batcher-fee/configs.internal";

let testSender: string;
let testSenderPkh: string;
let testReceiver: string;
let testReceiverDatumHash: string;
let testAsset: Asset;
let networkId: NetworkId;
beforeAll(() => {
  testSender =
    "addr_test1qpssc0r090a9u0pyvdr9y76sm2xzx04n6d4j0y5hukcx6rxz4dtgkhfdynadkea0qezv99wljdl076xkg2krm96nn8jszmh3w7";
  const senderPkh = Addresses.inspect(testSender).payment?.hash;
  invariant(senderPkh);
  testSenderPkh = senderPkh;
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

function buildCommonV1Datum(
  dexVersion: DexVersion,
  type: OrderV1.StepType | StableOrder.StepType
): Omit<OrderV1.Datum, "receiverDatumHash" | "step"> {
  return {
    sender: testSender,
    receiver: testReceiver,
    batcherFee: BATCHER_FEE[dexVersion][type],
    depositADA: FIXED_DEPOSIT_ADA,
  };
}

test("V1: SwapExactIn Order to PlutusData Converter", () => {
  const order1: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.SWAP_EXACT_IN),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderV1.StepType.SWAP_EXACT_IN,
      desiredAsset: testAsset,
      minimumReceived: 10n,
    },
  };

  const order2: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.SWAP_EXACT_IN),
    receiverDatumHash: undefined,
    step: {
      type: OrderV1.StepType.SWAP_EXACT_IN,
      desiredAsset: testAsset,
      minimumReceived: 10n,
    },
  };

  const convertedOrder1 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

test("V1: SwapExactOut Order to PlutusData Converter", () => {
  const order1: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.SWAP_EXACT_OUT),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderV1.StepType.SWAP_EXACT_OUT,
      desiredAsset: testAsset,
      expectedReceived: 10n,
    },
  };

  const order2: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.SWAP_EXACT_OUT),
    receiverDatumHash: undefined,
    step: {
      type: OrderV1.StepType.SWAP_EXACT_OUT,
      desiredAsset: testAsset,
      expectedReceived: 10n,
    },
  };

  const convertedOrder1 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

test("V1: Deposit Order to PlutusData Converter", () => {
  const order1: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.DEPOSIT),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderV1.StepType.DEPOSIT,
      minimumLP: 10n,
    },
  };

  const order2: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.DEPOSIT),
    receiverDatumHash: undefined,
    step: {
      type: OrderV1.StepType.DEPOSIT,
      minimumLP: 10n,
    },
  };

  const convertedOrder1 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

test("V1: Withdraw Order to PlutusData Converter", () => {
  const order1: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.WITHDRAW),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderV1.StepType.WITHDRAW,
      minimumAssetA: 10n,
      minimumAssetB: 11n,
    },
  };

  const order2: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.WITHDRAW),
    receiverDatumHash: undefined,
    step: {
      type: OrderV1.StepType.WITHDRAW,
      minimumAssetA: 10n,
      minimumAssetB: 11n,
    },
  };

  const convertedOrder1 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

test("V1: Zap Order to PlutusData Converter", () => {
  const order1: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.ZAP_IN),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: OrderV1.StepType.ZAP_IN,
      desiredAsset: testAsset,
      minimumLP: 11n,
    },
  };

  const order2: OrderV1.Datum = {
    ...buildCommonV1Datum(DexVersion.DEX_V1, OrderV1.StepType.SWAP_EXACT_IN),
    receiverDatumHash: undefined,
    step: {
      type: OrderV1.StepType.ZAP_IN,
      desiredAsset: testAsset,
      minimumLP: 11n,
    },
  };

  const convertedOrder1 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = OrderV1.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(OrderV1.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

test("Stableswap: Swap Order to PlutusData Converter", () => {
  const order1: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.SWAP),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: StableOrder.StepType.SWAP,
      assetInIndex: 0n,
      assetOutIndex: 1n,
      minimumAssetOut: 11n,
    },
  };

  const order2: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.SWAP),
    receiverDatumHash: undefined,
    step: {
      type: StableOrder.StepType.SWAP,
      assetInIndex: 0n,
      assetOutIndex: 1n,
      minimumAssetOut: 11n,
    },
  };

  const convertedOrder1 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

test("Stableswap: Deposit Order to PlutusData Converter", () => {
  const order1: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.DEPOSIT),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: StableOrder.StepType.DEPOSIT,
      minimumLP: 11n,
    },
  };

  const order2: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.DEPOSIT),
    receiverDatumHash: undefined,
    step: {
      type: StableOrder.StepType.DEPOSIT,
      minimumLP: 11n,
    },
  };

  const convertedOrder1 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

test("Stableswap: Withdraw Order to PlutusData Converter", () => {
  const order1: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.WITHDRAW),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: StableOrder.StepType.WITHDRAW,
      minimumAmounts: [10n, 11n],
    },
  };

  const order2: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.WITHDRAW),
    receiverDatumHash: undefined,
    step: {
      type: StableOrder.StepType.WITHDRAW,
      minimumAmounts: [10n, 11n],
    },
  };

  const convertedOrder1 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

test("Stableswap: Withdraw Imbalance Order to PlutusData Converter", () => {
  const order1: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.WITHDRAW_IMBALANCE),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: StableOrder.StepType.WITHDRAW_IMBALANCE,
      withdrawAmounts: [10n, 11n],
    },
  };

  const order2: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.WITHDRAW_IMBALANCE),
    receiverDatumHash: undefined,
    step: {
      type: StableOrder.StepType.WITHDRAW_IMBALANCE,
      withdrawAmounts: [10n, 11n],
    },
  };

  const convertedOrder1 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

test("Stableswap: Zap Out Order to PlutusData Converter", () => {
  const order1: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.ZAP_OUT),
    receiverDatumHash: testReceiverDatumHash,
    step: {
      type: StableOrder.StepType.WITHDRAW_IMBALANCE,
      withdrawAmounts: [10n, 11n],
    },
  };

  const order2: StableOrder.Datum = {
    ...buildCommonV1Datum(DexVersion.STABLESWAP, StableOrder.StepType.ZAP_OUT),
    receiverDatumHash: undefined,
    step: {
      type: StableOrder.StepType.WITHDRAW_IMBALANCE,
      withdrawAmounts: [10n, 11n],
    },
  };

  const convertedOrder1 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order1)))
  );
  const convertedOrder2 = StableOrder.Datum.fromPlutusData(
    networkId,
    DataObject.from(DataObject.to(StableOrder.Datum.toPlutusData(order2)))
  );
  expect(order1).toEqual(convertedOrder1);
  expect(order2).toEqual(convertedOrder2);
});

function buildV2Datums(step: OrderV2.Step): OrderV2.Datum[] {
  return [
    {
      canceller: {
        type: OrderV2.AuthorizationMethodType.SIGNATURE,
        hash: testSenderPkh,
      },
      refundReceiver: testSender,
      refundReceiverDatum: {
        type: OrderV2.ExtraDatumType.NO_DATUM,
      },
      successReceiver: testReceiver,
      successReceiverDatum: {
        type: OrderV2.ExtraDatumType.NO_DATUM,
      },
      step: step,
      lpAsset: {
        policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
        tokenName:
          "e08460587b08cca542bd2856b8d5e1d23bf3f63f9916fb81f6d95fda0910bf69",
      },
      maxBatcherFee: BATCHER_FEE_DEX_V2[step.type],
      expiredOptions: undefined,
    },
    {
      canceller: {
        type: OrderV2.AuthorizationMethodType.SIGNATURE,
        hash: testSenderPkh,
      },
      refundReceiver: testSender,
      refundReceiverDatum: {
        type: OrderV2.ExtraDatumType.DATUM_HASH,
        hash: testReceiverDatumHash,
      },
      successReceiver: testReceiver,
      successReceiverDatum: {
        type: OrderV2.ExtraDatumType.DATUM_HASH,
        hash: testReceiverDatumHash,
      },
      step: step,
      lpAsset: {
        policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
        tokenName:
          "e08460587b08cca542bd2856b8d5e1d23bf3f63f9916fb81f6d95fda0910bf69",
      },
      maxBatcherFee: BATCHER_FEE_DEX_V2[step.type],
      expiredOptions: undefined,
    },
    {
      canceller: {
        type: OrderV2.AuthorizationMethodType.SIGNATURE,
        hash: testSenderPkh,
      },
      refundReceiver: testSender,
      refundReceiverDatum: {
        type: OrderV2.ExtraDatumType.INLINE_DATUM,
        hash: testReceiverDatumHash,
      },
      successReceiver: testReceiver,
      successReceiverDatum: {
        type: OrderV2.ExtraDatumType.INLINE_DATUM,
        hash: testReceiverDatumHash,
      },
      step: step,
      lpAsset: {
        policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
        tokenName:
          "e08460587b08cca542bd2856b8d5e1d23bf3f63f9916fb81f6d95fda0910bf69",
      },
      maxBatcherFee: BATCHER_FEE_DEX_V2[step.type],
      expiredOptions: undefined,
    },
    {
      canceller: {
        type: OrderV2.AuthorizationMethodType.SIGNATURE,
        hash: testSenderPkh,
      },
      refundReceiver: testSender,
      refundReceiverDatum: {
        type: OrderV2.ExtraDatumType.NO_DATUM,
      },
      successReceiver: testReceiver,
      successReceiverDatum: {
        type: OrderV2.ExtraDatumType.NO_DATUM,
      },
      step: step,
      lpAsset: {
        policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
        tokenName:
          "e08460587b08cca542bd2856b8d5e1d23bf3f63f9916fb81f6d95fda0910bf69",
      },
      maxBatcherFee: BATCHER_FEE_DEX_V2[step.type],
      expiredOptions: {
        expiredTime: 1721010208050n,
        maxCancellationTip: 300_000n,
      },
    },
  ];
}

test("V2: Swap Exact In Order to PlutusData Converter", () => {
  const step1: OrderV2.Step = {
    type: OrderV2.StepType.SWAP_EXACT_IN,
    swapAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      swapAmount: 10000n,
    },
    direction: OrderV2.Direction.A_TO_B,
    minimumReceived: 1n,
    killable: OrderV2.Killable.PENDING_ON_FAILED,
  };
  const step2: OrderV2.Step = {
    type: OrderV2.StepType.SWAP_EXACT_IN,
    swapAmount: {
      type: OrderV2.AmountType.ALL,
      deductedAmount: 10000n,
    },
    direction: OrderV2.Direction.B_TO_A,
    minimumReceived: 1n,
    killable: OrderV2.Killable.KILL_ON_FAILED,
  };
  const datums: OrderV2.Datum[] = [
    ...buildV2Datums(step1),
    ...buildV2Datums(step2),
  ];
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: Stop Order to PlutusData Converter", () => {
  const step1: OrderV2.Step = {
    type: OrderV2.StepType.STOP,
    swapAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      swapAmount: 10000n,
    },
    direction: OrderV2.Direction.A_TO_B,
    stopReceived: 1n,
  };
  const step2: OrderV2.Step = {
    type: OrderV2.StepType.STOP,
    swapAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      swapAmount: 10000n,
    },
    direction: OrderV2.Direction.B_TO_A,
    stopReceived: 1n,
  };
  const datums: OrderV2.Datum[] = [
    ...buildV2Datums(step1),
    ...buildV2Datums(step2),
  ];
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: OCO Order to PlutusData Converter", () => {
  const step1: OrderV2.Step = {
    type: OrderV2.StepType.OCO,
    swapAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      swapAmount: 10000n,
    },
    direction: OrderV2.Direction.A_TO_B,
    stopReceived: 1n,
    minimumReceived: 1n,
  };
  const step2: OrderV2.Step = {
    type: OrderV2.StepType.OCO,
    swapAmount: {
      type: OrderV2.AmountType.ALL,
      deductedAmount: 10000n,
    },
    direction: OrderV2.Direction.B_TO_A,
    stopReceived: 1n,
    minimumReceived: 1n,
  };
  const datums: OrderV2.Datum[] = [
    ...buildV2Datums(step1),
    ...buildV2Datums(step2),
  ];
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: Swap Exact Out Order to PlutusData Converter", () => {
  const step1: OrderV2.Step = {
    type: OrderV2.StepType.SWAP_EXACT_OUT,
    maximumSwapAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      swapAmount: 10000n,
    },
    direction: OrderV2.Direction.A_TO_B,
    expectedReceived: 1n,
    killable: OrderV2.Killable.PENDING_ON_FAILED,
  };
  const step2: OrderV2.Step = {
    type: OrderV2.StepType.SWAP_EXACT_OUT,
    maximumSwapAmount: {
      type: OrderV2.AmountType.ALL,
      deductedAmount: 10000n,
    },
    direction: OrderV2.Direction.B_TO_A,
    expectedReceived: 1n,
    killable: OrderV2.Killable.KILL_ON_FAILED,
  };
  const datums: OrderV2.Datum[] = [
    ...buildV2Datums(step1),
    ...buildV2Datums(step2),
  ];
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: Deposit Order to PlutusData Converter", () => {
  const step1: OrderV2.Step = {
    type: OrderV2.StepType.DEPOSIT,
    depositAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      depositAmountA: 10000n,
      depositAmountB: 10000n,
    },
    minimumLP: 1n,
    killable: OrderV2.Killable.PENDING_ON_FAILED,
  };
  const step2: OrderV2.Step = {
    type: OrderV2.StepType.DEPOSIT,
    depositAmount: {
      type: OrderV2.AmountType.ALL,
      deductedAmountA: 10000n,
      deductedAmountB: 10000n,
    },
    minimumLP: 1n,
    killable: OrderV2.Killable.KILL_ON_FAILED,
  };
  const datums: OrderV2.Datum[] = [
    ...buildV2Datums(step1),
    ...buildV2Datums(step2),
  ];
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: Withdraw Order to PlutusData Converter", () => {
  const step1: OrderV2.Step = {
    type: OrderV2.StepType.WITHDRAW,
    withdrawalAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      withdrawalLPAmount: 10000n,
    },
    minimumAssetA: 1n,
    minimumAssetB: 1n,
    killable: OrderV2.Killable.PENDING_ON_FAILED,
  };
  const step2: OrderV2.Step = {
    type: OrderV2.StepType.WITHDRAW,
    withdrawalAmount: {
      type: OrderV2.AmountType.ALL,
      deductedLPAmount: 10000n,
    },
    minimumAssetA: 1n,
    minimumAssetB: 1n,
    killable: OrderV2.Killable.KILL_ON_FAILED,
  };
  const datums: OrderV2.Datum[] = [
    ...buildV2Datums(step1),
    ...buildV2Datums(step2),
  ];
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: Zap Out Order to PlutusData Converter", () => {
  const step1: OrderV2.Step = {
    type: OrderV2.StepType.ZAP_OUT,
    withdrawalAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      withdrawalLPAmount: 10000n,
    },
    direction: OrderV2.Direction.A_TO_B,
    minimumReceived: 1n,
    killable: OrderV2.Killable.PENDING_ON_FAILED,
  };
  const step2: OrderV2.Step = {
    type: OrderV2.StepType.ZAP_OUT,
    withdrawalAmount: {
      type: OrderV2.AmountType.ALL,
      deductedLPAmount: 10000n,
    },
    direction: OrderV2.Direction.B_TO_A,
    minimumReceived: 1n,
    killable: OrderV2.Killable.KILL_ON_FAILED,
  };
  const datums: OrderV2.Datum[] = [
    ...buildV2Datums(step1),
    ...buildV2Datums(step2),
  ];
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: Partial Swap Order to PlutusData Converter", () => {
  const step1: OrderV2.Step = {
    type: OrderV2.StepType.PARTIAL_SWAP,
    totalSwapAmount: 10000n,
    ioRatioDenominator: 1n,
    ioRatioNumerator: 1n,
    hops: 3n,
    direction: OrderV2.Direction.A_TO_B,
    maxBatcherFeeEachTime:
      BATCHER_FEE_DEX_V2[OrderV2.StepType.PARTIAL_SWAP] * 3n,
    minimumSwapAmountRequired: 1000n,
  };
  const step2: OrderV2.Step = {
    type: OrderV2.StepType.PARTIAL_SWAP,
    totalSwapAmount: 10000n,
    ioRatioDenominator: 1n,
    ioRatioNumerator: 1n,
    hops: 3n,
    direction: OrderV2.Direction.B_TO_A,
    maxBatcherFeeEachTime:
      BATCHER_FEE_DEX_V2[OrderV2.StepType.PARTIAL_SWAP] * 3n,
    minimumSwapAmountRequired: 1000n,
  };
  const datums: OrderV2.Datum[] = [
    ...buildV2Datums(step1),
    ...buildV2Datums(step2),
  ];
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: Withdraw Imbalance Order to PlutusData Converter", () => {
  const step1: OrderV2.Step = {
    type: OrderV2.StepType.WITHDRAW_IMBALANCE,
    withdrawalAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      withdrawalLPAmount: 10000n,
    },
    killable: OrderV2.Killable.PENDING_ON_FAILED,
    ratioAssetA: 1n,
    ratioAssetB: 1n,
    minimumAssetA: 1000n,
  };
  const step2: OrderV2.Step = {
    type: OrderV2.StepType.WITHDRAW_IMBALANCE,
    withdrawalAmount: {
      type: OrderV2.AmountType.ALL,
      deductedLPAmount: 10000n,
    },
    killable: OrderV2.Killable.KILL_ON_FAILED,
    ratioAssetA: 1n,
    ratioAssetB: 1n,
    minimumAssetA: 1000n,
  };
  const datums: OrderV2.Datum[] = [
    ...buildV2Datums(step1),
    ...buildV2Datums(step2),
  ];
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: Routing Order to PlutusData Converter", () => {
  const step: OrderV2.Step = {
    type: OrderV2.StepType.SWAP_ROUTING,
    swapAmount: {
      type: OrderV2.AmountType.SPECIFIC_AMOUNT,
      swapAmount: 10000n,
    },
    minimumReceived: 1n,
    routings: [
      {
        direction: OrderV2.Direction.A_TO_B,
        lpAsset: {
          policyId: "f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c",
          tokenName:
            "ef4530398e53eea75ee3d02a982e87a5c680776904b5d610e63bf6970c528a12",
        },
      },
      {
        direction: OrderV2.Direction.B_TO_A,
        lpAsset: {
          policyId: "f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c",
          tokenName:
            "eebaae50fe9a09938558096cfebe0aec7dd2728dedadb3d96f02f19e756ca9b8",
        },
      },
    ],
  };
  const datums: OrderV2.Datum[] = buildV2Datums(step);
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});

test("V2: Donation Order to PlutusData Converter", () => {
  const step: OrderV2.Step = {
    type: OrderV2.StepType.DONATION,
  };
  const datums: OrderV2.Datum[] = buildV2Datums(step);
  for (const datum of datums) {
    const convertedDatum = OrderV2.Datum.fromPlutusData(
      networkId,
      DataObject.from(DataObject.to(OrderV2.Datum.toPlutusData(datum)))
    );

    expect(datum).toEqual(convertedDatum);
  }
});
