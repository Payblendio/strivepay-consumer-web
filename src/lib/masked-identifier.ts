/** Keep payout identifiers useful for recognition without exposing a full bank number. */
export function maskBankIdentifier(value?:string|null){
  const raw=value?.trim();
  if(!raw)return "Verified account";
  const compact=raw.replace(/\s+/g,"");
  const prefix=/^[A-Za-z]{2}/.test(compact)?compact.slice(0,2).toUpperCase():"";
  const normalized=compact.replace(/[^A-Za-z0-9]/g,"");
  const suffix=normalized.length>4||/[\*•●×…]/.test(raw)?normalized.slice(-4):"";
  return `${prefix?`${prefix} `:""}••••${suffix?` ${suffix}`:""}`;
}
