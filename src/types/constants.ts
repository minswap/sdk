import invariant from "@minswap/tiny-invariant";
import { Address, OutRef, Script } from "lucid-cardano";

import { Asset } from "..";
import { NetworkEnvironment, NetworkId } from "./network";

export namespace DexV1Constant {
  export const ORDER_BASE_ADDRESS: Record<number, Address> = {
    [NetworkId.TESTNET]:
      "addr_test1zzn9efv2f6w82hagxqtn62ju4m293tqvw0uhmdl64ch8uwurajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upq932hcy",
    [NetworkId.MAINNET]:
      "addr1zxn9efv2f6w82hagxqtn62ju4m293tqvw0uhmdl64ch8uw6j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq6s3z70",
  };
  export const POOL_SCRIPT_HASH = "script1uychk9f04tqngfhx4qlqdlug5ntzen3uzc62kzj7cyesjk0d9me";
  export const FACTORY_POLICY_ID = "13aa2accf2e1561723aa26871e071fdf32c867cff7e7d50ad470d62f";
  export const FACTORY_ASSET_NAME = "4d494e53574150";
  export const LP_POLICY_ID = "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86";
  export const POOL_NFT_POLICY_ID = "0be55d262b29f564998ff81efe21bdc0022621c12f15af08d0f2ddb1";
  export const ORDER_SCRIPT: Script = {
    type: "PlutusV1",
    script:
      "59014f59014c01000032323232323232322223232325333009300e30070021323233533300b3370e9000180480109118011bae30100031225001232533300d3300e22533301300114a02a66601e66ebcc04800400c5288980118070009bac3010300c300c300c300c300c300c300c007149858dd48008b18060009baa300c300b3754601860166ea80184ccccc0288894ccc04000440084c8c94ccc038cd4ccc038c04cc030008488c008dd718098018912800919b8f0014891ce1317b152faac13426e6a83e06ff88a4d62cce3c1634ab0a5ec133090014a0266008444a00226600a446004602600a601a00626600a008601a006601e0026ea8c03cc038dd5180798071baa300f300b300e3754601e00244a0026eb0c03000c92616300a001375400660106ea8c024c020dd5000aab9d5744ae688c8c0088cc0080080048c0088cc00800800555cf2ba15573e6e1d200201",
  };
}

export namespace StableswapConstant {
  export type Config = {
    orderAddress: Address;
    poolAddress: Address;
    nftAsset: string;
    lpAsset: string;
    assets: string[];
    multiples: bigint[];
    fee: bigint;
    adminFee: bigint;
    feeDenominator: bigint;
  };

  export type DeployedScripts = {
    order: OutRef;
    pool: OutRef;
    lp: OutRef;
    poolBatching: OutRef;
  };

