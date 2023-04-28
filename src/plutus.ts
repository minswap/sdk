import { Address } from "./types";
import { C, Constr, Credential, getAddressDetails } from "lucid-cardano";
import invariant from "@minswap/tiny-invariant";

export namespace LucidCredential {
  export function toPlutusData(data: Credential) {
    const constructor = data.type === "Key" ? 0 : 1;
    return new Constr(constructor, [data.hash]);
  }
}

export namespace AddressPlutusData {
  export function toPlutusData(address: Address) {
    const addressDetails = getAddressDetails(address);
    if (addressDetails.type === "Base") {
      invariant(addressDetails.paymentCredential, "baseAddress must has paymentCredential");
      const stakeCredConstr = addressDetails.stakeCredential
        ? new Constr(0, [
          new Constr(0, [
            LucidCredential.toPlutusData(addressDetails.stakeCredential),
          ]),
        ])
        : new Constr(1, []);

      return new Constr(0, [
        LucidCredential.toPlutusData(addressDetails.paymentCredential),
        stakeCredConstr,
      ]);
    }
    if (addressDetails.type === "Enterprise") {
      invariant(addressDetails.paymentCredential, "EnterpriseAddress must has paymentCredential");
      return new Constr(0, [
        LucidCredential.toPlutusData(addressDetails.paymentCredential),
        new Constr(1, []),
      ]);
    }
    throw new Error("only supports base address, enterprise address");
  }
}