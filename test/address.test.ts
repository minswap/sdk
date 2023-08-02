import { Credential, Data } from "lucid-cardano";

import {
  AddressPlutusData,
  LucidCredential,
} from "../src/types/address.internal";
import { NetworkId } from "../src/types/network";

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
    Data.from(Data.to(LucidCredential.toPlutusData(pubKeyCredential)))
  );

  const convertedScriptCredential = LucidCredential.fromPlutusData(
    Data.from(Data.to(LucidCredential.toPlutusData(scriptCredential)))
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
    Data.from(Data.to(AddressPlutusData.toPlutusData(pubkeyEnterpriseAddress)))
  );
  const convertedPubKeyBaseAddress = AddressPlutusData.fromPlutusData(
    networkId,
    Data.from(Data.to(AddressPlutusData.toPlutusData(pubKeyBaseAddress)))
  );
  const convertedScriptEnterpriseAddress = AddressPlutusData.fromPlutusData(
    networkId,
    Data.from(Data.to(AddressPlutusData.toPlutusData(scriptEnterpriseAddress)))
  );
  const convertedScriptBaseAddress = AddressPlutusData.fromPlutusData(
    networkId,
    Data.from(Data.to(AddressPlutusData.toPlutusData(scriptBaseAddress)))
  );

  expect(pubkeyEnterpriseAddress).toEqual(convertedPubkeyEnterpriseAddress);
  expect(pubKeyBaseAddress).toEqual(convertedPubKeyBaseAddress);
  expect(scriptEnterpriseAddress).toEqual(convertedScriptEnterpriseAddress);
  expect(scriptBaseAddress).toEqual(convertedScriptBaseAddress);
});
