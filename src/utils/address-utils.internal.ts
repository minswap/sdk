import { Addresses } from "@spacebudz/lucid/mod";

export function getScriptHashFromAddress(addr: string): string | null { // TODO
  try {
    const addrDetail = Addresses.inspect(addr);
    const scriptHash =  addrDetail.delegation?.hash;
    return scriptHash ? scriptHash : null;
  } catch {
    return null
  }
}