import { NetworkId } from "./types";

const TIME_SLOT_MAGIC = {
  [NetworkId.TESTNET]: 1594369216,
  [NetworkId.MAINNET]: 1591566291,
};

export function slotToTime(networkId: NetworkId, slot: number): Date {
  return new Date((TIME_SLOT_MAGIC[networkId] + slot) * 1000);
}
