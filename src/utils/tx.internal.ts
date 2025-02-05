import { Addresses, Assets, OutputData } from "@spacebudz/lucid";

/**
 * Return a Output that pay back to @sender and include @datum
 * This function is used for @receiver of an order can be a script
 * @param lucid
 * @param sender
 * @param receiver
 * @param datum
 */
export function buildUtxoToStoreDatum(
    sender: string,
    receiver: string,
    datum: string
): {
    address: string;
    outputData: OutputData;
    assets: Assets;
} | null {
    const receivePaymentCred =
        Addresses.inspect(receiver).payment;
    // If receiver is not a script address, we no need to store this datum On-chain because it's useless
    if (!receivePaymentCred || receivePaymentCred.type === "Key") {
        return null;
    }

    return {
        address: sender,
        assets: {},
        outputData: {
            Inline: datum,
        },
    };
}