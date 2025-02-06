export * from "./adapters";
export * from "./calculate";
export * from "./dex";
export * from "./dex-v2";
export * from "./types/asset";
export * from "./types/constants";
export * from "./types/network";
export * from "./types/order";
export * from "./types/pool";
export * from "./utils/lucid";

import { Data } from "@spacebudz/lucid";

export type DataType = Data; // 👈 Rename the type locally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DataObject = Data as unknown as any; // 👈 Use the value version
