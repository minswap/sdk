import { Address, Blockfrost, Lucid, Network } from "lucid-cardano";
import { Asset } from "../src";

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
  address: Address
): Promise<Lucid> {
  const provider = new Blockfrost(blockfrostUrl, projectId);
  const lucid = await Lucid.new(provider, network);
  lucid.selectWalletFrom({
    address: address,
  });
  return lucid;
}

export function getMinToken(network: Network): Asset {
  switch (network) {
    case "Mainnet": {
      return {
        policyId: "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6",
        tokenName: "4d494e",
      };
    }
    case "Preview":
    case "Preprod": {
      return {
        policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
        tokenName: "4d494e",
      };
    }
    default: {
      throw Error("Not Support");
    }
  }
}

export function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Env not found ${key}`);
  }
  return val;
}
