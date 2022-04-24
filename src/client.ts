import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { PaginationOptions } from "@blockfrost/blockfrost-js/lib/types";

import { POOL_ADDRESS } from "./constants";
import { isValidPoolUtxo, PoolState } from "./pool";
import { NetworkId } from "./types";

export type BlockfrostAdapterOptions = {
  projectId: string;
  networkId?: NetworkId;
};

export type GetPoolsParams = Omit<PaginationOptions, "page"> & {
  page: number;
};

export class BlockfrostAdapter {
  private readonly networkId: NetworkId;
  private readonly api: BlockFrostAPI;

  constructor({
    projectId,
    networkId = NetworkId.MAINNET,
  }: BlockfrostAdapterOptions) {
    this.networkId = networkId;
    this.api = new BlockFrostAPI({
      projectId,
      isTestnet: networkId === NetworkId.TESTNET,
    });
  }

  /**
   *
   * @returns The latest pools or empty array if current page is after last page
   */
  public async getPools({
    page,
    count = 100,
    order = "asc",
  }: GetPoolsParams): Promise<PoolState[]> {
    const utxos = await this.api.addressesUtxos(POOL_ADDRESS[this.networkId], {
      count,
      order,
      page,
    });
    return utxos.filter(isValidPoolUtxo).map((utxo) => new PoolState(utxo));
  }
}
