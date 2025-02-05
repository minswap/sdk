import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { Asset, DataObject, NetworkId } from "../src";
import { BlockfrostAdapter } from "../src/adapters/blockfrost";

const main = async () => {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const x = DataObject.from(
    "d8799fd8799fd8799f581cf2ca9cb36e2b3a0d9886319af10a98078445258f0b303c5afa460438ffd8799fd8799fd8799f581c38c1c81defe3f8ab0476c7e89a13cb2065030431bfb7a4cfd2eb38f8ffffffff01d87a9fd8799f581ce16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72434d494effffff"
  );
  console.log(x);
  console.log("Hi");
  const blockFrostApi = new BlockFrostAPI({
    projectId: "preprodciFT6wxONc6nrqUAknGp47PUvOzeIyne",
    network: "preprod",
  });
  const adapter = new BlockfrostAdapter(NetworkId.TESTNET, blockFrostApi);

  const minAdaPool = await adapter.getV2PoolByPair(
    Asset.fromString("lovelace"),
    Asset.fromString(
      "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e"
    )
  );

  if (minAdaPool) {
    const [a, b] = await adapter.getV2PoolPrice({ pool: minAdaPool });
    console.log(
      `ADA/MIN price: ${a.toString()}; MIN/ADA price: ${b.toString()}`
    );
  }
};

main();
