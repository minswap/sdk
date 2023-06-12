import { NetworkId } from "./types";

export const ORDER_ADDRESS = {
  [NetworkId.TESTNET]:
    "addr_test1zzn9efv2f6w82hagxqtn62ju4m293tqvw0uhmdl64ch8uwurajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upq932hcy",
  [NetworkId.MAINNET]:
    "addr1zxn9efv2f6w82hagxqtn62ju4m293tqvw0uhmdl64ch8uw6j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq6s3z70",
};

export const POOL_ADDRESS_LIST = {
  [NetworkId.TESTNET]: [
    "addr_test1zrsnz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzvrajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqs8q93k",
  ],
  [NetworkId.MAINNET]: [
    "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz2j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq0xmsha",
    "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzfgf0jgfz5xdvg2pges20usxhw8zwnkggheqrxwmxd6huuqss46eh",
    "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxzwccf8ywaly0m99ngq68lus48lmafut7ku9geawu8u6k49suv42qq",
    "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz02znpd777wgl9wwpk0dvdzuxn93mqh82q7vv6s9jn25rws52z94g",
    "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxz2jyskd3y6etkv8ye450545xu6q4jfq5hv4e0uxwkpf8lsq048y90",
    "addr1z8snz7c4974vzdpxu65ruphl3zjdvtxw8strf2c2tmqnxztnqm37tpj0q63s0qns5wfe4flqzqqg55760472n7yt4v8skpaj3k",
  ],
};

export const POOL_ADDRESS_SET = {
  [NetworkId.TESTNET]: new Set(POOL_ADDRESS_LIST[NetworkId.TESTNET]),
  [NetworkId.MAINNET]: new Set(POOL_ADDRESS_LIST[NetworkId.MAINNET]),
};

export const FACTORY_POLICY_ID =
  "13aa2accf2e1561723aa26871e071fdf32c867cff7e7d50ad470d62f";
export const FACTORY_ASSET_NAME = "4d494e53574150";
export const LP_POLICY_ID =
  "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86";
export const POOL_NFT_POLICY_ID =
  "0be55d262b29f564998ff81efe21bdc0022621c12f15af08d0f2ddb1";
