import { BlockfrostAdapter, NetworkId } from ".";

const MIN_ADA_POOL_ID =
  "6aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2";

async function main(): Promise<void> {
  const api = new BlockfrostAdapter({
    projectId: "???",
    networkId: NetworkId.MAINNET,
  });
  const pool = await api.getPoolById({ id: MIN_ADA_POOL_ID });
  if (!pool) {
    throw new Error("pool not found");
  }
  const adaAmount = 1_000_000_000n;
  const { amountOut: minAmount } = pool.getAmountOut("lovelace", adaAmount);
  console.log(
    `the MIN amount we get if we swap from 1000 ADA: ${Number(minAmount) / 1e6}`
  );

  // price impact is just the ratio between current price and actual swap price
  const currentPrice = Number(pool.reserveA) / Number(pool.reserveB);
  const swapPrice = Number(adaAmount) / Number(minAmount);
  const priceImpact = ((currentPrice - swapPrice) / currentPrice) * 100;
  console.log(currentPrice);
  console.log(swapPrice);
  console.log(`price impact is ${priceImpact}%`);
}

void main();
