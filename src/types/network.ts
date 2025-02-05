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