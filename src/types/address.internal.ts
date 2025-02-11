import invariant from "@minswap/tiny-invariant";
import {
  Addresses,
  Constr,
  Credential,
} from "@spacebudz/lucid";

import { DataType } from "..";
import { NetworkId } from "./network";

export namespace LucidCredential {
  export function toPlutusData(data: Credential): Constr<DataType> {
    const constructor = data.type === "Key" ? 0 : 1;
    return new Constr(constructor, [data.hash]);
  }

  export function fromPlutusData(data: Constr<DataType>): Credential {
    switch (data.index) {
      case 0: {
        return {
          type: "Key",
          hash: data.fields[0] as string,
        };
      }
      case 1: {
        return {
          type: "Script",
          hash: data.fields[0] as string,
        };
      }
      default: {
        throw new Error(
          `Index of Credentail must be 0 or 1, actual: ${data.index}`
        );
      }
    }
  }
}

export namespace AddressPlutusData {
  export function toPlutusData(address: string): Constr<DataType> {
    const addressDetails = Addresses.inspect(address);
    if (addressDetails.type === "Base") {
      invariant(
        addressDetails.payment && addressDetails.delegation,
        "baseAddress must have both paymentCredential and stakeCredential"
      );

      return new Constr(0, [
        LucidCredential.toPlutusData(addressDetails.payment),
        new Constr(0, [
          new Constr(0, [
            LucidCredential.toPlutusData(addressDetails.delegation),
          ]),
        ]),
      ]);
    }
    if (addressDetails.type === "Enterprise") {
      invariant(
        addressDetails.payment,
        "EnterpriseAddress must has paymentCredential"
      );
      return new Constr(0, [
        LucidCredential.toPlutusData(addressDetails.payment),
        new Constr(1, []),
      ]);
    }
    throw new Error("only supports base address, enterprise address");
  }

  export function fromPlutusData(
    networkId: NetworkId,
    data: Constr<DataType>
  ): string {
    switch (data.index) {
      case 0: {
        const paymentCredential = LucidCredential.fromPlutusData(
          data.fields[0] as Constr<DataType>
        );
        const maybeStakeCredentialConstr = data.fields[1] as Constr<DataType>;
        switch (maybeStakeCredentialConstr.index) {
          case 0: {
            // Base Address or Pointer Address
            const stakeCredentialConstr = maybeStakeCredentialConstr
              .fields[0] as Constr<DataType>;
            switch (stakeCredentialConstr.index) {
              case 0: {
                const stakeCredential = LucidCredential.fromPlutusData(
                  stakeCredentialConstr.fields[0] as Constr<DataType>
                );
                return Addresses.credentialToAddress(
                  (networkId === NetworkId.MAINNET ? "Mainnet" : "Preprod"),
                  paymentCredential,
                  stakeCredential
                )
              }
              case 1: {
                throw new Error(`Pointer Address has not been supported yet`);
              }
              default: {
                throw new Error(
                  `Index of StakeCredentail must be 0 or 1, actual: ${stakeCredentialConstr.index}`
                );
              }
            }
          }
          case 1: {
            return Addresses.credentialToAddress(
              (networkId === NetworkId.MAINNET ? "Mainnet" : "Preprod"),
              paymentCredential
            );
          }
          default: {
            throw new Error(
              `Index of Maybe Stake Credentail must be 0 or 1, actual: ${maybeStakeCredentialConstr.index}`
            );
          }
        }
      }
      default: {
        throw new Error(`Index of Address must be 0, actual: ${data.index}`);
      }
    }
  }
}
