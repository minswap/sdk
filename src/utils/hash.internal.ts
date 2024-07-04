import { SHA3 } from "sha3";

export function sha3(hex: string): string {
    const hash = new SHA3(256);
    hash.update(hex, "hex");
    return hash.digest("hex");
}