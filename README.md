# Minswap SDK

The Minswap open-source project provides a comprehensive suite of off-chain tools, including price feeds, historical data storage, and integration methods for Stableswap, AMM V1, AMM V2, and LBE V2.

- See the [Minswap Example](https://github.com/minswap/sdk-example) for a demonstration of how to use the SDK.
- For additional transaction-building examples, refer to the `examples/` directory in this repository.

## Features

- [x] Pool price feed
- [x] Historical data of pool
- [x] Calculate trade price
- [x] Calculate price impact
- [x] Create orders and submit with Lucid
- [x] Syncer to sync minswap's liquidity pool data

We provide multiple adapters to get the price and liquidity pool information.

- `BlockfrostAdapter`: use [Blockfrost](https://blockfrost.dev) to query the data.
- `MinswapAdapter`: use Syncer to query the data. If you want to use `MinswapAdapter` you need to run syncer by yourself.
- `MaestroAdapter`: use [Maestro](https://www.gomaestro.org/) to query the data.

## Install

- NPM: `npm install @minswap/sdk`
- Yarn: `yarn add @minswap/sdk`

## ES Module Requirement

This package depends on `@spacebudz/lucid`, which is an ESM package, so it's also an ESM package. To import from ESM package, you need to specify `"type": "module"` in `package.json` and configure other build flags accordingly.
Also, `--experimental-wasm-modules` flag needs to be set in Node.js and `@jsr:registry=https://npm.jsr.io` needs to be added to `.npmrc` file.

## Examples

Create an adapter using either `BlockfrostAdapter` or `MinswapAdapter`:

### BlockfrostAdapter:

```ts
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { BlockfrostAdapter, NetworkId } from "@minswap/sdk";

const blockFrostApi = new BlockFrostAPI({
  projectId: "<your_project_id>",
  network: "mainnet",
});

const blockfrostAdapter = new BlockfrostAdapter(
  NetworkId.MAINNET,
  blockFrostApi
);
```

### MinswapAdapter:

- [Install docker compose](https://docs.docker.com/compose/install).
- Update the `.env` file to specify the exact network you want to sync.
- Run the command: `docker compose -f docker-compose.yaml up --build -d` to build.
- Run the command: `docker compose -f docker-compose.yaml logs -f` to view log.

```ts
import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import {
  BlockfrostAdapter,
  MinswapAdapter,
  NetworkEnvironment,
  NetworkId,
  newPrismaClient,
  PostgresRepositoryReader,
} from "@minswap/sdk";

const blockFrostApi = new BlockFrostAPI({
  projectId: "<your_project_id>",
  network: "mainnet",
});

const prismaClient = await newPrismaClient(
  "postgresql://postgres:minswap@postgres:5432/syncer?schema=public&connection_limit=5"
);

const repositoryReader = new PostgresRepositoryReader(
  NetworkEnvironment.MAINNET,
  prismaClient
);

const minswapAdapter = new MinswapAdapter({
  networkId: NetworkId.MAINNET,
  networkEnv: NetworkEnvironment.MAINNET,
  blockFrostApi: blockFrostApi,
  repository: repositoryReader,
});
```

### Maestro Adapter:

```ts
import { MaestroAdapter } from "@minswap/sdk";
import { MaestroClient, Configuration } from "@maestro-org/typescript-sdk";

const maestroClient = new MaestroClient(
  new Configuration({
    apiKey: maestroApiKey,
    network: cardanoNetwork,
  })
);

const maestroAdapter = new MaestroAdapter(NetworkId.TESTNET, maestroClient);
```

### Example 1: Get current price of MIN/ADA pool

#### MIN/ADA pool v1:

```ts
for (let i = 1; ; i++) {
  const pools = await adapter.getV1Pools({
    page: i,
  });
  if (pools.length === 0) {
    // last page
    break;
  }
  const minAdaPool = pools.find(
    (p) =>
      p.assetA === "lovelace" &&
      p.assetB ===
        "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e"
  );
  if (minAdaPool) {
    const [price0, price1] = await adapter.getV1PoolPrice({ pool: minAdaPool });
    console.log(
      `ADA/MIN price: ${price0.toString()}; MIN/ADA price: ${price1.toString()}`
    );
    // we can later use this ID to call getPoolById
    console.log(`ADA/MIN pool ID: ${minAdaPool.id}`);
    break;
  }
}
```

#### MIN/ADA pool v2:

```ts
const minAdaPool = await adapter.getV2PoolByPair(
  Asset.fromString("lovelace"),
  Asset.fromString(
    "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e"
  )
);

if (minAdaPool) {
  const [a, b] = await adapter.getV2PoolPrice({ pool: minAdaPool });
  console.log(`ADA/MIN price: ${a.toString()}; MIN/ADA price: ${b.toString()}`);
}
```

### Example 2: Get historical prices of MIN/ADA pool

#### MIN/ADA pool v1:

```ts
const MIN_ADA_POOL_ID =
  "6aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2";

const history = await adapter.getV1PoolHistory({ id: MIN_ADA_POOL_ID });
for (const historyPoint of history) {
  const pool = await adapter.getV1PoolInTx({ txHash: historyPoint.txHash });
  if (!pool) {
    throw new Error("pool not found");
  }
  const [price0, price1] = await adapter.getV1PoolPrice({ pool: pool });
  console.log(`${historyPoint.time}: ${price0} ADA/MIN, ${price1} MIN/ADA`);
}
```

#### MIN/ADA pool v2:

```ts
for (let i = 1; ; i++) {
  const pools = await adapter.getV2PoolHistory({
    assetA: Asset.fromString("lovelace"),
    assetB: Asset.fromString(
      "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e"
    ),
    page: i,
  });
  if (pools.length === 0) {
    // last page
    break;
  }

  for (const pool of pools) {
    const [price0, price1] = await adapter.getV2PoolPrice({ pool: pool });
    console.log(
      `ADA/MIN price: ${a.toString()}; MIN/ADA price: ${price1.toString()}`
    );
  }
}
```

### Example 3: Build Order transaction and submit

- Swap MIN-ADA in V2 pool on testnet:

#### With Blockfrost adapter:

```ts
import {
    ADA, Asset,
    BlockfrostAdapter,
    calculateAmountWithSlippageTolerance,
    DexV2,
    DexV2Calculation,
    getBackendBlockfrostLucidInstance,
    NetworkId, 
    OrderV2
} from "@minswap/sdk";
import {BlockFrostAPI} from "@blockfrost/blockfrost-js";

export async function swapExactInV2TxExample() {
    const networkId: NetworkId = NetworkId.TESTNET;
    const blockfrostProjectId = "<YOUR_BLOCKFROST_PROJECT_ID>";
    const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

    const address = "<YOUR_ADDRESS";

    const lucid = await getBackendBlockfrostLucidInstance(
        networkId,
        blockfrostProjectId,
        blockfrostUrl,
        address
    );

    const adapter = new BlockfrostAdapter(
        NetworkId.TESTNET,
        new BlockFrostAPI({
            projectId: blockfrostProjectId,
            network: "preprod",
        })
    );

    const MIN: Asset = {
        policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
        tokenName: "4d494e",
    };

    const utxos = await lucid.utxosAt(address);

    const assetA = ADA;
    const assetB = MIN;

    const pool = await adapter.getV2PoolByPair(assetA, assetB);
    if (!pool) {
        throw new Error("Pool not found");
    }

    const swapAmount = 1_000n;
    const amountOut = DexV2Calculation.calculateAmountOut({
        reserveIn: pool.reserveA,
        reserveOut: pool.reserveB,
        amountIn: swapAmount,
        tradingFeeNumerator: pool.feeA[0],
    });

    // 20% slippage tolerance
    const acceptedAmountOut = calculateAmountWithSlippageTolerance({
        slippageTolerancePercent: 20,
        amount: amountOut,
        type: "down",
    });

    const txComplete = await new DexV2(lucid, adapter).createBulkOrdersTx({
        sender: address,
        availableUtxos: utxos,
        orderOptions: [
            {
                type: OrderV2.StepType.SWAP_EXACT_IN,
                amountIn: swapAmount,
                assetIn: assetA,
                direction: OrderV2.Direction.A_TO_B,
                minimumAmountOut: acceptedAmountOut,
                lpAsset: pool.lpAsset,
                isLimitOrder: false,
                killOnFailed: false,
            },
        ],
    });

    const signedTx = await txComplete
        .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
        .commit();
    const txId = await signedTx.submit();

    console.log(`Transaction submitted successfully: ${txId}`);
}

void swapExactInV2TxExample();
```

#### With Meastro adapter:

```ts
import {
    ADA,
    Asset,
    calculateAmountWithSlippageTolerance,
    DexV2,
    DexV2Calculation,
    getBackendMaestroLucidInstance,
    MaestroAdapter,
    NetworkId,
    OrderV2
} from "@minswap/sdk";
import {Configuration, MaestroClient} from "@maestro-org/typescript-sdk";

export async function swapExactInV2TxExample() {
    const networkId: NetworkId = NetworkId.TESTNET;
    const maestroApiKey = "<YOUR_API_KEY>";

    const address = "<YOUR_ADDRESS>";

    const lucid = await getBackendMaestroLucidInstance(
        "Preprod",
        maestroApiKey,
        address
    );

    const maestroClient = new MaestroClient(
        new Configuration({
            apiKey: maestroApiKey,
            network: "Preprod",
        })
    );

    const MIN: Asset = {
        policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
        tokenName: "4d494e",
    };

    const adapter = new MaestroAdapter(NetworkId.TESTNET, maestroClient);

    const utxos = await lucid.utxosAt(address);

    const assetA = ADA;
    const assetB = MIN;

    const pool = await adapter.getV2PoolByPair(assetA, assetB);
    if (!pool) {
        throw new Error("Pool not found");
    }

    const swapAmount = 1_000n;
    const amountOut = DexV2Calculation.calculateAmountOut({
        reserveIn: pool.reserveA,
        reserveOut: pool.reserveB,
        amountIn: swapAmount,
        tradingFeeNumerator: pool.feeA[0],
    });

    // 20% slippage tolerance
    const acceptedAmountOut = calculateAmountWithSlippageTolerance({
        slippageTolerancePercent: 20,
        amount: amountOut,
        type: "down",
    });

    const txComplete = await new DexV2(lucid, adapter).createBulkOrdersTx({
        sender: address,
        availableUtxos: utxos,
        orderOptions: [
            {
                type: OrderV2.StepType.SWAP_EXACT_IN,
                amountIn: swapAmount,
                assetIn: assetA,
                direction: OrderV2.Direction.A_TO_B,
                minimumAmountOut: acceptedAmountOut,
                lpAsset: pool.lpAsset,
                isLimitOrder: false,
                killOnFailed: false,
            },
        ],
    });

    const signedTx = await txComplete
        .signWithPrivateKey("<YOUR_PRIVATE_KEY>")
        .commit();
    const txId = await signedTx.submit();

    console.log(`Transaction submitted successfully: ${txId}`);
}

void swapExactInV2TxExample();
```

See `examples/` or `docs` for more details. You can run a single file like `npm run exec examples/example.ts`.
