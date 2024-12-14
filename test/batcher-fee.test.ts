import invariant from '@minswap/tiny-invariant';
import { NetworkEnvironment } from '../src';
import { BatcherFee } from '../src/batcher-fee-reduction/calculate';
import {
  BatcherFeeConfig,
  DexVersion,
} from '../src/batcher-fee-reduction/configs.internal';
import { Assets } from '@minswap/lucid-cardano';

function compareAssets(a1: Assets, a2: Assets): boolean {
  if (Object.keys(a1).length !== Object.keys(a2).length) {
    return false;
  }

  let isEqual: boolean = true;
  for (const [asset1, amount1] of Object.entries(a1)) {
    if (asset1 in a2) {
      if (amount1 !== a2[asset1]) {
        isEqual = false;
        break;
      }
    } else {
      isEqual = false;
      break;
    }
  }
  return isEqual;
}

test('Batcher Fee reduction test', () => {
  for (const [networkEnvStr, batcherFeeMap] of Object.entries(
    BatcherFeeConfig.CONFIG,
  )) {
    let networkEnv: NetworkEnvironment;
    switch (networkEnvStr) {
      case NetworkEnvironment.MAINNET.toString(): {
        networkEnv = NetworkEnvironment.MAINNET;
        break;
      }
      case NetworkEnvironment.TESTNET_PREPROD.toString(): {
        networkEnv = NetworkEnvironment.TESTNET_PREPROD;
        break;
      }
      case NetworkEnvironment.TESTNET_PREVIEW.toString(): {
        networkEnv = NetworkEnvironment.TESTNET_PREVIEW;
        break;
      }
      default: {
        throw new Error('Unexpected Network');
      }
    }
    for (const [dexVersionStr, batcherFeeConfig] of Object.entries(
      batcherFeeMap,
    )) {
      let dexVersion: DexVersion;
      switch (dexVersionStr) {
        case DexVersion.DEX_V1:
        case DexVersion.DEX_V2:
        case DexVersion.STABLESWAP: {
          dexVersion = dexVersionStr;
          break;
        }
        default: {
          throw new Error('Unexpected DEX version');
        }
      }
      for (const reduction of batcherFeeConfig.reduction) {
        const date = new Date(reduction.startTime.getTime() + 1);
        // const defaultFee = getStandardBatcherFee(networkEnv, dexVersion, date);
        // No Reduction
        const nonReductionFee = BatcherFee.finalizeFee({
          networkEnv: networkEnv,
          dexVersion: dexVersion,
          currentDate: date,
          utxos: [],
          orderAssets: {},
        });

        invariant(nonReductionFee.batcherFee === reduction.maxFee);
        // Maximum Reduction
        for (const { asset, maximumAmount } of reduction.assets) {
          const discountFee1 = BatcherFee.finalizeFee({
            networkEnv: networkEnv,
            dexVersion: dexVersion,
            currentDate: reduction.startTime,
            utxos: [
              {
                txHash:
                  '73fe9271c8e2b11430d76bfe4b0dad4816c326d08e63439130c863b0a1932649',
                outputIndex: 0,
                address:
                  'addr_test1qz09ls06gtsnws8dhquh273tnzj0avf8fumakgmdc40cwazvh204krl8rn5cvnepdzn5zj55wk4uy8nnzwklhzcvtyws67g5de',
                assets: {
                  lovelace: 10_000000n,
                  [asset]: maximumAmount,
                },
              },
            ],
            orderAssets: {},
          });

          const discountFee2 = BatcherFee.finalizeFee({
            networkEnv: networkEnv,
            dexVersion: dexVersion,
            currentDate: reduction.startTime,
            utxos: [
              {
                txHash:
                  '73fe9271c8e2b11430d76bfe4b0dad4816c326d08e63439130c863b0a1932649',
                outputIndex: 0,
                address:
                  'addr_test1qz09ls06gtsnws8dhquh273tnzj0avf8fumakgmdc40cwazvh204krl8rn5cvnepdzn5zj55wk4uy8nnzwklhzcvtyws67g5de',
                assets: {
                  lovelace: 10_000000n,
                  [asset]: maximumAmount * 2n,
                },
              },
            ],
            orderAssets: {
              lovelace: 2_000000n,
              [asset]: maximumAmount,
            },
          });
          invariant(discountFee1.batcherFee === reduction.minFee);
          invariant(discountFee2.batcherFee === reduction.minFee);
          invariant(
            compareAssets(discountFee1.reductionAssets, {
              [asset]: maximumAmount,
            }),
          );
          invariant(
            compareAssets(discountFee2.reductionAssets, {
              [asset]: maximumAmount,
            }),
          );
        }

        // Partial Reduction
        for (const { asset, maximumAmount } of reduction.assets) {
          const discountFee1 = BatcherFee.finalizeFee({
            networkEnv: networkEnv,
            dexVersion: dexVersion,
            currentDate: reduction.startTime,
            utxos: [
              {
                txHash:
                  '73fe9271c8e2b11430d76bfe4b0dad4816c326d08e63439130c863b0a1932649',
                outputIndex: 0,
                address:
                  'addr_test1qz09ls06gtsnws8dhquh273tnzj0avf8fumakgmdc40cwazvh204krl8rn5cvnepdzn5zj55wk4uy8nnzwklhzcvtyws67g5de',
                assets: {
                  lovelace: 10_000000n,
                  [asset]: maximumAmount / 2n,
                },
              },
            ],
            orderAssets: {},
          });
          const discountFee2 = BatcherFee.finalizeFee({
            networkEnv: networkEnv,
            dexVersion: dexVersion,
            currentDate: reduction.startTime,
            utxos: [
              {
                txHash:
                  '73fe9271c8e2b11430d76bfe4b0dad4816c326d08e63439130c863b0a1932649',
                outputIndex: 0,
                address:
                  'addr_test1qz09ls06gtsnws8dhquh273tnzj0avf8fumakgmdc40cwazvh204krl8rn5cvnepdzn5zj55wk4uy8nnzwklhzcvtyws67g5de',
                assets: {
                  lovelace: 10_000000n,
                  [asset]: maximumAmount,
                },
              },
            ],
            orderAssets: {
              lovelace: 2_000000n,
              [asset]: maximumAmount / 2n,
            },
          });

          const fiftyPercentDiscountFee =
            (reduction.maxFee + reduction.minFee) / 2n;
          invariant(discountFee1.batcherFee === fiftyPercentDiscountFee);
          invariant(discountFee2.batcherFee === fiftyPercentDiscountFee);
          invariant(
            compareAssets(discountFee1.reductionAssets, {
              [asset]: maximumAmount / 2n,
            }),
          );
          invariant(
            compareAssets(discountFee2.reductionAssets, {
              [asset]: maximumAmount / 2n,
            }),
          );
        }
      }
    }
  }
});
