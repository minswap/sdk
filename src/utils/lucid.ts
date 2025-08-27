import {
  Blockfrost,
  Lucid,
  Maestro,
  MaestroSupportedNetworks,
  Network,
} from "@spacebudz/lucid";

/**
 * Options for initializing Lucid Instance for Backend Environment
 */
export interface BackendBlockfrostLucidOptions {
  network: Network;
  projectId: string;
  blockfrostUrl: string;
  address: string;
}

/**
 * Initialize Lucid Instance for Backend Environment
 * @param options Configuration options
 * @returns
 */
export async function getBackendBlockfrostLucidInstance(
  options: BackendBlockfrostLucidOptions,
): Promise<Lucid> {
  const { network, projectId, blockfrostUrl, address } = options;
  const provider = new Blockfrost(blockfrostUrl, projectId);
  const lucid = new Lucid({
    provider: provider,
    network,
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
