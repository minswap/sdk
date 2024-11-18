import { CML } from "@lucid-evolution/lucid";

export function getScriptHashFromAddress(addr: string): string | null {
  try {
    const cslAddr = CML.Address.from_bech32(addr);
    const specificAddr =
      CML.BaseAddress.from_address(cslAddr) ||
      CML.EnterpriseAddress.from_address(cslAddr) ||
      CML.PointerAddress.from_address(cslAddr) ||
      CML.RewardAddress.from_address(cslAddr);
    if (!specificAddr) {
      return null;
    }
    return (
      specificAddr.payment().as_script()?.to_bech32("script") ?? null
    );
  } catch {
    return null
  }
}