import invariant from "@minswap/tiny-invariant";

import { BlockfrostAdapter, NetworkId } from ".";

function mustGetEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`${key} not found`);
  }
  return val;
}

const MIN = "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e";
const MIN_ADA_POOL_ID =
  "6aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2";

const adapter = new BlockfrostAdapter({
  projectId: mustGetEnv("BLOCKFROST_PROJECT_ID_MAINNET"),
  networkId: NetworkId.MAINNET,
});

beforeAll(() => {
  jest.setTimeout(30_000);
});

test("getAssetDecimals", async () => {
  expect(await adapter.getAssetDecimals("lovelace")).toBe(6);
  expect(await adapter.getAssetDecimals(MIN)).toBe(6);
});

test("getPoolPrice", async () => {
  const pools = await adapter.getPools({ page: 1 });
  // check random 5 pools
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * pools.length);
    const pool = pools[idx];
    const [priceAB, priceBA] = await adapter.getPoolPrice({ pool });
    // product of 2 prices must be approximately equal to 1
    // abs(priceAB * priceBA - 1) <= epsilon
    expect(priceAB.mul(priceBA).sub(1).abs().toNumber()).toBeLessThanOrEqual(
      1e-6
    );
  }
});

test("getPoolById", async () => {
  const pool = await adapter.getPoolById({ id: MIN_ADA_POOL_ID });
  expect(pool).not.toBeNull();
  expect(pool?.assetA).toEqual("lovelace");
  expect(pool?.assetB).toEqual(MIN);
});

test("get prices of last 5 states of MIN/ADA pool", async () => {
  const history = await adapter.getPoolHistory({ id: MIN_ADA_POOL_ID });
  for (let i = 0; i < Math.min(5, history.length); i++) {
    const pool = await adapter.getPoolInTx({ txHash: history[i].txHash });
    expect(pool?.txIn.txHash).toEqual(history[i].txHash);
  }
});

test("get trade amount and price impact", async () => {
  const pool = await adapter.getPoolById({ id: MIN_ADA_POOL_ID });
  invariant(pool);
  pool.getAmountOut("lovelace", 1_000_000n);
  pool.getAmountOut(MIN, 1_000_000n);
  pool.getAmountIn("lovelace", 1_000_000n);
  pool.getAmountIn(MIN, 1_000_000n);
});
