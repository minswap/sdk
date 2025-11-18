import { getBackendBlockfrostLucidInstance, NetworkId } from "../src";
import { Dao } from "../src/dao";

async function main() {
  const networkId: NetworkId = NetworkId.TESTNET;
  const blockfrostProjectId = "<YOUR_BLOCKFROST_API_KEY>";
  const blockfrostUrl = "https://cardano-preprod.blockfrost.io/api/v0";

  const walletAddr = "<YOUR_WALLET_ADDRESS>";

  const lucid = await getBackendBlockfrostLucidInstance(
    networkId,
    blockfrostProjectId,
    blockfrostUrl,
    walletAddr
  );
  lucid.selectWalletFromSeed("<YOUR_WALLET_SEED_PHRASE>");

  const daoTx = new Dao(lucid);

  const tx = await daoTx.updatePoolFeeTx({
    managerAddress: walletAddr,
    poolLPAsset: {
      policyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
      tokenName:
        "de0c83dde8b048b4883695cc3977619598e65a2d2c21ac2b57a5fb2494f19056",
    },
    newFeeA: 0.9,
    newFeeB: 0.3,
  });

  const signedTx = await tx.sign().commit();
  const txHash = await signedTx.submit();
  console.log("Transaction submitted successfully: ", txHash);
}

main();
