import { BlockfrostAdapter, NetworkId } from ".";

function mustGetEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`${key} not found`);
  }
  return val;
}

const adapter = new BlockfrostAdapter({
  projectId: mustGetEnv("BLOCKFROST_PROJECT_ID_MAINNET"),
  networkId: NetworkId.MAINNET,
});

it("getPoolPrice", async () => {
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