  export const CONFIG: Record<NetworkId, Config[]> = {
    [NetworkId.TESTNET]: [
      {
        orderAddress:
          "addr_test1zq8spknltt6yyz2505rhc5lqw89afc4anhu4u0347n5dz8urajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqa63kst",
        poolAddress:
          "addr_test1zr3hs60rn9x49ahuduuzmnlhnema0jsl4d3ujrf3cmurhmvrajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqcgz9yc",
        nftAsset:
          "06fe1ba957728130154154d5e5b25a7b533ebe6c4516356c0aa69355646a65642d697573642d76312e342d6c70",
        lpAsset:
          "d16339238c9e1fb4d034b6a48facb2f97794a9cdb7bc049dd7c49f54646a65642d697573642d76312e342d6c70",
        assets: [
          "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed7274444a4544",
          "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed727469555344",
        ],
        multiples: [1n, 1n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
      {
        orderAddress:
          "addr_test1zp3mf7r63u8km2d69kh6v2axlvl04yunmmj67vprljuht4urajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqhelj6n",
        poolAddress:
          "addr_test1zzc8ar93kgntz3lv95uauhe29kj4yj84mxhg5v9dqj4k7p5rajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqujv25l",
        nftAsset:
          "06fe1ba957728130154154d5e5b25a7b533ebe6c4516356c0aa69355757364632d757364742d76312e342d6c70",
        lpAsset:
          "8db03e0cc042a5f82434123a0509f590210996f1c7410c94f913ac48757364632d757364742d76312e342d6c70",
        assets: [
          "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed727455534443",
          "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed727455534454",
        ],
        multiples: [1n, 1n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
      {
        orderAddress:
          "addr_test1zqpmw0kkgm6fp9x0asq5vwuaccweeqdv3edhwckqr2gnvzurajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upq9z8vxj",
        poolAddress:
          "addr_test1zqh2uv0wvrtt579e92q35ktkzcj3lj3nzdm3xjpsdack3q5rajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqud27a8",
        nftAsset:
          "06fe1ba957728130154154d5e5b25a7b533ebe6c4516356c0aa69355646a65642d697573642d6461692d76312e342d6c70",
        lpAsset:
          "492fd7252d5914c9f5acb7eeb6b905b3a65b9a952c2300de34eb86c5646a65642d697573642d6461692d76312e342d6c70",
        assets: [
          "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed7274444a4544",
          "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed727469555344",
          "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed7274444149",
        ],
        multiples: [1n, 1n, 1n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
    ],
    [NetworkId.MAINNET]: [
      {
        orderAddress:
          "addr1w9xy6edqv9hkptwzewns75ehq53nk8t73je7np5vmj3emps698n9g",
        poolAddress:
          "addr1wy7kkcpuf39tusnnyga5t2zcul65dwx9yqzg7sep3cjscesx2q5m5",
        nftAsset:
          "5d4b6afd3344adcf37ccef5558bb87f522874578c32f17160512e398444a45442d695553442d534c50",
        lpAsset:
          "2c07095028169d7ab4376611abef750623c8f955597a38cd15248640444a45442d695553442d534c50",
        assets: [
          "8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61446a65644d6963726f555344",
          "f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069555344",
        ],
        multiples: [1n, 1n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
      {
        orderAddress:
          "addr1w93d8cuht3hvqt2qqfjqgyek3gk5d6ss2j93e5sh505m0ng8cmze2",
        poolAddress:
          "addr1wx8d45xlfrlxd7tctve8xgdtk59j849n00zz2pgyvv47t8sxa6t53",
        nftAsset:
          "d97fa91daaf63559a253970365fb219dc4364c028e5fe0606cdbfff9555344432d444a45442d534c50",
        lpAsset:
          "ac49e0969d76ed5aa9e9861a77be65f4fc29e9a979dc4c37a99eb8f4555344432d444a45442d534c50",
        assets: [
          "25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff93555534443",
          "8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61446a65644d6963726f555344",
        ],
        multiples: [1n, 100n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
      {
        orderAddress:
          "addr1wxtv9k2lcum5pmcc4wu44a5tufulszahz84knff87wcawycez9lug",
        poolAddress:
          "addr1w9520fyp6g3pjwd0ymfy4v2xka54ek6ulv4h8vce54zfyfcm2m0sm",
        nftAsset:
          "96402c6f5e7a04f16b4d6f500ab039ff5eac5d0226d4f88bf5523ce85553444d2d695553442d534c50",
        lpAsset:
          "31f92531ac9f1af3079701fab7c66ce997eb07988277ee5b9d6403015553444d2d695553442d534c50",
        assets: [
          "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d",
          "f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069555344",
        ],
        multiples: [1n, 1n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
      {
        orderAddress:
          "addr1wxr9ppdymqgw6g0hvaaa7wc6j0smwh730ujx6lczgdynehsguav8d",
        poolAddress:
          "addr1wxxdvtj6y4fut4tmu796qpvy2xujtd836yg69ahat3e6jjcelrf94",
        nftAsset:
          "07b0869ed7488657e24ac9b27b3f0fb4f76757f444197b2a38a15c3c444a45442d5553444d2d534c50",
        lpAsset:
          "5b042cf53c0b2ce4f30a9e743b4871ad8c6dcdf1d845133395f55a8e444a45442d5553444d2d534c50",
        assets: [
          "8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61446a65644d6963726f555344",
          "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d",
        ],
        multiples: [1n, 1n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
    ],
  };

  export const DEPLOYED_SCRIPTS: Record<
    NetworkId,
    Record<string, DeployedScripts>
  > = {
    [NetworkId.TESTNET]: {
      "06fe1ba957728130154154d5e5b25a7b533ebe6c4516356c0aa69355646a65642d697573642d76312e342d6c70":
      {
        order: {
          txHash:
            "527e421bc3eb8b9e5ec0a9ad214bb9b76148f57b9a5a8cbd83a51264f943e91d",
          outputIndex: 0,
        },
        pool: {
          txHash:
            "527e421bc3eb8b9e5ec0a9ad214bb9b76148f57b9a5a8cbd83a51264f943e91d",
          outputIndex: 1,
        },
        lp: {
          txHash:
            "527e421bc3eb8b9e5ec0a9ad214bb9b76148f57b9a5a8cbd83a51264f943e91d",
          outputIndex: 2,
        },
        poolBatching: {
          txHash:
            "527e421bc3eb8b9e5ec0a9ad214bb9b76148f57b9a5a8cbd83a51264f943e91d",
          outputIndex: 3,
        },
      },
      "06fe1ba957728130154154d5e5b25a7b533ebe6c4516356c0aa69355757364632d757364742d76312e342d6c70":
      {
        order: {
          txHash:
            "cf699550642c8ffc1673d1e5d56d8562ca7c7f5c0b513a8428c3f52cdcc8fdb7",
          outputIndex: 0,
        },
        pool: {
          txHash:
            "cf699550642c8ffc1673d1e5d56d8562ca7c7f5c0b513a8428c3f52cdcc8fdb7",
          outputIndex: 1,
        },
        lp: {
          txHash:
            "cf699550642c8ffc1673d1e5d56d8562ca7c7f5c0b513a8428c3f52cdcc8fdb7",
          outputIndex: 2,
        },
        poolBatching: {
          txHash:
            "cf699550642c8ffc1673d1e5d56d8562ca7c7f5c0b513a8428c3f52cdcc8fdb7",
          outputIndex: 3,
        },
      },
      "06fe1ba957728130154154d5e5b25a7b533ebe6c4516356c0aa69355646a65642d697573642d6461692d76312e342d6c70":
      {
        order: {
          txHash:
            "a8ab602259654697c85e2f61752d34cdb631f314eaeded0676fee6f6be70afe7",
          outputIndex: 0,
        },
        pool: {
          txHash:
            "a8ab602259654697c85e2f61752d34cdb631f314eaeded0676fee6f6be70afe7",
          outputIndex: 1,
        },
        lp: {
          txHash:
            "a8ab602259654697c85e2f61752d34cdb631f314eaeded0676fee6f6be70afe7",
          outputIndex: 2,
        },
        poolBatching: {
          txHash:
            "a8ab602259654697c85e2f61752d34cdb631f314eaeded0676fee6f6be70afe7",
          outputIndex: 3,
        },
      },
    },
    [NetworkId.MAINNET]: {
      "5d4b6afd3344adcf37ccef5558bb87f522874578c32f17160512e398444a45442d695553442d534c50":
      {
        order: {
          txHash:
            "20227174ec2f7853a71a02c435d063b3bf63851d4e0ad9a0c09250a087a6577e",
          outputIndex: 0,
        },
        pool: {
          txHash:
            "20227174ec2f7853a71a02c435d063b3bf63851d4e0ad9a0c09250a087a6577e",
          outputIndex: 1,
        },
        lp: {
          txHash:
            "20227174ec2f7853a71a02c435d063b3bf63851d4e0ad9a0c09250a087a6577e",
          outputIndex: 2,
        },
        poolBatching: {
          txHash:
            "20227174ec2f7853a71a02c435d063b3bf63851d4e0ad9a0c09250a087a6577e",
          outputIndex: 3,
        },
      },
      d97fa91daaf63559a253970365fb219dc4364c028e5fe0606cdbfff9555344432d444a45442d534c50:
      {
        order: {
          txHash:
            "8b880e77a726e76e5dd585cda2c4c2ac93f1cfccc06910f00550fb820ae1fc54",
          outputIndex: 0,
        },
        pool: {
          txHash:
            "8b880e77a726e76e5dd585cda2c4c2ac93f1cfccc06910f00550fb820ae1fc54",
          outputIndex: 1,
        },
        lp: {
          txHash:
            "8b880e77a726e76e5dd585cda2c4c2ac93f1cfccc06910f00550fb820ae1fc54",
          outputIndex: 2,
        },
        poolBatching: {
          txHash:
            "8b880e77a726e76e5dd585cda2c4c2ac93f1cfccc06910f00550fb820ae1fc54",
          outputIndex: 3,
        },
      },
      "96402c6f5e7a04f16b4d6f500ab039ff5eac5d0226d4f88bf5523ce85553444d2d695553442d534c50":
      {
        order: {
          txHash:
            "48019a931af442e1eedab6c5b52b3069cf6eadb2483a2131f517e62fddfd5662",
          outputIndex: 0,
        },
        pool: {
          txHash:
            "48019a931af442e1eedab6c5b52b3069cf6eadb2483a2131f517e62fddfd5662",
          outputIndex: 1,
        },
        lp: {
          txHash:
            "48019a931af442e1eedab6c5b52b3069cf6eadb2483a2131f517e62fddfd5662",
          outputIndex: 2,
        },
        poolBatching: {
          txHash:
            "48019a931af442e1eedab6c5b52b3069cf6eadb2483a2131f517e62fddfd5662",
          outputIndex: 3,
        },
      },
      "07b0869ed7488657e24ac9b27b3f0fb4f76757f444197b2a38a15c3c444a45442d5553444d2d534c50":
      {
        order: {
          txHash:
            "dddccee9cd58cbf712f2ff2c49ea20537db681a333c701106aa13cd57aee3873",
          outputIndex: 0,
        },
        pool: {
          txHash:
            "dddccee9cd58cbf712f2ff2c49ea20537db681a333c701106aa13cd57aee3873",
          outputIndex: 1,
        },
        lp: {
          txHash:
            "dddccee9cd58cbf712f2ff2c49ea20537db681a333c701106aa13cd57aee3873",
          outputIndex: 2,
        },
        poolBatching: {
          txHash:
            "dddccee9cd58cbf712f2ff2c49ea20537db681a333c701106aa13cd57aee3873",
          outputIndex: 3,
        },
      },
    },
  };

  export function getConfigByLpAsset(
    lpAsset: Asset,
    networkId: NetworkId
  ): StableswapConstant.Config {
    const config = StableswapConstant.CONFIG[networkId].find(
      (config) => config.lpAsset === Asset.toString(lpAsset)
    );
    invariant(config, `Invalid Stableswap LP Asset ${Asset.toString(lpAsset)}`);
    return config;
  }

  export function getConfigFromStableswapOrderAddress(
    address: Address,
    networkId: NetworkId
  ): StableswapConstant.Config {
    const config = StableswapConstant.CONFIG[networkId].find((config) => {
      return address === config.orderAddress;
    });
    invariant(config, `Invalid Stableswap Order Address: ${address}`);
    return config;
  }

  export function getStableswapReferencesScript(
    nftAsset: Asset,
    networkId: NetworkId
  ): StableswapConstant.DeployedScripts {
    const refScript =
      StableswapConstant.DEPLOYED_SCRIPTS[networkId][Asset.toString(nftAsset)];
    invariant(
      refScript,
      `Invalid Stableswap Nft Asset ${Asset.toString(nftAsset)}`
    );
    return refScript;
  }
}

export namespace DexV2Constant {
  export type Config = {
    factoryAsset: string;
    poolAuthenAsset: string;
    globalSettingAsset: string;
    lpPolicyId: string;
    globalSettingScriptHash: string;
    globalSettingScriptHashBech32: string;
    orderScriptHash: string;
    poolScriptHash: string;
    poolScriptHashBech32: string;
    poolCreationAddress: Address;
    factoryScriptHashBech32: string;
    factoryScriptHash: string;
    factoryAddress: string;
    expiredOrderCancelAddress: string;
    poolBatchingAddress: string;
    orderEnterpriseAddress: string;
  };

  export type DeployedScripts = {
    order: OutRef;
    pool: OutRef;
    factory: OutRef;
    authen: OutRef;
    poolBatching: OutRef;
    expiredOrderCancellation: OutRef;
  };

  export const CONFIG: Record<NetworkId, Config> = {
    [NetworkId.TESTNET]: {
      factoryAsset:
        "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b4d5346",
      poolAuthenAsset:
        "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b4d5350",
      globalSettingAsset:
        "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b4d534753",
      lpPolicyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
      globalSettingScriptHash:
        "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
      globalSettingScriptHashBech32:
        "script1664wypvm4msc3a6fzayneamr0enee5sehham7nwtavwsk2s2vg9",
      orderScriptHash:
        "da9525463841173ad1230b1d5a1b5d0a3116bbdeb4412327148a1b7a",
      poolScriptHash:
        "d6ba9b7509eac866288ff5072d2a18205ac56f744bc82dcd808cb8fe",
      poolScriptHashBech32:
        "script166afkagfatyxv2y075rj62scypdv2mm5f0yzmnvq3ju0uqqmszv",
      poolCreationAddress:
        "addr_test1zrtt4xm4p84vse3g3l6swtf2rqs943t0w39ustwdszxt3l5rajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqhns793",
      factoryScriptHash:
        "6e23fe172b5b50e2ad59aded9ee8d488f74c7f4686f91b032220adad",
      factoryScriptHashBech32:
        "script1dc3lu9ettdgw9t2e4hkea6x53rm5cl6xsmu3kqezyzk66vpljxc",
      factoryAddress:
        "addr_test1zphz8lsh9dd4pc4dtxk7m8hg6jy0wnrlg6r0jxcrygs2mtvrajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqjgg24z",
      expiredOrderCancelAddress:
        "stake_test17rytpnrpxax5p8leepgjx9cq8ecedgly6jz4xwvvv4kvzfqz6sgpf",
      poolBatchingAddress:
        "stake_test17rann6nth9675m0y5tz32u3rfhzcfjymanxqnfyexsufu5glcajhf",
      orderEnterpriseAddress:
        "addr_test1wrdf2f2x8pq3wwk3yv936ksmt59rz94mm66yzge8zj9pk7s0kjph3",
    },
    [NetworkId.MAINNET]: {
      factoryAsset:
        "f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c4d5346",
      poolAuthenAsset:
        "f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c4d5350",
      globalSettingAsset:
        "f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c4d534753",
      lpPolicyId: "f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c",
      globalSettingScriptHash:
        "f5808c2c990d86da54bfc97d89cee6efa20cd8461616359478d96b4c",
      globalSettingScriptHashBech32:
        "script17kqgctyepkrd549le97cnnhxa73qekzxzctrt9rcm945c880puk",
      orderScriptHash:
        "c3e28c36c3447315ba5a56f33da6a6ddc1770a876a8d9f0cb3a97c4c",
      poolScriptHash:
        "ea07b733d932129c378af627436e7cbc2ef0bf96e0036bb51b3bde6b",
      poolScriptHashBech32:
        "script1agrmwv7exgffcdu27cn5xmnuhsh0p0ukuqpkhdgm800xksw7e2w",
      poolCreationAddress:
        "addr1z84q0denmyep98ph3tmzwsmw0j7zau9ljmsqx6a4rvaau66j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq777e2a",
      factoryScriptHash:
        "7bc5fbd41a95f561be84369631e0e35895efb0b73e0a7480bb9ed730",
      factoryScriptHashBech32:
        "script100zlh4q6jh6kr05yx6trrc8rtz27lv9h8c98fq9mnmtnqfa47eg",
      factoryAddress:
        "addr1z9aut775r22l2cd7ssmfvv0qudvftmaskulq5ayqhw0dwvzj2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pqgjw6pl",
      expiredOrderCancelAddress:
        "stake178ytpnrpxax5p8leepgjx9cq8ecedgly6jz4xwvvv4kvzfq9s6295",
      poolBatchingAddress:
        "stake17y02a946720zw6pw50upt2arvxsvvpvaghjtl054h0f0gjsfyjz59",
      orderEnterpriseAddress:
        "addr1w8p79rpkcdz8x9d6tft0x0dx5mwuzac2sa4gm8cvkw5hcnqst2ctf",
    },
  };

  export const DEPLOYED_SCRIPTS: Record<NetworkId, DeployedScripts> = {
    [NetworkId.TESTNET]: {
      order: {
        txHash:
          "8c98f0530cba144d264fbd2731488af25257d7ce6a0cd1586fc7209363724f03",
        outputIndex: 0,
      },
      pool: {
        txHash:
          "9f30b1c3948a009ceebda32d0b1d25699674b2eaf8b91ef029a43bfc1073ce28",
        outputIndex: 0,
      },
      factory: {
        txHash:
          "9741d59656e9ad54f197b0763482eede9a6fa1616c4547797eee6617f92a1396",
        outputIndex: 0,
      },
      authen: {
        txHash:
          "c429b8ee27e5761ba8714e26e3a5899886cd28d136d43e969d4bc1acf0f72d4a",
        outputIndex: 0,
      },
      poolBatching: {
        txHash:
          "b0a6c5512735c7a183a167eed035ac75c191d6ff5be9736dfa1f1f02f7ae5dbc",
        outputIndex: 0,
      },
      expiredOrderCancellation: {
        txHash:
          "ee718dd86e3cb89e802aa8b2be252fccf6f15263f4a26b5f478c5135c40264c6",
        outputIndex: 0,
      },
    },
    [NetworkId.MAINNET]: {
      order: {
        txHash:
          "cf4ecddde0d81f9ce8fcc881a85eb1f8ccdaf6807f03fea4cd02da896a621776",
        outputIndex: 0,
      },
      pool: {
        txHash:
          "2536194d2a976370a932174c10975493ab58fd7c16395d50e62b7c0e1949baea",
        outputIndex: 0,
      },
      factory: {
        txHash:
          "59c7fa5c30cbab4e6d38f65e15d1adef71495321365588506ad089d237b602e0",
        outputIndex: 0,
      },
      authen: {
        txHash:
          "dbc1498500a6e79baa0f34d10de55cdb4289ca6c722bd70e1e1b78a858f136b9",
        outputIndex: 0,
      },
      poolBatching: {
        txHash:
          "d46bd227bd2cf93dedd22ae9b6d92d30140cf0d68b756f6608e38d680c61ad17",
        outputIndex: 0,
      },
      expiredOrderCancellation: {
        txHash:
          "ef3acc7dfc5a98bffe8f4d4400e65a9ade5a1316b2fcb7145c3b83dba38a66f5",
        outputIndex: 0,
      },
    },
  };
}

export enum MetadataMessage {
  DEPOSIT_ORDER = "SDK Minswap: Deposit Order",
  CANCEL_ORDER = "SDK Minswap: Cancel Order",
  ZAP_IN_ORDER = "SDK Minswap: Zap Order",
  ZAP_OUT_ORDER = "SDK Minswap: Zap Out Order",
  SWAP_EXACT_IN_ORDER = "SDK Minswap: Swap Exact In Order",
  SWAP_EXACT_IN_LIMIT_ORDER = "SDK Minswap: Swap Exact In Limit Order",
  SWAP_EXACT_OUT_ORDER = "SDK Minswap: Swap Exact Out Order",
  WITHDRAW_ORDER = "SDK Minswap: Withdraw Order",
  STOP_ORDER = "SDK Minswap: Stop Order",
  OCO_ORDER = "SDK Minswap: OCO Order",
  ROUTING_ORDER = "SDK Minswap: Routing Order",
  PARTIAL_SWAP_ORDER = "SDK Minswap: Partial Fill Order",
  DONATION_ORDER = "Minswap: Donation Order",
  MIXED_ORDERS = "SDK Minswap: Mixed Orders",
  CREATE_POOL = "SDK Minswap: Create Pool",
}

export const FIXED_DEPOSIT_ADA = 2_000_000n;

export const SECURITY_PARAM: Record<NetworkEnvironment, number> = {
  [NetworkEnvironment.MAINNET]: 2160,
  [NetworkEnvironment.TESTNET_PREPROD]: 2160,
  [NetworkEnvironment.TESTNET_PREVIEW]: 2160,
}
