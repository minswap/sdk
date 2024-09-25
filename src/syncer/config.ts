import { PointOrOrigin } from "@cardano-ogmios/schema";

import { NetworkEnvironment, NetworkId } from "../types/network";
import { parseEnvironment } from "../utils/network.internal";

export type SyncerConfig = {
  networkId: NetworkId
  networkEnv: NetworkEnvironment
  redis: string
  postgress: string;
  syncStartPoint: PointOrOrigin
  ogmios: {
    host: string
    port: number
  }
}

export function getSyncerConfig(): SyncerConfig {
  const networkEnv = parseEnvironment(getEnv("ENVIRONMENT"))
  const networkId = networkEnv === NetworkEnvironment.MAINNET ? NetworkId.MAINNET : NetworkId.TESTNET
  return {
    networkId: networkId,
    networkEnv: networkEnv,
    redis: getEnv("REDIS_URL"),
    postgress: getEnv("POSTGRES_URL"),
    syncStartPoint: parsePointOrOrigin(getEnv("SYNC_START_POINT")),
    ogmios: {
      host: getEnv("OGMIOS_HOST"),
      port: Number(getEnv("OGMIOS_PORT"))
    },
  }
}

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Require environment variable ${key}`);
  }
  return val;
}

export function parsePointOrOrigin(startPoint: string): PointOrOrigin {
  if (startPoint === "origin") {
    return startPoint;
  }
  try {
    const parts = startPoint.split(".");
    return {
      id: parts[0],
      slot: Number(parts[1]),
    };
  } catch {
    throw new Error(`fail to parse pointOrOrigin, expect to be origin or format $headerHash.$slot, got ${startPoint}`);
  }
}