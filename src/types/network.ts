import { DexV2Constant } from "..";

export enum NetworkId {
  TESTNET = 0,
  MAINNET,
}

export enum NetworkEnvironment {
  MAINNET = 764824073,
  TESTNET_PREVIEW = 2,
  TESTNET_PREPROD = 1,
}

export type SlotConfig = {
  zeroTime: number;
  zeroSlot: number;
  slotLength: number;
};

let defaultNetworkEnvironment: NetworkEnvironment = NetworkEnvironment.MAINNET;

export function setDefaultNetworkEnvironment(a: NetworkEnvironment): void {
  defaultNetworkEnvironment = a;
  if (networkEnvironmentToNetworkID(a) === NetworkId.TESTNET) {
    DexV2Constant.setTestnetConfig(a);
  }
}

export function getDefaultNetworkEnvironment(): NetworkEnvironment {
  return defaultNetworkEnvironment;
}

export function networkEnvironmentToNetworkID(env: NetworkEnvironment): NetworkId {
  switch (env) {
    case NetworkEnvironment.MAINNET:
      return NetworkId.MAINNET;
    case NetworkEnvironment.TESTNET_PREPROD:
    case NetworkEnvironment.TESTNET_PREVIEW:
      return NetworkId.TESTNET;
  }
}
