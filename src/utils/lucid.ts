import {
  Address,
  Blockfrost,
  Lucid,
  Maestro,
  MaestroSupportedNetworks,
  Network,
} from "@minswap/lucid-cardano";

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
  address: Address,
): Promise<Lucid> {
  const provider = new Blockfrost(blockfrostUrl, projectId);
  const lucid = await Lucid.new(provider, network);
  lucid.selectWalletFrom({
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
export async function getBackendMasestroLucidInstance(
  network: MaestroSupportedNetworks,
  apiKey: string,
  address: Address,
): Promise<Lucid> {
  const provider = new Maestro({
    network: network,
    apiKey: apiKey,
  });
  const lucid = await Lucid.new(provider, network);
  lucid.selectWalletFrom({
    address: address,
  });
  return lucid;
}
