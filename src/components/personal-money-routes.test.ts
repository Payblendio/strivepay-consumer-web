import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";
import {normalizeBankForm,payoutFieldHint,thirdPartyRecipientFields,visiblePayoutFields} from "./payout-form-schema";

describe("payout account requirements",()=>{
  it("reconstructs required EUR fields when a summary response contains an empty schema",()=>{
    const form=normalizeBankForm({currency:"EUR",id:"eur",route:"bank account",requiredFields:["currency","iban"],accountDetailsSchema:{}});
    expect(form?.accountDetailsSchema.required).toEqual(["currency","iban"]);
    expect(form?.accountDetailsSchema.properties.iban).toEqual({type:"string",enum:undefined,example:undefined});
  });

  it("accepts snake-case schema properties from the payout requirements API",()=>{
    const form=normalizeBankForm({currency:"GBP",id:"gbp",required_fields:["currency","account_number","sort_code"],account_details_schema:{required:["currency","account_number","sort_code"],properties:{currency:{type:"string",enum:["GBP"]},account_number:{type:"string"},sort_code:{type:"string"}}}});
    expect(Object.keys(form?.accountDetailsSchema.properties??{})).toEqual(["currency","account_number","sort_code"]);
  });

  it("preserves enum options and nested third-party recipient fields",()=>{
    const form=normalizeBankForm({currency:"INR",id:"inr",account_details_schema:{required:["currency","recipient_relationship","remittance_purpose"],properties:{currency:{type:"string",enum:["INR"]},recipient_relationship:{type:"string",enum:["Self","Friend","Employer"]},remittance_purpose:{type:"string",enum:["Salary","Gift"]},third_party_details:{type:"object",required:["recipient_first_name","recipient_last_name"],properties:{recipient_first_name:{type:"string"},recipient_last_name:{type:"string"}}}}}});
    expect(form?.accountDetailsSchema.properties.recipient_relationship.enum).toEqual(["Self","Friend","Employer"]);
    expect(form?.accountDetailsSchema.properties.third_party_details.required).toEqual(["recipient_first_name","recipient_last_name"]);
    expect(Object.keys(form?.accountDetailsSchema.properties.third_party_details.properties??{})).toEqual(["recipient_first_name","recipient_last_name"]);
  });

  it("shows a bank selector for NGN bank_code instead of hiding the field",()=>{
    const form=normalizeBankForm({currency:"NGN",id:"ngn",account_details_schema:{required:["currency","account_number","bank_code"],properties:{currency:{type:"string",enum:["NGN"]},account_number:{type:"string",description:"The NUBAN number (10-digits)",example:"2982352921"},bank_code:{type:"string",description:"The bank's code (3-digits)",example:"058"},third_party_details:{type:"object",required:["recipient_first_name","recipient_last_name"],properties:{recipient_first_name:{type:"string"},recipient_last_name:{type:"string"}}}}}});
    expect(visiblePayoutFields(form,0).map(item=>item.key)).toEqual(["bank_code","account_number"]);
    expect(visiblePayoutFields(form,5).map(item=>({key:item.key,control:item.control,wide:item.wide}))).toEqual([{key:"bank_code",control:"bank-select",wide:true},{key:"account_number",control:"text",wide:true}]);
  });

  it("keeps USD ACH routing and account number while hiding the fixed transfer method",()=>{
    const form=normalizeBankForm({currency:"USD",id:"usd_ach",account_details_schema:{required:["currency","transfer_method","account_number","routing_number"],properties:{currency:{type:"string",enum:["USD"]},transfer_method:{type:"string",enum:["ACH"]},account_number:{type:"string",minLength:8,maxLength:12},routing_number:{type:"string",minLength:9,maxLength:9},account_type:{type:"string",enum:["checking","savings"]}}}});
    expect(visiblePayoutFields(form,0).map(item=>({key:item.key,wide:item.wide}))).toEqual([{key:"routing_number",wide:false},{key:"account_type",wide:false},{key:"account_number",wide:true}]);
    expect(form?.accountDetailsSchema.properties.account_number.maxLength).toBe(12);
  });

  it("shows first and last name for NGN third-party recipients",()=>{
    const form=normalizeBankForm({currency:"NGN",id:"ngn",account_details_schema:{required:["currency","account_number","bank_code"],properties:{currency:{type:"string",enum:["NGN"]},account_number:{type:"string"},bank_code:{type:"string"},third_party_details:{type:"object",required:["recipient_first_name","recipient_last_name"],properties:{recipient_first_name:{type:"string",example:"John"},recipient_last_name:{type:"string",example:"Doe"}}}}}});
    expect(thirdPartyRecipientFields(form).map(item=>item.key)).toEqual(["recipient_first_name","recipient_last_name"]);
    expect(thirdPartyRecipientFields(form).map(item=>item.label)).toEqual(["Recipient first name","Recipient last name"]);
  });

  it("still shows recipient name fields when the nested schema only lists required keys",()=>{
    const form=normalizeBankForm({currency:"NGN",id:"ngn",account_details_schema:{properties:{third_party_details:{type:"object",required:["recipient_first_name","recipient_last_name"]}}}});
    expect(thirdPartyRecipientFields(form).map(item=>item.key)).toEqual(["recipient_first_name","recipient_last_name"]);
  });

  it("uses dropdown options for recipient relationship and remittance purpose",()=>{
    const form=normalizeBankForm({currency:"MXN",id:"mxn",enum_options:{"account_details.recipient_relationship":["Self","Friend","Family"],"account_details.remittance_purpose":["Salary","Gift"]},account_details_schema:{required:["currency","account_number","recipient_relationship","remittance_purpose"],properties:{currency:{type:"string",enum:["MXN"]},account_number:{type:"string"},recipient_relationship:{type:"string",description:"The relationship that recipient has with sender"},remittance_purpose:{type:"string",description:"The purpose of the remittance"}}}});
    const fields=visiblePayoutFields(form,0);
    expect(fields.find(item=>item.key==="recipient_relationship")).toEqual(expect.objectContaining({control:"choice",label:"Recipient relationship"}));
    expect(fields.find(item=>item.key==="remittance_purpose")).toEqual(expect.objectContaining({control:"choice",label:"Remittance purpose"}));
    expect(fields.find(item=>item.key==="recipient_relationship")?.rule.enum).toEqual(["Self","Friend","Family"]);
    expect(fields.find(item=>item.key==="remittance_purpose")?.rule.enum).toEqual(["Salary","Gift"]);
  });

  it("falls back to Bakkt dropdown values when the API omits enum lists",()=>{
    const form=normalizeBankForm({currency:"PKR",id:"pkr",account_details_schema:{required:["currency","account_number","recipient_relationship","remittance_purpose"],properties:{currency:{type:"string",enum:["PKR"]},account_number:{type:"string"},recipient_relationship:{type:"string"},remittance_purpose:{type:"string"}}}});
    const fields=visiblePayoutFields(form,0);
    expect(fields.find(item=>item.key==="recipient_relationship")).toEqual(expect.objectContaining({control:"choice",label:"Recipient relationship"}));
    expect(fields.find(item=>item.key==="remittance_purpose")).toEqual(expect.objectContaining({control:"choice",label:"Remittance purpose"}));
    expect(fields.find(item=>item.key==="recipient_relationship")?.rule.enum).toEqual(["Self","Friend","Employer","Colleague","Family","Husband","Wife","Father","Mother","Son","Daughter","Brother","Sister"]);
    expect(fields.find(item=>item.key==="remittance_purpose")?.rule.enum).toEqual(["Salary","Real Estate","Savings","Gift","Education Support","Home Improvement"]);
  });

  it("gives long account identifiers a full row and pairs short codes",()=>{
    const ngn=normalizeBankForm({currency:"NGN",id:"ngn",account_details_schema:{required:["currency","account_number","bank_code"],properties:{currency:{type:"string",enum:["NGN"]},account_number:{type:"string"},bank_code:{type:"string"}}}});
    const gbp=normalizeBankForm({currency:"GBP",id:"gbp",account_details_schema:{required:["currency","account_number","sort_code"],properties:{currency:{type:"string",enum:["GBP"]},account_number:{type:"string"},sort_code:{type:"string"}}}});
    const mxn=normalizeBankForm({currency:"MXN",id:"mxn",account_details_schema:{required:["currency","account_number","recipient_relationship","remittance_purpose"],properties:{currency:{type:"string",enum:["MXN"]},account_number:{type:"string"},recipient_relationship:{type:"string",enum:["Self","Family"]},remittance_purpose:{type:"string",enum:["Salary","Gift"]}}}});
    const eur=normalizeBankForm({currency:"EUR",id:"eur",account_details_schema:{required:["currency","iban"],properties:{currency:{type:"string",enum:["EUR"]},iban:{type:"string"}}}});
    expect(visiblePayoutFields(ngn,4).map(item=>({key:item.key,wide:item.wide}))).toEqual([{key:"bank_code",wide:true},{key:"account_number",wide:true}]);
    expect(visiblePayoutFields(gbp,0).map(item=>({key:item.key,wide:item.wide}))).toEqual([{key:"sort_code",wide:true},{key:"account_number",wide:true}]);
    expect(visiblePayoutFields(mxn,0).map(item=>({key:item.key,wide:item.wide}))).toEqual([{key:"account_number",wide:true},{key:"recipient_relationship",wide:false},{key:"remittance_purpose",wide:false}]);
    expect(visiblePayoutFields(eur,0).map(item=>({key:item.key,wide:item.wide}))).toEqual([{key:"iban",wide:true}]);
  });

  it("turns Bakkt constraints into short format hints under text fields",()=>{
    const mxn=normalizeBankForm({currency:"MXN",id:"mxn",account_details_schema:{properties:{account_number:{type:"string",description:"The bank account number in CLABE format (digits only, exactly 18 characters)",minLength:18,maxLength:18,pattern:"^[0-9]{18}$"},recipient_relationship:{type:"string",enum:["Self","Son"]},remittance_purpose:{type:"string",enum:["Salary","Savings"]}}}});
    const eur=normalizeBankForm({currency:"EUR",id:"eur",account_details_schema:{properties:{iban:{type:"string",example:"ES9121000418450200051332"}}}});
    const pkr=normalizeBankForm({currency:"PKR",id:"pkr",account_details_schema:{properties:{account_number:{type:"string",description:"Either a Pakistani IBAN (starts with `PK`, 24 characters total: `PK\\d{2}[A-Z0-9]{20}`) or a 10-16 digit local account number"}}}});
    const mxnFields=visiblePayoutFields(mxn,0);
    expect(payoutFieldHint("account_number",mxnFields.find(item=>item.key==="account_number")!.rule)).toContain("CLABE");
    expect(payoutFieldHint("recipient_relationship",mxnFields.find(item=>item.key==="recipient_relationship")!.rule,"choice")).toBeUndefined();
    expect(payoutFieldHint("iban",eur?.accountDetailsSchema.properties.iban??{})).toBe("International Bank Account Number");
    expect(payoutFieldHint("account_number",pkr?.accountDetailsSchema.properties.account_number??{})).toContain("PK");
  });

  it("covers every Bakkt payout currency with format hints on text fields",()=>{
    const catalog=JSON.parse(readFileSync(resolve("../consumer-api/bakkt_remote_bank_account_payloads.json"),"utf8")) as {currencies:Record<string,{routes:Array<Record<string,unknown>>}>};
    const missing:string[]=[];
    const summaries:Array<{id:string;fields:Array<{key:string;control:string;wide:boolean;hint?:string}>}>=[];
    for(const[currency,entry]of Object.entries(catalog.currencies)){
      for(const route of entry.routes){
        const form=normalizeBankForm({currency,id:route.id,title:route.title,route:route.route,account_details_schema:route.account_details_schema,enum_options:route.enum_options});
        const fields=visiblePayoutFields(form,currency==="NGN"?5:0);
        expect(fields.length).toBeGreaterThan(0);
        summaries.push({id:String(route.id),fields:fields.map(field=>({key:field.key,control:field.control,wide:field.wide,hint:payoutFieldHint(field.key,field.rule,field.control)}))});
        for(const field of fields){
          if(field.control==="text"&&!payoutFieldHint(field.key,field.rule,field.control))missing.push(`${String(route.id)}.${field.key}`);
          if(field.key==="recipient_relationship"||field.key==="remittance_purpose")expect(field.control).toBe("choice");
          if(field.key==="account_number"||field.key==="iban"||field.key==="pix_key")expect(field.wide).toBe(true);
        }
      }
    }
    expect(missing).toEqual([]);
    expect(summaries.find(item=>item.id==="mxn")?.fields.find(item=>item.key==="account_number")?.hint).toContain("CLABE");
    expect(summaries.find(item=>item.id==="eur")?.fields.find(item=>item.key==="iban")?.hint).toBe("International Bank Account Number");
    expect(summaries.find(item=>item.id==="ngn")?.fields.map(item=>item.key)).toEqual(["bank_code","account_number"]);
    expect(summaries.length).toBeGreaterThan(20);
  });
});
