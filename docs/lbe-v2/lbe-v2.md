# LBE V2 Documentation

## Overview

This documentation provides guidelines for communicating with and interacting with the LBE V2 protocol. It includes creating, editing, and deleting events, creating, editing, and deleting orders, how the worker operates.

### Specification

[LBE Specification](./LBE%20Specification.pdf)

### Transaction Builder Function

- **LBEV2 Class**: class that creates transactions to interact with the LBE V2 protocol. It is located in src/lbe-v2/lbe-v2.ts.
- **User and project owner action Example**: Located in `example/example.ts`.
- **LBEV2Worker Class**: A class that executes off-chain actions when an event ends. It handles collecting funds to create a liquidity pool and distributing LP Assets to participants in the LBE. This class is located in `src/lbe-v2-worker/worker.ts`.
- **LBEV2Worker Example**: Located in `examples/lbe-v2-worker-example.ts`.

## Example Usage

### Create Event

```ts
const network: Network = "Preprod";
const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

const address =
  "addr_test1qqf2dhk96l2kq4xh2fkhwksv0h49vy9exw383eshppn863jereuqgh2zwxsedytve5gp9any9jwc5hz98sd47rwfv40stc26fr";
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

const baseAsset: Asset = {
  policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
  tokenName: "fdfc61f25b3065a310ba3e352159125910b947b7aee704728318949933127cdc",
};
const raiseAsset: Asset = {
  policyId: "",
  tokenName: "",
};
const curSlot = lucid.currentSlot();
const curDate = lucid.utils.slotToUnixTime(curSlot);
const lbeV2Parameters: LbeV2Types.LbeV2Parameters = {
  baseAsset: baseAsset,
  reserveBase: 100_000n,
  raiseAsset: raiseAsset,
  startTime: BigInt(curDate + ONE_HOUR_IN_MS),
  endTime: BigInt(curDate + 2 * ONE_HOUR_IN_MS),
  owner: address,
  receiver: address,
  poolAllocation: 100n,
  minimumOrderRaise: undefined,
  minimumRaise: 10_000_000n,
  maximumRaise: 100_000_000n,
  penaltyConfig: {
    penaltyStartTime: BigInt(curDate + ONE_HOUR_IN_MS + 20 * ONE_MINUTE_IN_MS),
    percent: 20n,
  },
  revocable: true,
  poolBaseFee: 30n,
};
const factory = await blockfrostAdapter.getLbeV2Factory(baseAsset, raiseAsset);
invariant(factory !== null, "Can not find factory");
const factoryUtxos = await lucid.utxosByOutRef([
  { outputIndex: factory.txIn.index, txHash: factory.txIn.txHash },
]);
invariant(factoryUtxos.length !== 0, "Can not find factory utxo");
const projectDetails = {
  eventName: "TEST SDK",
  description: "test lbe v2 in public sdk",
  socialLinks: {
    twitter: "https://x.com/MinswapDEX",
    telegram: "https://t.me/MinswapMafia",
    discord: "https://discord.gg/minswap",
    website: "https://minswap.org/",
  },
  tokenomics: [
    {
      tag: "admin",
      percentage: "70",
    },
    {
      tag: "LBE",
      percentage: "30",
    },
  ],
};
const currentSlot = await blockfrostAdapter.currentSlot();
const txComplete = await new LbeV2(lucid).createEvent({
  factoryUtxo: factoryUtxos[0],
  lbeV2Parameters: lbeV2Parameters,
  currentSlot: currentSlot,
  sellerOwner: address,
  sellerCount: 10,
  projectDetails: projectDetails,
});
const signedTx = await txComplete
  .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
  .complete();

const txId = await signedTx.submit();
console.info(`Transaction submitted successfully: ${txId}`);
```

### Create Order

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

