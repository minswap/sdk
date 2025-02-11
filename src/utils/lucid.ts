import {
  Blockfrost,
  Lucid,
  Maestro,
  MaestroSupportedNetworks,
} from "@spacebudz/lucid";

import { NetworkId } from "../types/network";

/**
 * Initialize Lucid Instance for Backend Environment
 * @param network Network you're working on
 * @param projectId Blockfrost API KEY
 * @param blockfrostUrl Blockfrost URL
 * @param address Your own address
 * @returns
 */
export async function getBackendBlockfrostLucidInstance(
  networkId: NetworkId,
  projectId: string,
  blockfrostUrl: string,
  address: string,
): Promise<Lucid> {
  const provider = new Blockfrost(blockfrostUrl, projectId);
  const lucid = new Lucid({
    provider: provider,
    network: networkId === NetworkId.MAINNET ? 'Mainnet' : 'Preprod',
  });
  lucid.selectReadOnlyWallet({
    address: address,
  });
  return lucid;
}

/**
 * Initialize Lucid Maestro Instance for Backend Environment
 * @param network Network you're working on
 * @param apiKey Maestro API KEY
 * @param address Your own address
 * @returns
 */
export async function getBackendMaestroLucidInstance(
  network: MaestroSupportedNetworks,
  apiKey: string,
  address: string,
): Promise<Lucid> {
  const provider = new Maestro({
    network: network,
    apiKey: apiKey,
  });
  const lucid = new Lucid({
    provider: provider,
    network: network,
  });
  lucid.selectReadOnlyWallet({
    address: address,
  });
  return lucid;
}
