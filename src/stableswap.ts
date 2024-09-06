import { Address, Lucid, Network, Tx, TxComplete, UTxO } from "lucid-cardano";

import { Asset } from "./types/asset";
import { NetworkId } from "./types/network";

export type CommonOrderOptions = {
  sender: Address;
  availableUtxos: UTxO[];
  lpAsset: Asset;
};

export type ExchangeOptions = CommonOrderOptions & {
  assetIn: Asset;
  assetInAmount: bigint;
  assetInIndex: bigint;
  assetOutIndex: bigint;
  minimumAssetOut: bigint;
};
export class Stableswap {
  private readonly lucid: Lucid;
  private readonly network: Network;
  private readonly networkId: NetworkId;

  constructor(lucid: Lucid) {
    this.lucid = lucid;
    this.network = lucid.network;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
  }

  async buildExchangeOrderTx(options: ExchangeOptions): Promise<TxComplete>{

  }
}
