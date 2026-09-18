export type SchemaProperty={type?:string;description?:string;enum?:Array<string|boolean>;example?:string|boolean;minLength?:number;maxLength?:number;pattern?:string;required?:string[];properties?:Record<string,SchemaProperty>};
export type BankForm={currency:string;id:string;title:string;route:string;preview:boolean;requiredFields:string[];optionalFields:string[];accountDetailsSchema:{required:string[];properties:Record<string,SchemaProperty>}};
export type BankFormPayload=Record<string,unknown>;
export type PayoutFieldControl="bank-select"|"choice"|"text";
export type VisiblePayoutField={key:string;rule:SchemaProperty;control:PayoutFieldControl;label:string;wide:boolean};

function record(value:unknown):Record<string,unknown>{if(typeof value==="string"){try{return record(JSON.parse(value));}catch{return {};}}if(!value||typeof value!=="object"||Array.isArray(value))return {};const item=value as Record<string,unknown>;return "payload" in item&&Object.keys(item).length===1?record(item.payload):item;}
function strings(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"):[];}
function numberValue(value:unknown){return typeof value==="number"&&Number.isFinite(value)?value:undefined;}
function schemaProperty(value:unknown):SchemaProperty{
  const item=record(value),nested=record(item.properties),properties:Record<string,SchemaProperty>={};
  for(const[key,rule]of Object.entries(nested))properties[key]=schemaProperty(rule);
  const required=strings(item.required);
  if(!Object.keys(properties).length)for(const key of required)if(normalizeFieldName(key)!=="currency")properties[key]={type:"string"};
  return {type:typeof item.type==="string"?item.type:undefined,description:typeof item.description==="string"?item.description:undefined,enum:Array.isArray(item.enum)?item.enum.filter((entry):entry is string|boolean=>typeof entry==="string"||typeof entry==="boolean"):undefined,example:typeof item.example==="string"||typeof item.example==="boolean"?item.example:undefined,minLength:numberValue(item.minLength),maxLength:numberValue(item.maxLength),pattern:typeof item.pattern==="string"?item.pattern:undefined,required,properties:Object.keys(properties).length?properties:undefined};
}
export function normalizeFieldName(value:string){return value.replaceAll("_","").toLowerCase();}
export function payoutFieldLabel(key:string){const name=normalizeFieldName(key);return FIELD_LABELS[name]??key.replace(/([a-z0-9])([A-Z])/g,"$1 $2").replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());}
export function payoutFieldKey(form:BankForm|null,name:string){return Object.keys(form?.accountDetailsSchema.properties??{}).find(key=>normalizeFieldName(key)===normalizeFieldName(name));}
export function isDigitPayoutField(key:string){return new Set(["accountnumber","routingnumber","sortcode","bankcode","transitcode","nationalidentifier","taxid"]).has(normalizeFieldName(key));}

