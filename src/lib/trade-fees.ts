import type {TradeItem} from "@/components/dashboard-route-copy";

export type FeeLine={key:string;label:string;amount:number;asset:string};

export function asFeeNumber(value:number|string|null|undefined){
  if(value==null||value==="")return null;
  const number=typeof value==="number"?value:Number(value);
  return Number.isFinite(number)?number:null;
}

function money(value:number){
  return Math.round(value*10000)/10000;
}

/**
 * Bakkt webhooks: `fees` (stored as providerFeeAmount) is the **total** charged.
 * `merchantFee` is StrivePay's share **inside** that total — do not add them.
 * Other routes (conversions/orders) keep additive fee components.
 */
export function tradeFeeSummary(
  trade:Pick<TradeItem,"providerFeeAmount"|"merchantFeeAmount"|"feeCurrency"|"sourceAsset"|"destinationAsset"|"fees">,
  buy:boolean,
):{lines:FeeLine[];total:FeeLine|null}{
  const rows:FeeLine[]=[];
  const seen=new Set<string>();
  const fallback=trade.feeCurrency||(buy?trade.sourceAsset:trade.destinationAsset)||"";
  const push=(key:string,label:string,amount:number,asset:string)=>{
    if(amount<=0)return;
    const code=asset.trim();
    const token=`${label}:${amount}:${code}`;
    if(seen.has(token))return;
    seen.add(token);
    rows.push({key,label,amount,asset:code});
  };

  const reportedTotal=asFeeNumber(trade.providerFeeAmount);
  const merchant=asFeeNumber(trade.merchantFeeAmount);
  const asset=(trade.feeCurrency||fallback||"").trim();

  // Nested Bakkt model: merchantFee ⊆ fees
  if(reportedTotal!=null&&merchant!=null&&merchant<=reportedTotal+1e-9&&asset){
    const processing=money(reportedTotal-merchant);
    push("merchant","StrivePay fee",merchant,asset);
    push("provider","Processing fee",processing,asset);
    appendExtraFees(trade,buy,reportedTotal,merchant,asset,push,seen);
    return {
      lines:rows,
      total:{key:"total",label:"Total fees",amount:reportedTotal,asset},
    };
  }

  // Additive model
  if(reportedTotal!=null)push("provider","Processing fee",reportedTotal,asset||fallback);
  if(merchant!=null)push("merchant","StrivePay fee",merchant,asset||fallback);
  appendExtraFees(trade,buy,reportedTotal,merchant,asset||fallback,push,seen);

  if(rows.length===0)return {lines:[],total:null};
  if(rows.length===1)return {lines:rows,total:{key:"total",label:"Total fees",amount:rows[0].amount,asset:rows[0].asset}};
  const shared=rows[0].asset;
  if(!shared||!rows.every(line=>line.asset===shared))return {lines:rows,total:null};
  const amount=money(rows.reduce((sum,line)=>sum+line.amount,0));
  return {lines:rows,total:amount>0?{key:"total",label:"Total fees",amount,asset:shared}:null};
}

function appendExtraFees(
  trade:Pick<TradeItem,"fees"|"feeCurrency">,
  _buy:boolean,
  reportedTotal:number|null,
  merchant:number|null,
  asset:string,
  push:(key:string,label:string,amount:number,asset:string)=>void,
  seen:Set<string>,
){
  for(const [index,fee] of (trade.fees??[]).entries()){
    const number=asFeeNumber(fee.amount);
    if(number==null||number<=0)continue;
    const type=(fee.feeType||"").toUpperCase();
    if(reportedTotal!=null&&Math.abs(number-reportedTotal)<1e-9)continue;
    if(merchant!=null&&Math.abs(number-merchant)<1e-9&&(type===""||type==="PLATFORM"||type==="MERCHANT"||type==="STRIVEPAY"))continue;
    if(reportedTotal!=null&&merchant!=null&&Math.abs(number-money(reportedTotal-merchant))<1e-9)continue;
    const label=type==="PLATFORM"||type==="MERCHANT"||type==="STRIVEPAY"
      ?"StrivePay fee"
      :type==="PROCESSING"||type==="PROVIDER"||type==="BAKKT"
        ?"Processing fee"
        :type==="NETWORK"||type==="WITHDRAWAL"||type==="BLOCKCHAIN"
          ?"Network fee"
          :type==="BANK"||type==="PAYOUT"
            ?"Bank transfer fee"
            :type==="EXCHANGE"||type==="SWAP"
              ?"Exchange fee"
          :(fee.feeType||"Fee").replaceAll("_"," ").toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase());
    const pretty=label.includes("Fee")||label.includes("fee")?label:`${label} fee`;
    const code=(fee.assetCode||trade.feeCurrency||asset||"").trim();
    const token=`${pretty}:${number}:${code}`;
    if(seen.has(token))continue;
    push(`fee-${index}`,pretty,number,code);
  }
}

/** @deprecated Prefer tradeFeeSummary — kept for call sites that only need lines. */
export function tradeFeeLines(
  trade:Pick<TradeItem,"providerFeeAmount"|"merchantFeeAmount"|"feeCurrency"|"sourceAsset"|"destinationAsset"|"fees">,
  buy:boolean,
){
  return tradeFeeSummary(trade,buy).lines;
}

export function totalFeeLine(
  lines:FeeLine[],
  trade?:Pick<TradeItem,"providerFeeAmount"|"merchantFeeAmount"|"feeCurrency"|"sourceAsset"|"destinationAsset">,
  buy=true,
):FeeLine|null{
  if(trade)return tradeFeeSummary(trade,buy).total;
  if(lines.length===0)return null;
  if(lines.length===1)return {key:"total",label:"Total fees",amount:lines[0].amount,asset:lines[0].asset};
  const asset=lines[0].asset;
  if(!asset||!lines.every(line=>line.asset===asset))return null;
  const amount=money(lines.reduce((sum,line)=>sum+line.amount,0));
  return amount>0?{key:"total",label:"Total fees",amount,asset}:null;
}
