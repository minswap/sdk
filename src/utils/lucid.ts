import {
  Blockfrost,
  Lucid,
  Maestro,
  MaestroSupportedNetworks,
  Network,
} from "@spacebudz/lucid";

/**
 * Initialize Lucid Instance for Backend Environment
 * @param network Network you're working on
 * @param projectId Blockfrost API KEY
 * @param blockfrostUrl Blockfrost URL
 * @param address Your own address
 * @returns
 */
export async function getBackendLucidInstance(
  network: Network,
  projectId: string,
  blockfrostUrl: string,
  address: string,
): Promise<Lucid> {
  const provider = new Blockfrost(blockfrostUrl, projectId);
  const lucid = new Lucid({
    provider: provider,
    network: network,
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
