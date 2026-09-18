/** Canonical transport value; formatting spaces are safe to omit. */
export function normalizeIban(value:string){return value.replace(/\s/g,"").toUpperCase();}

/** Syntax/checksum preflight only, not proof that an account exists or is owned. */
export function isValidIban(value:string){
  const iban=normalizeIban(value);
  if(!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban))return false;
  if(iban.startsWith("DE")&&!/^DE\d{20}$/.test(iban))return false;
  const rearranged=iban.slice(4)+iban.slice(0,4);
  let remainder=0;
  for(const character of rearranged){
    const digits=/[A-Z]/.test(character)?String(character.charCodeAt(0)-55):character;
    for(const digit of digits)remainder=(remainder*10+Number(digit))%97;
  }
  return remainder===1;
}
