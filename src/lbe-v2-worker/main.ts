import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Address, Blockfrost, Lucid, Network } from "lucid-cardano";

import { BlockfrostAdapter, NetworkId } from "../../src";
import { NetworkEnvironment } from "../types/network";
import { LbeV2Worker } from "./worker";

async function main(): Promise<void> {
  const network: Network = "Preprod";
  const blockfrostProjectId = "preprodSj4PM4LDOTa2BbfAY4XIEqASI9gKzOEz";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const address =
    "addr_test1qqf2dhk96l2kq4xh2fkhwksv0h49vy9exw383eshppn863jereuqgh2zwxsedytve5gp9any9jwc5hz98sd47rwfv40stc26fr";
  const lucid = await getBackendLucidInstance(
    network,
    blockfrostProjectId,
    blockfrostUrl,
    address
  );

  const blockfrostAdapter = new BlockfrostAdapter(
    NetworkId.TESTNET,
    new BlockFrostAPI({
      projectId: blockfrostProjectId,
      network: "preprod",
    })
  );

  const worker = new LbeV2Worker({
    networkEnv: NetworkEnvironment.TESTNET_PREPROD,
    networkId: NetworkId.TESTNET,
    lucid,
    blockfrostAdapter,
    privateKey:
      "ed25519e_sk1pqs6ssazw755demuks2974mdwu6stz0uxpj543edm5cm0y96p9gk9lcv5jspdg3aq7wtv9r96uaru0rnu4qdm7lccarntjm22mtk72cm5cjrj",
  });

  await worker.start();
}

/**
 * Initialize Lucid Instance for Backend Environment
 * @param network Network you're working on
 * @param projectId Blockfrost API KEY
 * @param blockfrostUrl Blockfrost URL
 * @param address Your own address
 * @returns
 */
async function getBackendLucidInstance(
  network: Network,
  projectId: string,
  blockfrostUrl: string,
  address: Address
): Promise<Lucid> {
  const provider = new Blockfrost(blockfrostUrl, projectId);
  const lucid = await Lucid.new(provider, network);
  lucid.selectWalletFrom({
    address: address,
  });
  return lucid;
}

void main();
