import { POOL_ADDRESS_LIST } from "../constants";
import { isValidPoolOutput, PoolState } from "../types/pool";
import { NetworkId, TxIn, Value } from "../types/tx";

test("can handle pool with one side being LP tokens", () => {
  const address = POOL_ADDRESS_LIST[NetworkId.TESTNET][0];
  const txIn: TxIn = {
    txHash: "8626060cf100c9b777546808e0ad20c099fe35cfcaee8de0079aa6c6931d345b",
    index: 3,
  };
  const value: Value = [
    { unit: "lovelace", quantity: "111990389" },
    {
      unit: "0be55d262b29f564998ff81efe21bdc0022621c12f15af08d0f2ddb13e4a0451d432d1e4dbd6c5c6aebfbd0b995a72d52be4d3e2d184e4b1081d3b13",
      quantity: "1",
    },
    {
      unit: "13aa2accf2e1561723aa26871e071fdf32c867cff7e7d50ad470d62f4d494e53574150",
      quantity: "1",
    },
    {
      unit: "e4214b7cce62ac6fbba385d164df48e157eae5863521b4b67ca71d866aa2153e1ae896a95539c9d62f76cedcdabdcdf144e564b8955f609d660cf6a2",
      quantity: "212939798",
    },
  ];
  const datumHash =
    "421d71a088b55789301a403994760d1f2854444b0380fc3df8970f8e212b3f30";
  expect(
    isValidPoolOutput(NetworkId.TESTNET, address, value, datumHash)
  ).toBeTruthy();
  expect(new PoolState(txIn, value, datumHash)).toBeInstanceOf(PoolState);
});
