import { Addresses, Utils } from "@spacebudz/lucid";

export function getScriptHashFromAddress(addr: string): string | null {
  try {
    const addrDetail = Addresses.inspect(addr);
    const scriptHash =  addrDetail.payment?.hash;
    if (!scriptHash) {
      return null
    }

    return Utils.encodeBech32('script', scriptHash);
  } catch {
    return null
  }
}
