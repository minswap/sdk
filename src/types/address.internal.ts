import {
  Address,
  C,
  Constr,
  Credential,
  Data,
  getAddressDetails,
} from "@minswap/lucid-cardano";
import invariant from "@minswap/tiny-invariant";

import { NetworkId } from "./network";

export namespace LucidCredential {
  export function toPlutusData(data: Credential): Constr<Data> {
    const constructor = data.type === "Key" ? 0 : 1;
    return new Constr(constructor, [data.hash]);
  }

  export function fromPlutusData(data: Constr<Data>): Credential {
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

  export function toCSLStakeCredential(
    credential: Credential
  ): C.StakeCredential {
    switch (credential.type) {
      case "Key": {
        return C.StakeCredential.from_keyhash(
          C.Ed25519KeyHash.from_hex(credential.hash)
        );
      }
      case "Script": {
        return C.StakeCredential.from_scripthash(
          C.ScriptHash.from_hex(credential.hash)
        );
      }
    }
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

  export function fromPlutusData(
    networkId: NetworkId,
    data: Constr<Data>
  ): Address {
    switch (data.index) {
      case 0: {
        const paymentCredential = LucidCredential.fromPlutusData(
          data.fields[0] as Constr<Data>
        );
        const cslPaymentCredential =
          LucidCredential.toCSLStakeCredential(paymentCredential);
        const maybeStakeCredentialConstr = data.fields[1] as Constr<Data>;
        switch (maybeStakeCredentialConstr.index) {
          case 0: {
            // Base Address or Pointer Address
            const stakeCredentialConstr = maybeStakeCredentialConstr
              .fields[0] as Constr<Data>;
            switch (stakeCredentialConstr.index) {
              case 0: {
                const stakeCredential = LucidCredential.fromPlutusData(
                  stakeCredentialConstr.fields[0] as Constr<Data>
                );
                const cslStakeCredential =
                  LucidCredential.toCSLStakeCredential(stakeCredential);
                const cslAddress = C.BaseAddress.new(
                  networkId,
                  cslPaymentCredential,
                  cslStakeCredential
                ).to_address();
                return cslAddress.to_bech32(undefined);
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
            // Enterprise Address
            const cslAddress = C.EnterpriseAddress.new(
              networkId,
              cslPaymentCredential
            ).to_address();
            return cslAddress.to_bech32(undefined);
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