const baseAsset: Asset = {
  policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
  tokenName: "fdfc61f25b3065a310ba3e352159125910b947b7aee704728318949933127cdc",
};
const raiseAsset: Asset = {
  policyId: "",
  tokenName: "",
};
const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
const treasury = await blockfrostAdapter.getLbeV2TreasuryByLbeId(lbeId);
invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
const treasuryUtxos = await lucid.utxosByOutRef([
  { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
]);
invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

const seller = await blockfrostAdapter.getLbeV2SellerByLbeId(lbeId);
invariant(seller !== null, `Can not find seller by lbeId ${lbeId}`);
const sellerUtxos = await lucid.utxosByOutRef([
  { txHash: seller.txIn.txHash, outputIndex: seller.txIn.index },
]);
invariant(sellerUtxos.length === 1, "Can not find seller Utxo");

const orders = await blockfrostAdapter.getLbeV2OrdersByLbeIdAndOwner(
  lbeId,
  address
);
const orderUtxos =
  orders.length > 0
    ? await lucid.utxosByOutRef(
        orders.map((o) => ({
          txHash: o.txIn.txHash,
          outputIndex: o.txIn.index,
        }))
      )
    : [];

invariant(
  orderUtxos.length === orders.length,
  "Can not find enough order Utxos"
);

const currentSlot = await blockfrostAdapter.currentSlot();
return new LbeV2(lucid).depositOrWithdrawOrder({
  currentSlot: currentSlot,
  existingOrderUtxos: orderUtxos,
  treasuryUtxo: treasuryUtxos[0],
  sellerUtxo: sellerUtxos[0],
  owner: address,
  action: { type: "deposit", additionalAmount: 1_000_000n },
});

const signedTx = await txComplete
  .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
  .complete();

const txId = await signedTx.submit();
console.info(`Transaction submitted successfully: ${txId}`);
```

### Add seller(Increase Concurrency Performance)

```ts
const network: Network = "Preprod";
const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

const address =
  "addr_test1qqf2dhk96l2kq4xh2fkhwksv0h49vy9exw383eshppn863jereuqgh2zwxsedytve5gp9any9jwc5hz98sd47rwfv40stc26fr";
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

const baseAsset: Asset = {
  policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
  tokenName: "fdfc61f25b3065a310ba3e352159125910b947b7aee704728318949933127cdc",
};
const raiseAsset: Asset = {
  policyId: "",
  tokenName: "",
};
const lbeId = PoolV2.computeLPAssetName(baseAsset, raiseAsset);
const treasury = await blockfrostAdapter.getLbeV2TreasuryByLbeId(lbeId);
invariant(treasury !== null, `Can not find treasury by lbeId ${lbeId}`);
const treasuryUtxos = await lucid.utxosByOutRef([
  { txHash: treasury.txIn.txHash, outputIndex: treasury.txIn.index },
]);
invariant(treasuryUtxos.length === 1, "Can not find treasury Utxo");

const manager = await blockfrostAdapter.getLbeV2ManagerByLbeId(lbeId);
invariant(manager !== null, `Can not find manager by lbeId ${lbeId}`);
const managerUtxos = await lucid.utxosByOutRef([
  { txHash: manager.txIn.txHash, outputIndex: manager.txIn.index },
]);
invariant(managerUtxos.length === 1, "Can not find manager Utxo");

const txComplete = await new LbeV2(lucid).addSellers({
  treasuryUtxo: treasuryUtxos[0],
  managerUtxo: managerUtxos[0],
  addSellerCount: 2,
  sellerOwner: address,
  currentSlot: await blockfrostAdapter.currentSlot(),
});
const signedTx = await txComplete
  .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
  .complete();

const txId = await signedTx.submit();
console.info(`Transaction submitted successfully: ${txId}`);
```

### Run LBE V2 Worker

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

const worker = new LbeV2Worker({
  networkEnv: NetworkEnvironment.TESTNET_PREPROD,
  networkId: NetworkId.TESTNET,
  lucid,
  blockfrostAdapter,
  privateKey: "<YOUR_PRIVATE_KEY>",
});

await worker.start();
```
