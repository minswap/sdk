import { Credential } from "@spacebudz/lucid";

import { DataObject } from "../src";
import {
  AddressPlutusData,
  LucidCredential,
} from "../src/types/address.internal";
import { NetworkId } from "../src/types/network";
import { getScriptHashFromAddress } from "../src/utils/address-utils.internal";

test("Lucid Credential to PlutusData Converter", () => {
  const dummyHash = "b8b912cdbcc998f3f0c18e951928ca179de85735c4fc2d82e8d10777";
  const pubKeyCredential: Credential = {
    type: "Key",
    hash: dummyHash,
  };

  const scriptCredential: Credential = {
    type: "Script",
    hash: dummyHash,
  };

  const convertedPubKeyCredential = LucidCredential.fromPlutusData(
    DataObject.from(
      DataObject.to(LucidCredential.toPlutusData(pubKeyCredential))
    )
  );

  const convertedScriptCredential = LucidCredential.fromPlutusData(
    DataObject.from(
      DataObject.to(LucidCredential.toPlutusData(scriptCredential))
    )
  );

  expect(JSON.stringify(convertedPubKeyCredential)).toEqual(
    JSON.stringify(pubKeyCredential)
  );
  expect(JSON.stringify(convertedScriptCredential)).toEqual(
    JSON.stringify(scriptCredential)
  );
});

test("Address to PlutusData Converter", () => {
  const networkId = NetworkId.TESTNET;
  const pubkeyEnterpriseAddress =
    "addr_test1vzutjykdhnye3ulscx8f2xfgegtem6zhxhz0ctvzargswac99alhg";
  const pubKeyBaseAddress =
    "addr_test1qpssc0r090a9u0pyvdr9y76sm2xzx04n6d4j0y5hukcx6rxz4dtgkhfdynadkea0qezv99wljdl076xkg2krm96nn8jszmh3w7";
  const scriptEnterpriseAddress =
    "addr_test1wzn9efv2f6w82hagxqtn62ju4m293tqvw0uhmdl64ch8uwc5lpd8w";
  const scriptBaseAddress =
    "addr_test1zzn9efv2f6w82hagxqtn62ju4m293tqvw0uhmdl64ch8uwurajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upq932hcy";

  const convertedPubkeyEnterpriseAddress = AddressPlutusData.fromPlutusData(
    networkId,
    DataObject.from(
      DataObject.to(AddressPlutusData.toPlutusData(pubkeyEnterpriseAddress))
    )
  );
  const convertedPubKeyBaseAddress = AddressPlutusData.fromPlutusData(
    networkId,
    DataObject.from(
      DataObject.to(AddressPlutusData.toPlutusData(pubKeyBaseAddress))
    )
  );
  const convertedScriptEnterpriseAddress = AddressPlutusData.fromPlutusData(
    networkId,
    DataObject.from(
      DataObject.to(AddressPlutusData.toPlutusData(scriptEnterpriseAddress))
    )
  );
  const convertedScriptBaseAddress = AddressPlutusData.fromPlutusData(
    networkId,
    DataObject.from(
      DataObject.to(AddressPlutusData.toPlutusData(scriptBaseAddress))
    )
  );

  expect(pubkeyEnterpriseAddress).toEqual(convertedPubkeyEnterpriseAddress);
  expect(pubKeyBaseAddress).toEqual(convertedPubKeyBaseAddress);
  expect(scriptEnterpriseAddress).toEqual(convertedScriptEnterpriseAddress);
  expect(scriptBaseAddress).toEqual(convertedScriptBaseAddress);
});

describe("Address utils", () => {
  test("getScriptHashFromAddress", () => {
    for (const a of [
      "addr_test1zrsnz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzvrajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqs8q93k",
      "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz2j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq0xmsha",
      "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzfgf0jgfz5xdvg2pges20usxhw8zwnkggheqrxwmxd6huuqss46eh",
      "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzwccf8ywaly0m99ngq68lus48lmafut7ku9geawu8u6k49suv42qq",
      "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz02znpd777wgl9wwpk0dvdzuxn93mqh82q7vv6s9jn25rws52z94g",
      "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz2jyskd3y6etkv8ye450545xu6q4jfq5hv4e0uxwkpf8lsq048y90",
      "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxztnqm37tpj0q63s0qns5wfe4flqzqqg55760472n7yt4v8skpaj3k",
    ])
      expect(getScriptHashFromAddress(a)).toEqual(
        "script1uychk9f04tqngfhx4qlqdlug5ntzen3uzc62kzj7cyesjk0d9me"
      );
  });
});