const FIELD_HINT_FALLBACKS:Record<string,string>={iban:"International Bank Account Number",swiftcode:"8 or 11 character SWIFT/BIC code",bic:"8 or 11 character BIC",sortcode:"6 digits, no hyphens",routingnumber:"9-digit ABA routing number",ifsc:"11-character IFSC",pixkey:"Email, phone, CPF, or random PIX key. CNPJ is not accepted.",taxid:"Tax ID in the local format",transitcode:"Transit number",accountnumber:"Bank account number",recipientphonenumber:"Mobile money phone number"};
function cleanHint(value?:string){if(!value?.trim())return undefined;return value.replace(/`([^`]+)`/g,"$1").replace(/\\d\{(\d+)\}/g,"$1 digits").replace(/\\d/g,"digits").replace(/\s+/g," ").trim();}
function lengthHint(rule:SchemaProperty){
  const min=rule.minLength,max=rule.maxLength,digits=Boolean(rule.pattern&&(/\[0-9\]/.test(rule.pattern)||/\\d/.test(rule.pattern)));
  const unit=digits?"digits":"characters";
  if(min!=null&&max!=null&&min===max)return `Exactly ${min} ${unit}`;
  if(min!=null&&max!=null)return `${min}–${max} ${unit}`;
  if(min!=null)return `At least ${min} ${unit}`;
  if(max!=null)return `Up to ${max} ${unit}`;
  return undefined;
}
export function payoutFieldHint(key:string,rule:SchemaProperty,control?:PayoutFieldControl){
  if(control==="choice"||control==="bank-select")return undefined;
  const cleaned=cleanHint(rule.description),length=lengthHint(rule);
  if(cleaned)return length&&!/\d/.test(cleaned)?`${cleaned}. ${length}`:cleaned;
  return length??FIELD_HINT_FALLBACKS[normalizeFieldName(key)];
}

const FIELD_LABELS:Record<string,string>={bankcode:"Bank code",bankname:"Bank name",accountnumber:"Account number",sortcode:"Sort code",routingnumber:"Routing number",iban:"IBAN",swiftcode:"SWIFT code",bic:"BIC",ifsc:"IFSC",accounttype:"Account type",recipientrelationship:"Recipient relationship",remittancepurpose:"Remittance purpose",recipientphonenumber:"Mobile money number",ismobilewallet:"Payout method",pixkey:"PIX key",nationalidentifier:"National ID",taxid:"Tax ID",transitcode:"Transit code",recipientfirstname:"Recipient first name",recipientlastname:"Recipient last name",recipientaddressline:"Address",recipientcountry:"Country",recipientcity:"City"};
const BAKKT_FIELD_ENUMS:Record<string,Array<string|boolean>>={
  recipientrelationship:["Self","Friend","Employer","Colleague","Family","Husband","Wife","Father","Mother","Son","Daughter","Brother","Sister"],
  remittancepurpose:["Salary","Real Estate","Savings","Gift","Education Support","Home Improvement"],
  accounttype:["checking","savings"],
};
const DEFAULT_THIRD_PARTY_FIELDS=["recipient_first_name","recipient_last_name"];
const FIELD_ORDER=["is_mobile_wallet","country","bank_code","bank_name","iban","sort_code","routing_number","transit_code","ifsc","account_type","account_number","swift_code","bic","pix_key","national_identifier","tax_id","recipient_phone_number","recipient_relationship","remittance_purpose"];
const WIDE_PAYOUT_FIELDS=new Set(["accountnumber","iban","pixkey","bankname","swiftcode","bic","recipientphonenumber","recipientaddressline"]);
function fieldRank(key:string){const index=FIELD_ORDER.findIndex(item=>normalizeFieldName(item)===normalizeFieldName(key));return index<0?FIELD_ORDER.length:index;}
function withBakktFieldEnum(key:string,rule:SchemaProperty):SchemaProperty{
  if(rule.enum?.length)return rule;
  const fallback=BAKKT_FIELD_ENUMS[normalizeFieldName(key)];
  return fallback?{...rule,enum:fallback}:rule;
}
function applyBakktEnums(properties:Record<string,SchemaProperty>){
  for(const key of Object.keys(properties)){
    const rule=properties[key];
    if(rule.properties)applyBakktEnums(rule.properties);
    properties[key]=withBakktFieldEnum(key,rule);
  }
}
function payoutField(key:string,rule:SchemaProperty,control?:PayoutFieldControl):VisiblePayoutField{
  const resolved=withBakktFieldEnum(key,rule);
  return {key,rule:resolved,control:control??(resolved.enum?.length?"choice":"text"),label:payoutFieldLabel(key),wide:false};
}
function withPayoutLayout(fields:VisiblePayoutField[]):VisiblePayoutField[]{
  const marked=fields.map(field=>({...field,wide:field.control==="bank-select"||WIDE_PAYOUT_FIELDS.has(normalizeFieldName(field.key))}));
  return marked.map((field,index)=>{
    if(field.wide)return field;
    const prevShort=index>0&&!marked[index-1].wide;
    const nextShort=index<marked.length-1&&!marked[index+1].wide;
    return prevShort||nextShort?field:{...field,wide:true};
  });
}

function hiddenPayoutDetail(key:string,rule:SchemaProperty){
  const name=normalizeFieldName(key);
  return name==="currency"||name==="transfermethod"||name==="thirdpartydetails"||rule.type==="object"||(rule.enum?.length===1);
}

export function visiblePayoutFields(form:BankForm|null,supportedBankCount:number):VisiblePayoutField[]{
  if(!form)return [];
  const properties=form.accountDetailsSchema.properties;
  const keys=Object.keys(properties);
  const bankCodeKey=keys.find(key=>normalizeFieldName(key)==="bankcode");
  const bankNameKey=keys.find(key=>normalizeFieldName(key)==="bankname");
  const useBankSelect=supportedBankCount>0&&Boolean(bankCodeKey||bankNameKey);
  const fields:VisiblePayoutField[]=[];
  for(const key of keys){
    const rule=properties[key],name=normalizeFieldName(key);
    if(hiddenPayoutDetail(key,rule))continue;
    if(useBankSelect&&name==="bankname"&&bankCodeKey)continue;
    if(useBankSelect&&(name==="bankcode"||name==="bankname"&&!bankCodeKey)){fields.push({...payoutField(key,rule,"bank-select"),label:"Bank"});continue;}
    fields.push(payoutField(key,rule));
  }
  return withPayoutLayout(fields.sort((a,b)=>fieldRank(a.key)-fieldRank(b.key)||a.key.localeCompare(b.key)));
}

export function thirdPartyRecipientFields(form:BankForm|null):VisiblePayoutField[]{
  if(!form)return [];
  const rule=Object.entries(form.accountDetailsSchema.properties).find(([key])=>normalizeFieldName(key)==="thirdpartydetails")?.[1];
  if(!rule)return [];
  const props=rule.properties??{};
  const keys=Object.keys(props).length?Object.keys(props):((rule.required??[]).length?rule.required??[]:DEFAULT_THIRD_PARTY_FIELDS);
  return withPayoutLayout(keys.filter(key=>normalizeFieldName(key)!=="currency").map(key=>payoutField(key,props[key]??{type:"string"})));
}

export function normalizeBankForm(value:unknown):BankForm|null{
  const item=record(value),currency=typeof item.currency==="string"?item.currency.toUpperCase():"",id=typeof item.id==="string"?item.id:"";if(!currency||!id)return null;
  const requiredFields=strings(item.requiredFields??item.required_fields),optionalFields=strings(item.optionalFields??item.optional_fields);const rawSchema=record(item.accountDetailsSchema??item.account_details_schema);const rawProperties=record(rawSchema.properties);const properties:Record<string,SchemaProperty>={};for(const [key,rule] of Object.entries(rawProperties))properties[key]=schemaProperty(rule);
  const required=strings(rawSchema.required);const requiredKeys=required.length?required:requiredFields;const allFields=Array.from(new Set([...requiredKeys,...optionalFields]));const body=record(item.sampleSelfBody??item.sample_self_body);const sample=record(body.account_details??body.accountDetails);
  if(!Object.keys(properties).length)for(const key of allFields){const flat=normalizeFieldName(key),example=sample[key]??Object.entries(sample).find(([sampleKey])=>normalizeFieldName(sampleKey)===flat)?.[1];properties[key]={type:typeof example==="boolean"?"boolean":"string",enum:(flat==="currency"||flat==="transfermethod"||flat==="ismobilewallet")&&(typeof example==="string"||typeof example==="boolean")?[example]:flat==="currency"?[currency]:undefined,example:typeof example==="string"||typeof example==="boolean"?example:undefined};}
  const enumOptions=record(item.enumOptions??item.enum_options);
  for(const [path,values] of Object.entries(enumOptions)){
    const key=path.split(".").pop()??"";
    const match=Object.keys(properties).find(itemKey=>normalizeFieldName(itemKey)===normalizeFieldName(key));
    if(!match||properties[match].enum?.length||!Array.isArray(values))continue;
    const options=values.filter((entry):entry is string|boolean=>typeof entry==="string"||typeof entry==="boolean");
    if(options.length)properties[match]={...properties[match],enum:options};
  }
  applyBakktEnums(properties);
  return {currency,id,title:typeof item.title==="string"?item.title:`${currency} bank account`,route:typeof item.route==="string"?item.route:"Bank account",preview:item.preview===true,requiredFields:requiredKeys,optionalFields,accountDetailsSchema:{required:requiredKeys,properties}};
}
