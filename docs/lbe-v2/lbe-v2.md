# LBE V2 Documentation

## Overview

This documentation provides guidelines for communicating with and interacting with the LBE V2 protocol. It includes creating, editing, and deleting events, creating, editing, and deleting orders, how the worker operates.

### Specification

[LBE Specification](./LBE%20Specification.pdf)

### Transaction Builder Function

- **LBEV2 Class**: Located in `src/lbe-v2/lbe-v2.ts`.
- **User and project owner action Example**: Located in `example/example.ts`.
- **LBEV2Worker Class**: Located in `src/lbe-v2-worker/worker.ts`.
- **LBEV2Worker Example**: Located in `examples/lbe-v2-worker-example.ts`.

## Example Usage

### **Create Order**

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

const lbeId = "<LBE_ID>";
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

### **Run Worker**

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
