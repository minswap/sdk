import { Network } from "lucid-cardano";

import { NetworkEnvironment } from "../types/network";

export function lucidToNetworkEnv(network: Network): NetworkEnvironment {
  if (network === "Mainnet") {
    return NetworkEnvironment.MAINNET;
  } else if (network === "Preprod") {
    return NetworkEnvironment.TESTNET_PREPROD;
  } else if (network === "Preview") {
    return NetworkEnvironment.TESTNET_PREVIEW;
  }
  throw new Error("Not supported");
}
