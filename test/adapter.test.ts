import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Configuration, MaestroClient } from "@maestro-org/typescript-sdk";
import { Network } from "@spacebudz/lucid";

import {
  ADA,
  Adapter,
  Asset,
  BlockfrostAdapter,
  MaestroAdapter,
  NetworkId,
  StableswapConstant
} from "../src";

function mustGetEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`${key} not found`);
  }
  return val;
}

const MIN_TESTNET =
  "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e";
const MIN_MAINNET =
  "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e";
const MIN_ADA_POOL_V1_ID_TESTNET =
  "3bb0079303c57812462dec9de8fb867cef8fd3768de7f12c77f6f0dd80381d0d";
const MIN_ADA_POOL_V1_ID_MAINNET =
  "6aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2";

function getBlockfrostAdapters(): [Adapter, Adapter] {
  const blockfrostAdapterTestnet = new BlockfrostAdapter(
    NetworkId.TESTNET,
    new BlockFrostAPI({
      projectId: mustGetEnv("BLOCKFROST_PROJECT_ID_TESTNET"),
      network: "preprod",
    })
  );
  const blockfrostAdapterMainnet = new BlockfrostAdapter(
    NetworkId.MAINNET,
    new BlockFrostAPI({
      projectId: mustGetEnv("BLOCKFROST_PROJECT_ID_MAINNET"),
      network: "mainnet",
    })
  );
  return [blockfrostAdapterTestnet, blockfrostAdapterMainnet];
}

function getMaestroAdapters(): [Adapter, Adapter] {
  const cardanoNetworkPreprod: Network = "Preprod";
  const maestroAdapterTestnet = new MaestroAdapter(
    NetworkId.TESTNET,
    new MaestroClient(
      new Configuration({
        apiKey: mustGetEnv("MAESTRO_API_KEY_TESTNET"),
        network: cardanoNetworkPreprod,
      })
    )
  );
  const cardanoNetworkMainnet: Network = "Mainnet";
  const maestroAdapterMainnet = new MaestroAdapter(
    NetworkId.MAINNET,
    new MaestroClient(
      new Configuration({
        apiKey: mustGetEnv("MAESTRO_API_KEY_MAINNET"),
        network: cardanoNetworkMainnet,
      })
    )
  );
  return [maestroAdapterTestnet, maestroAdapterMainnet];
}

