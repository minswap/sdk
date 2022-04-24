import { Responses } from "@blockfrost/blockfrost-js";

export enum NetworkId {
  TESTNET = 0,
  MAINNET,
}

export type Utxo = Responses["address_utxo_content"][number];
