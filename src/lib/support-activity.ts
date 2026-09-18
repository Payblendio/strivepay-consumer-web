export type SupportActivity={kind:"RAMP"|"CONVERSION"|"ORDER";id:string};
export function parseSupportActivity(kind:string|null,id:string|null):SupportActivity|null{
  if(!kind||!["RAMP","CONVERSION","ORDER"].includes(kind)||!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;
  return {kind:kind as SupportActivity["kind"],id};
}
