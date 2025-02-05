import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Asset, NetworkId } from "../src";
import { BlockfrostAdapter } from "../src/adapters/blockfrost";

const main = async () => {
  console.log("Hi");
  const blockFrostApi = new BlockFrostAPI({
    projectId: "preprodciFT6wxONc6nrqUAknGp47PUvOzeIyne",
    network: "preprod",
  });
  const adapter = new BlockfrostAdapter(NetworkId.TESTNET, blockFrostApi);

  // const minAdaPool = await adapter.getV2PoolByPair(
  //   Asset.fromString("lovelace"),
  //   Asset.fromString(
  //     "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c64d494e"
  //   )
  // );

  // if (minAdaPool) {
  //   const [a, b] = await adapter.getV2PoolPrice({ pool: minAdaPool });
  //   console.log(
  //     `ADA/MIN price: ${a.toString()}; MIN/ADA price: ${b.toString()}`
  //   );
  // }
};

main();
