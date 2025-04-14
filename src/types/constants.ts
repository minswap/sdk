import invariant from "@minswap/tiny-invariant";
import { OutRef, Script } from "@spacebudz/lucid";

import { Asset } from "./asset";
import { NetworkEnvironment, NetworkId } from "./network";

export namespace DexV1Constant {
  export const ORDER_BASE_ADDRESS: Record<number, string> = {
    [NetworkId.TESTNET]:
      "addr_test1zzn9efv2f6w82hagxqtn62ju4m293tqvw0uhmdl64ch8uwurajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upq932hcy",
    [NetworkId.MAINNET]:
      "addr1zxn9efv2f6w82hagxqtn62ju4m293tqvw0uhmdl64ch8uw6j2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pq6s3z70",
  };
  export const POOL_SCRIPT_HASH =
    "script1uychk9f04tqngfhx4qlqdlug5ntzen3uzc62kzj7cyesjk0d9me";
  export const FACTORY_POLICY_ID =
    "13aa2accf2e1561723aa26871e071fdf32c867cff7e7d50ad470d62f";
  export const FACTORY_ASSET_NAME = "4d494e53574150";
  export const LP_POLICY_ID =
    "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d86";
  export const POOL_NFT_POLICY_ID =
    "0be55d262b29f564998ff81efe21bdc0022621c12f15af08d0f2ddb1";
  export const ORDER_SCRIPT: Script = {
    type: "PlutusV1",
    script:
      "59014f59014c01000032323232323232322223232325333009300e30070021323233533300b3370e9000180480109118011bae30100031225001232533300d3300e22533301300114a02a66601e66ebcc04800400c5288980118070009bac3010300c300c300c300c300c300c300c007149858dd48008b18060009baa300c300b3754601860166ea80184ccccc0288894ccc04000440084c8c94ccc038cd4ccc038c04cc030008488c008dd718098018912800919b8f0014891ce1317b152faac13426e6a83e06ff88a4d62cce3c1634ab0a5ec133090014a0266008444a00226600a446004602600a601a00626600a008601a006601e0026ea8c03cc038dd5180798071baa300f300b300e3754601e00244a0026eb0c03000c92616300a001375400660106ea8c024c020dd5000aab9d5744ae688c8c0088cc0080080048c0088cc00800800555cf2ba15573e6e1d200201",
  };
}

