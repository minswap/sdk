import { MaestroClient, Configuration } from '@maestro-org/typescript-sdk';
import { Network } from '@minswap/lucid-cardano';
import { getBackendMasestroLucidInstance } from '../src/utils/lucid';
import { MaestroAdapter } from '../src/adapters/maestro';
import { NetworkId } from '../src';

async function main(): Promise<void> {
  const cardanoNetwork: Network = 'Preprod';
  const maestroApiKey = '<YOUR_MAESTRO_API_KEY>';

  const address =
    'addr_test1qqf2dhk96l2kq4xh2fkhwksv0h49vy9exw383eshppn863jereuqgh2zwxsedytve5gp9any9jwc5hz98sd47rwfv40stc26fr';

  const lucid = await getBackendMasestroLucidInstance(
    cardanoNetwork,
    maestroApiKey,
    address,
  );

  const maestroClient = new MaestroClient(
    new Configuration({
      apiKey: maestroApiKey,
      network: cardanoNetwork,
    }),
  );

  const maestroAdapter = new MaestroAdapter(NetworkId.TESTNET, maestroClient);

  // TODO
}
