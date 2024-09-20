import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import JSONBig from "json-bigint";

import { BlockfrostAdapter, MinswapAdapter } from "./new-adapter";
import { newPrismaClient } from "./syncer/connector";
import { PostgresRepositoryReader } from "./syncer/repository/postgres-reposiotry";
import { NetworkEnvironment, NetworkId } from "./types/network";

const blockFrostApi = new BlockFrostAPI({
  projectId: "preprodel6eWcyCZddTV1wezpV1uNlt0GpUVAcw",
  network: "preprod",
});
const blockFrostAdapter = new BlockfrostAdapter(
  NetworkId.TESTNET,
  blockFrostApi
);

const prismaClient = await newPrismaClient(
  "postgresql://postgres:minswap@localhost:5432/syncer?schema=public&connection_limit=5"
);
const repository = new PostgresRepositoryReader(
  NetworkEnvironment.TESTNET_PREPROD,
  prismaClient
);
const minswapAdapter = new MinswapAdapter({
  networkId: NetworkId.TESTNET,
  networkEnv: NetworkEnvironment.TESTNET_PREPROD,
  blockFrostApi: blockFrostApi,
  repository: repository,
});

const a = await blockFrostAdapter.getAllStablePools();
console.log("blockFrostAdapter", JSONBig.stringify(a.pools));
const b = await minswapAdapter.getAllStablePools();
console.log("minswapAdapter", JSONBig.stringify(b.pools));