export namespace StableswapConstant {
  export type Config = {
    orderAddress: string;
    poolAddress: string;
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
      {
        orderAddress:
          "addr1w9ksys0l07s9933kgkn4uxylsss5k6lqvt6e66kfc7am9sgtwqgv0",
        poolAddress:
          "addr1wx87yvnhj78yehh64unc7hr02dx73vmpedktz79xy2n3xxgs3t38l",
        nftAsset:
          "4e73e9cf8fd73e74956c67fa3a01486f02ab612ee580dc27755b8d57444a45442d4d795553442d534c50",
        lpAsset:
          "b69f5d48c91297142c46b764b69ab57844e3e7af9d7ba9bc63c3c517444a45442d4d795553442d534c50",
        assets: [
          "8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61446a65644d6963726f555344",
          "92776616f1f32c65a173392e4410a3d8c39dcf6ef768c73af164779c4d79555344",
        ],
        multiples: [1n, 1n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
      {
        orderAddress:
          "addr1w8akt26kwj9kc2y56p8x3s9e9lp2qqtcxql0rmnz55u6lks99kkjc",
        poolAddress:
          "addr1wxcsnc9wzuczcmcctzpl9c0w4r84f73rsmwl8ce8d9n54ygep9znj",
        nftAsset:
          "1d4c43ac86463f93c4cba60c28f143b2781d7f7328b18d8e68298e614d795553442d5553444d2d534c50",
        lpAsset:
          "5827249dcaf49ce7ccae2e0577fd9bf9514a4c34adabc7eb57e192594d795553442d5553444d2d534c50",
        assets: [
          "92776616f1f32c65a173392e4410a3d8c39dcf6ef768c73af164779c4d79555344",
          "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d"
        ],
        multiples: [1n, 1n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
      {
        orderAddress:
          "addr1w86a53qhsmh0qszg486ell6nchy77yq6txksfz8p4z4r39cd4e04m",
        poolAddress:
          "addr1wytm0yuffszdzkme56mlm07htw388vkny2wy49ch7c3p57s4wwk57",
        nftAsset:
          "3ff28ad0d4788f24619746cc86b774495ed4727634b61710d2bb7ed5555344432d695553442d534c50",
        lpAsset:
          "40b6f8a17ba5d9bab02fc776c9677212b40bfc3df77346f0b1edcba6555344432d695553442d534c50",
        assets: [
          "25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff93555534443",
          "f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069555344",
        ],
        multiples: [1n, 100n],
        fee: 1000000n,
        adminFee: 5000000000n,
        feeDenominator: 10000000000n,
      },
      {
        orderAddress:
          "addr1wy42rt3rdptdaa2lwlntkx49ksuqrmqqjlu7pf5l5f8upmgj3gq2m",
        poolAddress:
          "addr1wx4w03kq5tfhaad2fmglefgejj0anajcsvvg88w96lrmylc7mx5rm",
        nftAsset:
          "739150a2612da82e16adc2a3a1f88b256202d8415df0c5b7a2ff93fb555344432d695553442d302e312d534c50",
        lpAsset:
          "48bee898de501ff287165fdfc5be34818f3a41e474ae8f47f8c59f7a555344432d695553442d302e312d534c50",
        assets: [
          "25c5de5f5b286073c593edfd77b48abc7a48e5a4f3d4cd9d428ff93555534443",
          "f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069555344"
        ],
        multiples: [1n, 100n],
        fee: 10000000n,
        adminFee: 500000000n,
        feeDenominator: 10000000000n,
      }
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
      "d97fa91daaf63559a253970365fb219dc4364c028e5fe0606cdbfff9555344432d444a45442d534c50":
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
      "4e73e9cf8fd73e74956c67fa3a01486f02ab612ee580dc27755b8d57444a45442d4d795553442d534c50":
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
      "1d4c43ac86463f93c4cba60c28f143b2781d7f7328b18d8e68298e614d795553442d5553444d2d534c50":
        {
          order: {
            txHash:
              "316e7a87af964d9a65b2eecdb4afd62eae639b37539f0102f1b90144966bb074",
            outputIndex: 0,
          },
          pool: {
            txHash:
              "316e7a87af964d9a65b2eecdb4afd62eae639b37539f0102f1b90144966bb074",
            outputIndex: 1,
          },
          lp: {
            txHash:
              "316e7a87af964d9a65b2eecdb4afd62eae639b37539f0102f1b90144966bb074",
            outputIndex: 2,
          },
          poolBatching: {
            txHash:
              "316e7a87af964d9a65b2eecdb4afd62eae639b37539f0102f1b90144966bb074",
            outputIndex: 3,
          },
        },
      "3ff28ad0d4788f24619746cc86b774495ed4727634b61710d2bb7ed5555344432d695553442d534c50":
        {
          order: {
            txHash:
              "20c0cab94e5fcb31c9d91206fa2da754f484bb006f5d581c4afd39d83003ac80",
            outputIndex: 0,
          },
          pool: {
            txHash:
              "20c0cab94e5fcb31c9d91206fa2da754f484bb006f5d581c4afd39d83003ac80",
            outputIndex: 1,
          },
          lp: {
            txHash:
              "20c0cab94e5fcb31c9d91206fa2da754f484bb006f5d581c4afd39d83003ac80",
            outputIndex: 2,
          },
          poolBatching: {
            txHash:
              "20c0cab94e5fcb31c9d91206fa2da754f484bb006f5d581c4afd39d83003ac80",
            outputIndex: 3,
          },
        },
      "739150a2612da82e16adc2a3a1f88b256202d8415df0c5b7a2ff93fb555344432d695553442d302e312d534c50":
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
    address: string,
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
  export const DEFAULT_CANCEL_TIPS = 300_000n;
  export type Config = {
    factoryAsset: string;
    poolAuthenAsset: string;
    globalSettingAsset: string;
    lpPolicyId: string;
    globalSettingScriptHash: string;
    globalSettingScriptHashBech32: string;
    orderScriptHash: string;
    orderScriptHashBech32: string;
    poolScriptHash: string;
    poolScriptHashBech32: string;
    poolCreationAddress: string;
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
      orderScriptHashBech32:
        "script1m22j233cgytn45frpvw45x6apgc3dw77k3qjxfc53gdh5cejhly",
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
      orderScriptHashBech32:
        "script1c03gcdkrg3e3twj62menmf4xmhqhwz58d2xe7r9n497yc6r9qhd",
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

export namespace LbeV2Constant {
  export const FACTORY_AUTH_AN = "666163746f7279";
  export const TREASURY_AUTH_AN = "7472656173757279";
  export const MANAGER_AUTH_AN = "4d616e61676572";
  export const SELLER_AUTH_AN = "73656c6c6572";
  export const ORDER_AUTH_AN = "6f72646572";

  export const ORDER_COMMISSION = 250_000n;
  export const COLLECT_SELLER_COMMISSION = 250_000n;
  export const SELLER_COMMISSION = 1_500_000n;
  export const CREATE_POOL_COMMISSION = 10_000_000n;

  export const TREASURY_MIN_ADA = 5_000_000n;
  export const MANAGER_MIN_ADA = 2_500_000n;
  export const SELLER_MIN_ADA = 2_500_000n;
  export const ORDER_MIN_ADA = 2_500_000n;

  export const MIN_POOL_ALLOCATION_POINT = 70n;
  export const MAX_POOL_ALLOCATION_POINT = 100n;
  export const MAX_PENALTY_RATE = 25n;

  export const MINIMUM_SELLER_COLLECTED = 20;
  export const MINIMUM_ORDER_COLLECTED = 30;
  export const MINIMUM_ORDER_REDEEMED = 30;

  export const MAX_DISCOVERY_RANGE = 2592000000n;
  export const MAX_PENALTY_RANGE = 172800000n;

  export const DEFAULT_SELLER_COUNT = 20n;

  export type Config = {
    factoryAsset: string;
    factoryHash: string;
    factoryHashBech32: string;
    factoryAddress: string;
    factoryRewardAddress: string;

    treasuryAsset: string;
    treasuryHash: string;
    treasuryHashBech32: string;
    treasuryAddress: string;

    managerAsset: string;
    managerHash: string;
    managerHashBech32: string;
    managerAddress: string;

    sellerAsset: string;
    sellerHash: string;
    sellerHashBech32: string;
    sellerAddress: string;

    orderAsset: string;
    orderHash: string;
    orderHashBech32: string;
    orderAddress: string;
  };

  export type DeployedScripts = {
    factory: OutRef;
    treasury: OutRef;
    manager: OutRef;
    seller: OutRef;
    order: OutRef;
  };
  const TESTNET_FACTORY_HASH =
    "7f2f769a9260eb698232022af03fba12ef0a29f94fc93c4fd2624972";
  const MAINNET_FACTORY_HASH =
    "dea947ac55fb4c2c38bb11341f2b82b2d62e1a120330f82dc1e56ead";
  export const CONFIG: Record<NetworkId, Config> = {
    [NetworkId.TESTNET]: {
      factoryAsset: TESTNET_FACTORY_HASH + FACTORY_AUTH_AN,
      factoryHash: TESTNET_FACTORY_HASH,
      factoryHashBech32:
        "script10uhhdx5jvr4knq3jqg40q0a6zths520eflyncn7jvfyhyqahrl3",
      factoryAddress:
        "addr_test1wplj7a56jfswk6vzxgpz4uplhgfw7z3fl98uj0z06f3yjusz7ufvk",
      factoryRewardAddress:
        "stake_test17plj7a56jfswk6vzxgpz4uplhgfw7z3fl98uj0z06f3yjuszkz3mu",

      treasuryAsset: TESTNET_FACTORY_HASH + TREASURY_AUTH_AN,
      treasuryHash: "f0dbf7cdc1042f403cad57cff6f602b2e657f8f557b8cf8c23482954",
      treasuryHashBech32:
        "script17rdl0nwpqsh5q09d2l8ldaszktn9078427uvlrprfq54gr7nrx6",
      treasuryAddress:
        "addr_test1wrcdha7dcyzz7spu44tulahkq2ewv4lc74tm3nuvydyzj4qx8r0da",

      managerAsset: TESTNET_FACTORY_HASH + MANAGER_AUTH_AN,
      managerHash: "46246888d57347a8ad2705843e9131f03e55701571896ed571f90e3a",
      managerHashBech32:
        "script1gcjx3zx4wdr63tf8qkzrayf37ql92uq4wxyka4t3ly8r5kjsrlk",
      managerAddress:
        "addr_test1wprzg6yg64e5029dyuzcg053x8cru4tsz4ccjmk4w8usuwsp4y75x",

      sellerAsset: TESTNET_FACTORY_HASH + SELLER_AUTH_AN,
      sellerHash: "f6ba0fa37ce6aaaf8da7b0ee4192361fd443a8d3d70fb275986a2fce",
      sellerHashBech32:
        "script176aqlgmuu642lrd8krhyry3krl2y82xn6u8myavcdghuukmdwrq",
      sellerAddress:
        "addr_test1wrmt5rar0nn24tud57cwusvjxc0agsag60tslvn4np4zlnszyuccc",

      orderAsset: TESTNET_FACTORY_HASH + ORDER_AUTH_AN,
      orderHash: "28ead81adf8154687e0d1d09d14375f6be0626107545a59d7d5e311a",
      orderHashBech32:
        "script19r4dsxkls92xslsdr5yazsm476lqvfssw4z6t8tatcc350sd37w",
      orderAddress:
        "addr_test1zq5w4kq6m7q4g6r7p5wsn52rwhmtup3xzp65tfva040rzx5rajt8r8wqtygrfduwgukk73m5gcnplmztc5tl5ngy0upqqym3e9",
    },
    [NetworkId.MAINNET]: {
      factoryAsset: MAINNET_FACTORY_HASH + FACTORY_AUTH_AN,
      factoryHash: MAINNET_FACTORY_HASH,
      factoryHashBech32:
        "script1m6550tz4ldxzcw9mzy6p72uzkttzuxsjqvc0stwpu4h26pl45ch",
      factoryAddress:
        "addr1w802j3av2ha5ctpchvgng8ets2edvts6zgpnp7pdc8jkatgwxaxhw",
      factoryRewardAddress:
        "stake17802j3av2ha5ctpchvgng8ets2edvts6zgpnp7pdc8jkatgjvaqtu",

      treasuryAsset: MAINNET_FACTORY_HASH + TREASURY_AUTH_AN,
      treasuryHash: "1ce6abbd967cab867ad73855f8b154fcc57e41b15605b91590451650",
      treasuryHashBech32:
        "script1rnn2h0vk0j4cv7kh8p2l3v25lnzhusd32czmj9vsg5t9q69xnhh",
      treasuryAddress:
        "addr1wywwd2aaje72hpn66uu9t7932n7v2ljpk9tqtwg4jpz3v5qpqs70n",

      managerAsset: MAINNET_FACTORY_HASH + MANAGER_AUTH_AN,
      managerHash: "e951d381ef510ae02b7496c2ff039e640ab2e2a561423d0cbf34b032",
      managerHashBech32:
        "script1a9ga8q002y9wq2m5jmp07qu7vs9t9c49v9pr6r9lxjcry2xehgl",
      managerAddress:
        "addr1w854r5upaags4cptwjtv9lcrnejq4vhz54s5y0gvhu6tqvsccjry6",

      sellerAsset: MAINNET_FACTORY_HASH + SELLER_AUTH_AN,
      sellerHash: "ecf97d6f0ace26e69fa428610c7dbf5a686e1197f76511449d9a1b64",
      sellerHashBech32:
        "script1anuh6mc2ecnwd8ay9psscldltf5xuyvh7aj3z3yangdkgh7ds8d",
      sellerAddress:
        "addr1w8k0jlt0pt8zde5l5s5xzrrahadxsms3jlmk2y2ynkdpkeqn95g7r",

      orderAsset: MAINNET_FACTORY_HASH + ORDER_AUTH_AN,
      orderHash: "5176775eed690d088bd29d9a6934b1e35ef1d897deb61d7b5dde11ca",
      orderHashBech32:
        "script129m8whhddyxs3z7jnkdxjd93ud00rkyhm6mp676amcgu5kg5c44",
      orderAddress:
        "addr1z9ghva67a45s6zyt62we56f5k834auwcjl0tv8tmth0prjjj2c79gy9l76sdg0xwhd7r0c0kna0tycz4y5s6mlenh8pqsk3urw",
    },
  };

  export const DEPLOYED_SCRIPTS: Record<NetworkId, DeployedScripts> = {
    [NetworkId.TESTNET]: {
      factory: {
        txHash:
          "834e0958594e51c525363bbdabd0cdbe773a358ac2e2c8321cc3f645b30335ae",
        outputIndex: 0,
      },
      treasury: {
        txHash:
          "a5b0274543fbad4ca79798be047317a0b4b270ab6011dd7e08fc663ba6ee1f32",
        outputIndex: 0,
      },
      manager: {
        txHash:
          "f0c8a033bf84faad54e70c9882057a422fa1ee257843fad0a07aa5eb7ee9ebaf",
        outputIndex: 0,
      },
      seller: {
        txHash:
          "a15c06f2fa3e91359136b346eae43997311644320e18a0c5f2ea40c8127c9284",
        outputIndex: 0,
      },
      order: {
        txHash:
          "a08042f93335157e6dd8e87feef448d5e9000f60ef14cbe19ae365c8de9bead8",
        outputIndex: 0,
      },
    },
    [NetworkId.MAINNET]: {
      factory: {
        txHash:
          "6b9976bb251ad15a21480bd37ea45343cff6fdd713744c1948ce674a8c4f510f",
        outputIndex: 0,
      },
      treasury: {
        txHash:
          "bf343adb586dab792665d23a1c1fa8727d2014e58630d007598296586782018d",
        outputIndex: 0,
      },
      manager: {
        txHash:
          "e8fb105295f8871670676fe2162f6a301c8413f8273a23cd1fde7c5f960db0af",
        outputIndex: 0,
      },
      seller: {
        txHash:
          "590ece2aa32fdc11c27a99ffe50392f8329e1645e9c3249cf0e3c3cd77cfa4e3",
        outputIndex: 0,
      },
      order: {
        txHash:
          "314cfc020092185a666cfc9d8d747dd0760358bc1cf06385343b97041b3c90ed",
        outputIndex: 0,
      },
    },
  };
}

export enum MetadataMessage {
  DEPOSIT_ORDER = "SDK Minswap: Deposit Order",
  CANCEL_ORDER = "SDK Minswap: Cancel Order",
  CANCEL_ORDERS_AUTOMATICALLY = "SDK Minswap: Cancel Orders Automatically",
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
  DONATION_ORDER = "SDK Minswap: Donation Order",
  MIXED_ORDERS = "SDK Minswap: Mixed Orders",
  CREATE_POOL = "SDK Minswap: Create Pool",
  // LAUNCH
  CREATE_EVENT = "SDK Minswap: Create Event",
  UPDATE_EVENT = "SDK Minswap: Update Event",
  CANCEL_EVENT_BY_OWNER = "SDK Minswap: Cancel Event By Onwer",
  CANCEL_EVENT_BY_WORKER = "SDK Minswap: Cancel Event By Worker",
  LBE_V2_DEPOSIT_ORDER_EVENT = "SDK Minswap: Deposit Lbe V2 Order",
  LBE_V2_WITHDRAW_ORDER_EVENT = "SDK Minswap: Withdraw Lbe V2 Order",
  CLOSE_EVENT = "SDK Minswap: Close Event",
  LBE_V2_ADD_SELLERS = "SDK Minswap: Lbe V2 add more sellers",
  LBE_V2_COUNTING_SELLERS = "SDK Minswap: Lbe V2 counting sellers",
  LBE_V2_COLLECT_MANAGER = "SDK Minswap: Lbe V2 collect manager",
  LBE_V2_COLLECT_ORDER = "SDK Minswap: Lbe V2 collect order",
  LBE_V2_REDEEM_LP = "SDK Minswap: Lbe V2 redeem lp",
  LBE_V2_REFUND = "SDK Minswap: Lbe V2 refund",
  LBE_V2_CREATE_AMM_POOL = "SDK Minswap: Lbe V2 create AMM pool",
}

export const FIXED_DEPOSIT_ADA = 2_000_000n;

export const SECURITY_PARAM: Record<NetworkEnvironment, number> = {
  [NetworkEnvironment.MAINNET]: 2160,
  [NetworkEnvironment.TESTNET_PREPROD]: 2160,
  [NetworkEnvironment.TESTNET_PREVIEW]: 2160,
};
