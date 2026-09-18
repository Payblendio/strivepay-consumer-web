export type ReadyPreference={fiatCurrency:string;token:string;network:string;routeType?:"NATIVE"|"COMPOSITE"|"STABLECOIN";address?:string|null};
export type ReadyFunding={currency?:string;accountMask?:string|null;accountNumber?:string|null;bankName?:string|null;bankCode?:string|null;routingMask?:string|null;routingNumber?:string|null;accountName?:string|null;status?:string;id?:string};
export type ReadyPayout={currency?:string;accountName?:string;accountMask?:string};
export type ReadyLane={kicker:string;title:string;line:string;from:string;to:string;fiat:string;token:string};

export function titleCase(value:string){return value.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase());}
export function shortenAddress(value?:string|null){if(!value)return null;const trimmed=value.trim();if(trimmed.length<=14)return trimmed;return `${trimmed.slice(0,6)}…${trimmed.slice(-4)}`;}
export function networkLabel(code?:string|null){return code?titleCase(code):"your network";}
function tokenLabel(code?:string|null){return code?code.replace("_","."):"crypto";}
function accountLabel(name?:string|null,mask?:string|null){return [name?.trim(),mask?.trim()].filter(Boolean).join(" · ")||"your payout account";}
function payInLabel(account:ReadyFunding|null){return account?.accountMask||account?.accountNumber||account?.bankName||"your pay-in account";}

export function buyLane(preference:ReadyPreference|null,funding:ReadyFunding|null):ReadyLane{
  const fiat=preference?.fiatCurrency||funding?.currency||"fiat";
  const token=tokenLabel(preference?.token);
  const network=networkLabel(preference?.network);
  const wallet=shortenAddress(preference?.address);
  return {
    kicker:"Buy",
    title:`${fiat} → ${token}`,
    line:`Send ${fiat} to your pay-in account. ${token} arrives on ${network}.`,
    from:`Pay-in · ${payInLabel(funding)}`,
    to:wallet?`Wallet · ${wallet}`:"Your wallet",
    fiat,token:preference?.token||"USDC",
  };
}

export function sellLane(preference:ReadyPreference|null,payout:ReadyPayout|null):ReadyLane{
  const token=tokenLabel(preference?.token);
  const fiat=payout?.currency||preference?.fiatCurrency||"fiat";
  const wallet=shortenAddress(preference?.address);
  return {
    kicker:"Sell",
    title:`${token} → ${fiat}`,
    line:`Send ${token}. ${fiat} settles to your payout account.`,
    from:wallet?`Wallet · ${wallet}`:"Your wallet",
    to:accountLabel(payout?.accountName,payout?.accountMask),
    fiat,token:preference?.token||"USDC",
  };
}
