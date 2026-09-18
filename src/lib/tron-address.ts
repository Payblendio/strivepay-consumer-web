const BASE58="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes:Uint8Array){
  let zeros=0;
  while(zeros<bytes.length&&bytes[zeros]===0)zeros+=1;
  const digits=[0];
  for(let index=zeros;index<bytes.length;index+=1){
    let carry=bytes[index];
    for(let position=0;position<digits.length;position+=1){carry+=digits[position]<<8;digits[position]=carry%58;carry=(carry/58)|0;}
    while(carry>0){digits.push(carry%58);carry=(carry/58)|0;}
  }
  let output="1".repeat(zeros);
  for(let index=digits.length-1;index>=0;index-=1)output+=BASE58[digits[index]];
  return output;
}

function parseEvmPayload(address:string){
  const match=/^0x([0-9a-fA-F]{40})$/.exec(address.trim());
  if(!match)return null;
  const payload=new Uint8Array(21);payload[0]=0x41;
  for(let index=0;index<20;index+=1)payload[index+1]=Number.parseInt(match[1].slice(index*2,index*2+2),16);
  return payload;
}

export async function evmToTronAddress(address:string):Promise<string|null>{
  const trimmed=address.trim();
  if(/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed))return trimmed;
  const payload=parseEvmPayload(trimmed);
  if(!payload)return null;
  const first=await crypto.subtle.digest("SHA-256",payload.buffer as ArrayBuffer),second=await crypto.subtle.digest("SHA-256",first),checksum=new Uint8Array(second).slice(0,4),full=new Uint8Array(25);
  full.set(payload);full.set(checksum,21);
  return base58Encode(full);
}

export function isEvmReceivingAddress(address:string){return /^0x[0-9a-fA-F]{40}$/.test(address.trim());}