describe.each([
  ["Blockfrost", ...getBlockfrostAdapters()],
  ["Maestro", ...getMaestroAdapters()],
])("Run test with %s adapter", (_name, adapterTestnet, adapterMainnet) => {
  test("getAssetDecimals", async () => {
    expect(await adapterTestnet.getAssetDecimals("lovelace")).toBe(6);
    expect(await adapterTestnet.getAssetDecimals(MIN_TESTNET)).toBe(0);
    expect(await adapterMainnet.getAssetDecimals("lovelace")).toBe(6);
    expect(await adapterMainnet.getAssetDecimals(MIN_MAINNET)).toBe(6);
  });

  async function testPoolPrice(adapter: Adapter): Promise<void> {
    const pools = await adapter.getV1Pools({});
    expect(pools.length).toBeGreaterThan(0);
    // check random 5 pools
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * pools.length);
      const pool = pools[idx];
      const [priceAB, priceBA] = await adapter.getV1PoolPrice({ pool });
      // product of 2 prices must be approximately equal to 1
      // abs(priceAB * priceBA - 1) <= epsilon
      expect(priceAB.mul(priceBA).sub(1).abs().toNumber()).toBeLessThanOrEqual(
        1e-6
      );
    }
  }

  test("getPoolPrice", async () => {
    await testPoolPrice(adapterTestnet);
    await testPoolPrice(adapterMainnet);
  }, 10000);

  test("getV1PoolById", async () => {
    const adaMINTestnet = await adapterTestnet.getV1PoolById({
      id: MIN_ADA_POOL_V1_ID_TESTNET,
    });
    expect(adaMINTestnet).not.toBeNull();
    expect(adaMINTestnet?.assetA).toEqual("lovelace");
    expect(adaMINTestnet?.assetB).toEqual(MIN_TESTNET);

    const adaMINMainnet = await adapterMainnet.getV1PoolById({
      id: MIN_ADA_POOL_V1_ID_MAINNET,
    });
    expect(adaMINMainnet).not.toBeNull();
    expect(adaMINMainnet?.assetA).toEqual("lovelace");
    expect(adaMINMainnet?.assetB).toEqual(MIN_MAINNET);
  });

  async function testPriceHistory(adapter: Adapter, id: string): Promise<void> {
    const history = await adapter.getV1PoolHistory({}, { id });
    for (let i = 0; i < Math.min(5, history.length); i++) {
      const pool = await adapter.getV1PoolInTx({ txHash: history[i].txHash });
      expect(pool?.txIn.txHash).toEqual(history[i].txHash);
    }
  }

  test("get prices of last 5 states of MIN/ADA pool", async () => {
    await testPriceHistory(adapterTestnet, MIN_ADA_POOL_V1_ID_TESTNET);
    await testPriceHistory(adapterMainnet, MIN_ADA_POOL_V1_ID_MAINNET);
  });

  test("getV2PoolByPair", async () => {
    const pool = await adapterTestnet.getV2PoolByPair(ADA, {
      policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
      tokenName: "4d494e",
    });
    expect(pool).not.toBeNull();
    expect(pool?.assetA).toEqual("lovelace");
    expect(pool?.assetB).toEqual(MIN_TESTNET);
  });

  test("getAllV2Pools", async () => {
    const { pools } = await adapterTestnet.getAllV2Pools();
    expect(pools.length > 0);
  });

  test("getV2Pools", async () => {
    const { pools } = await adapterTestnet.getV2Pools({ page: 1 });
    expect(pools.length > 0);
  });

  test("getAllStablePools", async () => {
    const numberOfStablePoolsTestnet =
      StableswapConstant.CONFIG[NetworkId.TESTNET].length;
    const numberOfStablePoolsMainnet =
      StableswapConstant.CONFIG[NetworkId.MAINNET].length;
    const { pools: testnetPools } = await adapterTestnet.getAllStablePools();
    expect(testnetPools.length === numberOfStablePoolsTestnet);

    const { pools: mainnetPools } = await adapterMainnet.getAllStablePools();
    expect(mainnetPools.length === numberOfStablePoolsMainnet);
  });

  test("getStablePoolByLPAsset", async () => {
    const testnetCfgs = StableswapConstant.CONFIG[NetworkId.TESTNET];
    const mainnetCfgs = StableswapConstant.CONFIG[NetworkId.MAINNET];

    for (const cfg of testnetCfgs) {
      const pool = await adapterTestnet.getStablePoolByLpAsset(
        Asset.fromString(cfg.lpAsset)
      );
      expect(pool).not.toBeNull();
      expect(pool?.nft).toEqual(cfg.nftAsset);
      expect(pool?.assets).toEqual(cfg.assets);
    }

    for (const cfg of mainnetCfgs) {
      const pool = await adapterMainnet.getStablePoolByLpAsset(
        Asset.fromString(cfg.lpAsset)
      );
      expect(pool).not.toBeNull();
      expect(pool?.nft).toEqual(cfg.nftAsset);
      expect(pool?.assets).toEqual(cfg.assets);
    }
  });

  test("getStablePoolByNFT", async () => {
    const testnetCfgs = StableswapConstant.CONFIG[NetworkId.TESTNET];
    const mainnetCfgs = StableswapConstant.CONFIG[NetworkId.MAINNET];

    for (const cfg of testnetCfgs) {
      const pool = await adapterTestnet.getStablePoolByNFT(
        Asset.fromString(cfg.nftAsset)
      );
      expect(pool).not.toBeNull();
      expect(pool?.nft).toEqual(cfg.nftAsset);
      expect(pool?.assets).toEqual(cfg.assets);
    }

    for (const cfg of mainnetCfgs) {
      const pool = await adapterMainnet.getStablePoolByNFT(
        Asset.fromString(cfg.nftAsset)
      );
      expect(pool).not.toBeNull();
      expect(pool?.nft).toEqual(cfg.nftAsset);
      expect(pool?.assets).toEqual(cfg.assets);
    }
  });
});
