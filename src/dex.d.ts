import { Lucid, Network } from "lucid-cardano";
export type CancelOrderOptions = {
    orderId: string;
};
export declare class Dex {
    private lucid;
    private readonly projectId;
    private readonly network;
    private readonly blockfrostUrl;
    private readonly blockfrostAdapter;
    constructor(projectId: string, network: Network, blockfrostUrl: string);
    getLucidInstance(): Promise<Lucid>;
    buildCancelOrder(orderId: string): Promise<string>;
}
