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

export function networkEnvToLucidNetwork(networkEnv: NetworkEnvironment): Network {
  switch (networkEnv) {
    case NetworkEnvironment.MAINNET: {
      return "Mainnet"
    }
    case NetworkEnvironment.TESTNET_PREPROD: {
      return "Preprod"
    }
    case NetworkEnvironment.TESTNET_PREVIEW: {
      return "Preview"
    }
  }
}

export function parseEnvironment(s: string): NetworkEnvironment {
  switch (s) {
    case "mainnet":
      return NetworkEnvironment.MAINNET;
    case "testnet-preview":
      return NetworkEnvironment.TESTNET_PREVIEW;
    case "testnet-preprod":
      return NetworkEnvironment.TESTNET_PREPROD;
    default:
      throw new Error(`Unexpected environment ${s}`);
  }
}
