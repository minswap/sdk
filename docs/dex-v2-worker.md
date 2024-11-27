# LBE V2 Documentation

## Overview

This documentation provides guidelines for tracking and canceling expired AMM V2 orders. Every 30 seconds, the service checks and cancels expired orders.

### Transaction Builder Function

- **DexV2Worker Class**: Located in `src/dex-v2-worker.ts`.
- **DexV2Worker Example**: Located in `examples/dex-v2-worker-example.ts`.

## Example Usage

### Run Worker Example

```ts
const network: Network = "Preprod";
const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

const address = "<YOUR_ADDRESS>";
const lucid = await getBackendLucidInstance(
  network,
  blockfrostProjectId,
  blockfrostUrl,
  address
);

const blockfrostAdapter = new BlockfrostAdapter(
  NetworkId.TESTNET,
  new BlockFrostAPI({
    projectId: blockfrostProjectId,
    network: "preprod",
  })
);

const worker = new DexV2Worker({
  lucid,
  blockfrostAdapter,
  privateKey: "<YOUR_PRIVATE_KEY>",
});

await worker.start();
```
