// Match the provider's address-line character set; do not silently rewrite an address.
export function addressCharacterError(address: {addressLine1: string; addressLine2?: string}, label = "Address"): string | null {
  for (const [field, value] of [["line 1", address.addressLine1], ["line 2", address.addressLine2 ?? ""]]) {
    if (/[^A-Za-z0-9 /#()'.,-]/.test(value)) {
      return `${label} ${field}: use A–Z letters, numbers, spaces or - / # ( ) ' . , only. Use ss for ß, ae for ä, oe for ö and ue for ü.`;
    }
  }
  return null;
}
