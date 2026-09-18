export function apiErrorMessage(value:unknown,fallback:string){
  const texts=collectErrorTexts(value).map(cleanErrorText).filter(Boolean);
  return texts[0]??fallback;
}

function collectErrorTexts(value:unknown,depth=0):string[]{
  if(depth>4||value==null)return [];
  if(typeof value==="string")return value.trim()?[value.trim()]:[];
  if(Array.isArray(value))return value.flatMap(item=>collectErrorTexts(item,depth+1));
  if(typeof value!=="object")return [];
  const item=value as Record<string,unknown>;
  const keys=["detail","title","message","error","cause","description"];
  const out:string[]=[];
  for(const key of keys)out.push(...collectErrorTexts(item[key],depth+1));
  if("errors" in item)out.push(...collectErrorTexts(item.errors,depth+1));
  return out;
}

function cleanErrorText(value:string){
  return value.replace(/\s+/g," ").replace(/^"(.*)"$/,"$1").trim();
}
