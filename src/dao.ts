import invariant from "@minswap/tiny-invariant";
import { Lucid, TxComplete } from "@spacebudz/lucid";
import JSONBig from "json-bigint";

import { Asset } from "./types/asset";
import { DexV2Constant, MetadataMessage } from "./types/constants";
import { NetworkId } from "./types/network";

/**
 * Request to update the trading fees for a liquidity pool.
 * @property managerAddress - The address of the pool manager authorized to update fees
 * @property poolLPAsset - The LP token asset identifying the pool
 * @property newFeeA - The new fee for trading direction A as a percentage (0.05% - 20%)
 * @property newFeeB - The new fee for trading direction B as a percentage (0.05% - 20%)
 * @property version - Protocol version for the fee request format
 */
export type PoolFeeRequest = {
  managerAddress: string;
  poolLPAsset: Asset;
  newFeeA: number;
  newFeeB: number;
  version: "1";
};

export type RequestPoolFeeOptions = {
  request: Omit<PoolFeeRequest, "version">;
};

export class Dao {
  private readonly lucid: Lucid;
  private readonly networkId: NetworkId;

  constructor(lucid: Lucid) {
    this.lucid = lucid;
    this.networkId =
      lucid.network === "Mainnet" ? NetworkId.MAINNET : NetworkId.TESTNET;
  }

  /**
   * Creates a transaction to update the trading fees for a liquidity pool.
   * This method builds a transaction with metadata that requests fee changes for a pool.
   * The transaction must be signed by the pool manager address.
   */
  async updatePoolFeeTx(
    options: Omit<PoolFeeRequest, "version">
  ): Promise<TxComplete> {
    const { managerAddress, poolLPAsset, newFeeA, newFeeB } = options;
    const newFeeABps = BigInt(Math.floor(newFeeA * 10000));
    const newFeeBBps = BigInt(Math.floor(newFeeB * 10000));

    invariant(
      newFeeABps >= DexV2Constant.MIN_TRADING_FEE &&
        newFeeABps <= DexV2Constant.MAX_TRADING_FEE,
      `Liquidity Pool Fee A must be in 0.05% - 20%, actual: ${newFeeA}%`
    );
    invariant(
      newFeeBBps >= DexV2Constant.MIN_TRADING_FEE &&
        newFeeBBps <= DexV2Constant.MAX_TRADING_FEE,
      `Liquidity Pool Fee B must be in 0.05% - 20%, actual: ${newFeeB}%`
    );
    const v2Configs = DexV2Constant.CONFIG[this.networkId];
    invariant(
      poolLPAsset.policyId === v2Configs.lpPolicyId,
      `invalid Pool LP Token ${poolLPAsset}`
    );

    const feeRequestJSON = JSONBig.stringify({
      managerAddress: managerAddress,
      poolLPAsset: Asset.toDottedString(poolLPAsset),
      newFeeA: newFeeABps.toString(),
      newFeeB: newFeeBBps.toString(),
      version: "1",
    }).match(/.{1,64}/g);

    return this.lucid
      .newTx()
      .addSigner(managerAddress)
      .attachMetadata(674, {
        msg: [MetadataMessage.DAO_POOL_FEE_UPDATE],
        extraData: feeRequestJSON,
      })
      .commit();
  }
}
