import invariant from "@minswap/tiny-invariant";
import { Constr, Credential, Data, getAddressDetails } from "lucid-cardano";

import { Address } from "./types";

export namespace LucidCredential {
  export function toPlutusData(data: Credential): Constr<Data> {
    const constructor = data.type === "Key" ? 0 : 1;
    return new Constr(constructor, [data.hash]);
  }
}

export namespace AddressPlutusData {
  export function toPlutusData(address: Address): Constr<Data> {
    const addressDetails = getAddressDetails(address);
    if (addressDetails.type === "Base") {
      invariant(
        addressDetails.paymentCredential && addressDetails.stakeCredential,
        "baseAddress must have both paymentCredential and stakeCredential"
      );

      return new Constr(0, [
        LucidCredential.toPlutusData(addressDetails.paymentCredential),
        new Constr(0, [
          new Constr(0, [
            LucidCredential.toPlutusData(addressDetails.stakeCredential),
          ]),
        ]),
      ]);
    }
    if (addressDetails.type === "Enterprise") {
      invariant(
        addressDetails.paymentCredential,
        "EnterpriseAddress must has paymentCredential"
      );
      return new Constr(0, [
        LucidCredential.toPlutusData(addressDetails.paymentCredential),
        new Constr(1, []),
      ]);
    }
    throw new Error("only supports base address, enterprise address");
  }
}
