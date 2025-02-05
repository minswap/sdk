import JSONBig from "json-bigint";

import { DataObject, NetworkId } from "../src";
import { ADA, Asset } from "../src/types/asset";
import { PoolV1 } from "../src/types/pool";
import { isValidPoolOutput, PoolFeeSharing } from "../src/types/pool.internal";
import { TxIn, Value } from "../src/types/tx.internal";

const PREPROD_POOL_ADDRESS =
  "addr_test1zrsnz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzvrajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqs8q93k";

test("can handle pool with one side being LP tokens", () => {
  const txIn: TxIn = {
    txHash: "8626060cf100c9b777546808e0ad20c099fe35cfcaee8de0079aa6c6931d345b",
    index: 3,
  };
  const value: Value = [
    { unit: "lovelace", quantity: "111990389" },
    {
      unit: "0be55d262b29f564998ff81efe21bdc0022621c12f15af08d0f2ddb13e4a0451d432d1e4dbd6c5c6aebfbd0b995a72d52be4d3e2d184e4b1081d3b13",
      quantity: "1",
    },
    {
      unit: "13aa2accf2e1561723aa26871e071fdf32c867cff7e7d50ad470d62f4d494e53574150",
      quantity: "1",
    },
    {
      unit: "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d866aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2",
      quantity: "212939798",
    },
  ];
  const datumHash =
    "421d71a088b55789301a403994760d1f2854444b0380fc3df8970f8e212b3f30";
  expect(
    isValidPoolOutput(PREPROD_POOL_ADDRESS, value, datumHash)
  ).toBeTruthy();
  expect(
    new PoolV1.State(PREPROD_POOL_ADDRESS, txIn, value, datumHash)
  ).toBeInstanceOf(PoolV1.State);
});

test("Fee Sharing to PlutusData Converter", () => {
  const feeSharing1: PoolFeeSharing = {
    feeTo: "addr_test1wqq9fn7ynjzx3kfddmnsjn69tgm8hrr333adhvw0sfx30lqy38kcs",
    feeToDatumHash: "b8b912cdbcc998f3f0c18e951928ca179de85735c4fc2d82e8d10777",
  };
  const feeSharing2: PoolFeeSharing = {
    feeTo:
      "addr_test1qp7e4l2z307kjsashtgl2l373hd06jumuspl0qn2fklc6tlf6dsm8jwtvdltnax4fl7uu8w9mh2u8f420ul5vp8q3jas7yep6y",
    feeToDatumHash: undefined,
  };

  const convertedFeeSharing1 = PoolFeeSharing.fromPlutusData(
    NetworkId.TESTNET,
    DataObject.from(DataObject.to(PoolFeeSharing.toPlutusData(feeSharing1)))
  );
  const convertedFeeSharing2 = PoolFeeSharing.fromPlutusData(
    NetworkId.TESTNET,
    DataObject.from(DataObject.to(PoolFeeSharing.toPlutusData(feeSharing2)))
  );

  expect(JSONBig.stringify(feeSharing1)).toEqual(
    JSONBig.stringify(convertedFeeSharing1)
  );
  expect(JSONBig.stringify(feeSharing2)).toEqual(
    JSONBig.stringify(convertedFeeSharing2)
  );
});

test("Pool Datum to PlutusData Converter", () => {
  const assetA = ADA;
  const assetB: Asset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    tokenName: "4d494e",
  };
  const poolDatum1: PoolV1.Datum = {
    assetA: assetA,
    assetB: assetB,
    totalLiquidity: 100000n,
    rootKLast: 10000n,
    feeSharing: {
      feeTo:
        "addr_test1qp7e4l2z307kjsashtgl2l373hd06jumuspl0qn2fklc6tlf6dsm8jwtvdltnax4fl7uu8w9mh2u8f420ul5vp8q3jas7yep6y",
      feeToDatumHash: undefined,
    },
  };

  const poolDatum2: PoolV1.Datum = {
    assetA: assetA,
    assetB: assetB,
    totalLiquidity: 100000n,
    rootKLast: 10000n,
    feeSharing: undefined,
  };

  const convertedPoolDatum1 = PoolV1.Datum.fromPlutusData(
    NetworkId.TESTNET,
    DataObject.from(DataObject.to(PoolV1.Datum.toPlutusData(poolDatum1)))
  );
  const convertedPoolDatum2 = PoolV1.Datum.fromPlutusData(
    NetworkId.TESTNET,
    DataObject.from(DataObject.to(PoolV1.Datum.toPlutusData(poolDatum2)))
  );

  expect(JSONBig.stringify(poolDatum1)).toEqual(
    JSONBig.stringify(convertedPoolDatum1)
  );
  expect(JSONBig.stringify(poolDatum2)).toEqual(
    JSONBig.stringify(convertedPoolDatum2)
  );
});
