# Minswap Database Indexer Documentation

## Overview

The Minswap Database Indexer listens to events from the Cardano Blockchain and stores relevant data related to Minswap Liquidity Pools in a PostgreSQL database. This allows for efficient querying and retrieval of historical liquidity pool data. The indexer uses **Ogmios** as a WebSocket to capture blockchain events in real-time.

### How Minswap Indexer Works

- **Ogmios WebSocket Integration**: The Minswap Indexer uses **Ogmios** as a WebSocket to listen to blockchain events emitted by the Cardano Blockchain. These events are processed in real-time, ensuring the data is always up-to-date.
  
- **Data Normalization and Storage**: Whenever the indexer receives an event related to the Minswap Liquidity Pool, it normalizes the data and stores it in a PostgreSQL database. The normalized data allows for efficient querying and tracking of liquidity pool events.

- **Database Schema**: 
  - The database schema, which defines how the liquidity pool data is structured and stored, can be found under [Database](../src/syncer/postgres/prisma/schema.prisma).
  
- **Indexer Logic**:
  - The indexer’s core logic for handling blockchain events and processing liquidity pool data is located in [Indexer](../src/syncer/syncer.ts).

---

### Retrieving Historical Data of Liquidity Pools

To retrieve the historical data of liquidity pools from the Minswap Indexer, follow these steps:

#### **Required Tools**:

- **Docker**: You can install Docker by following this [installation guide](https://docs.docker.com/get-started/get-docker/).
- **Docker Compose**: You can install Docker Compose by following this [installation guide](https://docs.docker.com/compose/install/)

#### **Step-by-Step Guide**:

1. **Run the Minswap Indexer using Docker**:
    - First, we need to start the indexer and listen for events from the Cardano Blockchain. To do this, use the following Docker Compose command:
    
        - Update the `.env` file to specify the exact network you want to sync.
        - Run the command: `docker compose -f docker-compose.yaml up --build -d` to build.
        - Run the command: `docker compose -f docker-compose.yaml logs -f` to view log.
    - This command will initiate the Minswap Indexer, which will start listening to real-time blockchain events via Ogmios.

2. **Understanding the block Table**
    - The `block` table in the PostgreSQL database represents the progress of the indexer. Each entry in this table corresponds to a specific block processed by the indexer. To verify if the indexer is up-to-date, check if the latest block recorded in this table matches the latest block of the Cardano blockchain.

    ```sql
    SELECT * FROM block ORDER BY id DESC LIMIT 1;
    ```
    
    - If the block number from this query matches the latest block from the Cardano network, the data is fully synchronized.

3. **Retrieve Liquidity Pool Information**
    - Once the data is up-to-date, you can query liquidity pool information. One convenient way to do this is by using the **MinswapAdapter**.

    Here's an example of retrieving liquidity pool data using the MinswapAdapter:

    ```typescript
    const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";

    const prismaClient = await newPrismaClient("postgresql://postgres:minswap@postgres:5432/syncer?schema=public&connection_limit=5")
    const repository = new PostgresRepositoryReader(
        NetworkEnvironment.TESTNET_PREPROD,
        prismaClient
    )

    const adapter = new MinswapAdapter({
        networkId: NetworkId.TESTNET,
        networkEnv: NetworkEnvironment.TESTNET_PREPROD,
        blockFrostApi: new BlockFrostAPI({
        projectId: blockfrostProjectId,
        network: "preprod",
        }),
        repository: repository
    })

    // Example LP Asset of a Stable Pool
    const stablePoolLPAsset = Asset.fromString("8db03e0cc042a5f82434123a0509f590210996f1c7410c94f913ac48757364632d757364742d76312e342d6c70")

    // Example LP Asset of a V2 Pool
    const v2PoolLPAsset = Asset.fromString("d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b6c3ea488e6ff940bb6fb1b18fd605b5931d9fefde6440117015ba484cf321200")

    // Retrieve the latest information of a specific Stable Pool
    const latestStablePool = await adapter.getStablePoolByLpAsset(stablePoolLPAsset)
    invariant(latestStablePool)

    // Retrieve the latest price of asset index 0 agains asset index 1
    const latestStablePoolPrice = adapter.getStablePoolPrice({
        pool: latestStablePool,
        assetAIndex: 0,
        assetBIndex: 1
    })
    // Retrieve the historical information of a specific Stable Pool
    const historialStablePools = await adapter.getStablePoolHistory({
        lpAsset: stablePoolLPAsset,
    })
    // Retrieve the historical prices of asset index 0 agains asset index 1
    const historicalStablePoolPrices = historialStablePools.map((pool) =>
        adapter.getStablePoolPrice({
        pool: pool,
        assetAIndex: 0,
        assetBIndex: 1
        })
    )

    // Retrieve the latest information of a specific V2 Pool
    const v2Pool = await adapter.getV2PoolByLp(v2PoolLPAsset)
    invariant(v2Pool)

    // Retrieve the latest price of asset A agains asset B and vice versa
    const latestV2PoolPrice = await adapter.getV2PoolPrice({
        pool: v2Pool
    })

    // Retrieve the historical information of a specific V2 Pool
    const historialV2Pools = await adapter.getV2PoolHistory({
        lpAsset: v2PoolLPAsset,
    })

    // Retrieve the historical prices of asset A agains asset B and vice versa
    const historicalV2PoolPrices = await Promise.all(historialV2Pools.map((pool) => 
        adapter.getV2PoolPrice({
        pool: pool,
        })
    ))
    ```

### Minswap Indexer Extensibility
Currently, the Minswap Indexer is designed specifically to listen to and process transactions related to Minswap's Liquidity Pools. However, if your business logic requires more complex data retrieval or processing beyond liquidity pool transactions, the Minswap Indexer can be extended to suit your needs.

To achieve this, you can modify the [handleBlock](../src/syncer/syncer.ts#L100) function. This function is responsible for processing each block and extracting the relevant transactions. By extending this function, you can listen to and handle other types of transactions or blockchain events that are important to your application.

**Extending the handleBlock Function**

The handleBlock function is at the core of the indexer's event handling process. It currently focuses on transactions involving Minswap's Liquidity Pools, but you can modify it to:
- Process additional types of smart contract interactions.
- Extract and store data from non-liquidity pool transactions.
- Retrieve custom blockchain events that align with your specific use case.


## Conclusion
The Minswap Database Indexer is an essential tool for tracking and retrieving real-time liquidity pool data from the Cardano Blockchain. By using Ogmios to listen to blockchain events and storing the normalized data in a PostgreSQL database, the indexer ensures accurate and up-to-date information.