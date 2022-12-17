# Minswap Blockfrost Adapter

## Features

- [x] Get current pair price
- [x] Get historical pair price
- [x] Calculate trade price
- [ ] Calculate price impact
- [ ] Create orders and submit to Blockfrost

## Install

- NPM: `npm install @minswap/blockfrost-adapter`
- Yarn: `yarn add @minswap/blockfrost-adapter`

## Examples

### Example 1: Get current price of MIN/ADA pool

```ts
import { BlockfrostAdapter, NetworkId } from "@minswap/blockfrost-adapter";

const api = new BlockfrostAdapter({
  projectId: "<your_project_id>",
  networkId: NetworkId.MAINNET,
});
for (let i = 1; ; i++) {
  const pools = await api.getPools({ page: i });
  if (pools.length === 0) {
    // last page
    break;
  }
  const minADAPool = pools.find(
    (p) =>
      p.assetA === "lovelace" &&
      p.assetB ===
        "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e"
  );
  if (minADAPool) {
    const [a, b] = await api.getPoolPrice({ pool: minADAPool });
    console.log(
      `ADA/MIN price: ${a.toString()}; MIN/ADA price: ${b.toString()}`
    );
    // we can later use this ID to call getPoolById
    console.log(`ADA/MIN pool ID: ${minADAPool.id}`);
    break;
  }
}
```

### Example 2: Get historical prices of MIN/ADA pool

```ts
import { BlockfrostAdapter, NetworkId } from "@minswap/blockfrost-adapter";

const MIN_ADA_POOL_ID =
  "6aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2";

const api = new BlockfrostAdapter({
  projectId: "<your_project_id>",
  networkId: NetworkId.MAINNET,
});
const history = await api.getPoolHistory({ id: MIN_ADA_POOL_ID });
for (const historyPoint of history) {
  const pool = await api.getPoolInTx({ txHash: historyPoint.txHash });
  if (!pool) {
    throw new Error("pool not found");
  }
  const [price0, price1] = await api.getPoolPrice({
    pool,
    decimalsA: 6,
    decimalsB: 6,
  });
  console.log(`${historyPoint.time}: ${price0} ADA/MIN, ${price1} MIN/ADA`);
}
```
