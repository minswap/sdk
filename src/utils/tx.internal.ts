import { Address, Assets, Lucid, OutputData } from "lucid-cardano";

/**
 * Return a Output that pay back to @sender and include @datum
 * This function is used for @receiver of an order can be a script
 * @param lucid
 * @param sender
 * @param receiver
 * @param datum
 */
export function buildUtxoToStoreDatum(
    lucid: Lucid,
    sender: Address,
    receiver: Address,
    datum: string
): {
    address: Address;
    outputData: OutputData;
    assets: Assets;
} | null {
    const receivePaymentCred =
        lucid.utils.getAddressDetails(receiver).paymentCredential;
    // If receiver is not a script address, we no need to store this datum On-chain because it's useless
    if (!receivePaymentCred || receivePaymentCred.type === "Key") {
        return null;
    }

    return {
        address: sender,
        assets: {},
        outputData: {
            inline: datum,
        },
    };
}