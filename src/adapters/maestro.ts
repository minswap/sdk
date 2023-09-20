import {
    MaestroClient,
    Configuration
} from "@maestro-org/typescript-sdk"

import { POOL_NFT_POLICY_ID, POOL_SCRIPT_HASH } from "../constants";

export type MaestroAdapterOptions = {
    maestro: MaestroClient;
};

// export type GetPoolsParams = Omit<PaginationOptions, "page"> & {
//     page: number;
// };

export class MaestroAdapter {
    private readonly api: MaestroClient
    
    constructor({ maestro }: MaestroAdapterOptions) {
        this.api = maestro;
    }

    public async getPools() {
        const utxos = await this.api.addresses.utxosByAddress(POOL_SCRIPT_HASH)
    }

    public async getDatumByDatumHash(datumHash: string): Promise<string> {
        const scriptsDatum = await this.api.datum.lookupDatum(datumHash)
        return scriptsDatum.data.data.bytes
    }
}