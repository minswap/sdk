# Minswap Blockfrost Adapter

## Features

- [x] Get current pair price
- [ ] Get historical pair price
- [ ] Calculate trade price and price impact
- [ ] Create orders and submit to Blockfrost

## Install

- NPM: `npm install @minswap/blockfrost-adapter`
- Yarn: `yarn add @minswap/blockfrost-adapter`

## Examples

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
