import { Network } from "@spacebudz/lucid";

import { NetworkEnvironment, SlotConfig } from "../types/network";

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

export const SLOT_CONFIG_NETWORK: Record<
  string,
  SlotConfig
> = {
  "Mainnet": { zeroTime: 1596059091000, zeroSlot: 4492800, slotLength: 1000 }, // Starting at Shelley era
  "Preview": { zeroTime: 1666656000000, zeroSlot: 0, slotLength: 1000 }, // Starting at Shelley era
  "Preprod": {
    zeroTime: 1654041600000 + 1728000000,
    zeroSlot: 86400,
    slotLength: 1000,
  },// Starting at Shelley era
  /** Customizable slot config (Initialized with 0 values). */
  "Custom": { zeroTime: 0, zeroSlot: 0, slotLength: 0 },
};

export function slotToBeginUnixTime(
  slot: number,
  network: Network,
): number {
  let slotConfig;
  if (network === "Mainnet" || network === "Preview" || network === "Preprod") {
    slotConfig = SLOT_CONFIG_NETWORK[network];
  } else {
    slotConfig = SLOT_CONFIG_NETWORK["Custom"];
  }

  const msAfterBegin = (slot - slotConfig.zeroSlot) * slotConfig.slotLength;
  return slotConfig.zeroTime + msAfterBegin;
}

// slotToBeginUnixTime and slotToEndUnixTime are identical when slotLength == 1. So we don't need to worry about this now.
// function slotToEndUnixTime(slot: Slot, slotConfig: SlotConfig): UnixTime {
//   return slotToBeginUnixTime(slot, slotConfig) + (slotConfig.slotLength - 1);
// }
