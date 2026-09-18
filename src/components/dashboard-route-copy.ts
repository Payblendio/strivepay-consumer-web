export type BreadcrumbItem={label:string;href?:string};
export type DashboardNavId="overview"|"buy"|"sell"|"activity"|"accounts"|"how-it-works"|"support";
export type DashboardPageMeta={title:string;copy:string;active:DashboardNavId;index:string};

export type BuyOrderRow={
  id:string;
  createdAt:string;
  dateBasis?:"created"|"updated";
  status:string;
  fiatCurrency:string;
  fiatAmount:string;
  cryptoAsset:string;
  cryptoAmount:string;
  destinationLabel?:string;
  destinationDisplay?:string;
  network:string;
};

export type RampActivityItem={
  id:string;
  direction?:string;
  status:string;
  fiatCurrency?:string;
  fiatAmount?:number|string|null;
  cryptoAsset?:string;
  cryptoAmount?:number|string|null;
  network?:string|null;
  feeCurrency?:string|null;
  feeAmount?:number|string|null;
  blockchainTransactionId?:string|null;
  updatedAt?:string;
  createdAt?:string;
};

export type TradeItem={
  id:string;
  status:string;
  createdAt:string;
  dateBasis?:"created"|"updated";
  updatedAt?:string;
  direction?:string;
  sourceAsset?:string;
  sourceNetwork?:string|null;
  sourceAmount?:number|string;
  destinationAsset?:string;
  destinationNetwork?:string|null;
  quotedDestinationAmount?:number|string;
  deliveredAmount?:number|string|null;
  quoteId?:string;
  destinationId?:string;
  legs?:Array<{sequence?:number;providerCode?:string;status?:string}>;
  fees?:Array<{feeType?:string;amount?:number|string;assetCode?:string}>;
  activityKind?:"ORDER"|"DIRECT";
  providerFeeAmount?:number|string|null;
  merchantFeeAmount?:number|string|null;
  feeCurrency?:string|null;
  exchangeRate?:number|string|null;
  blockchainHash?:string|null;
  transferReference?:string|null;
  depositReference?:string|null;
  withdrawalReference?:string|null;
  occurredAt?:string|null;
  settlementWalletAddress?:string|null;
  sendingAddress?:string|null;
  receivingAddress?:string|null;
  payoutAccountId?:string|null;
  payoutAccountName?:string|null;
  payoutAccountMask?:string|null;
  recipientType?:string|null;
  beneficiaryName?:string|null;
  beneficiaryAccountName?:string|null;
  beneficiaryCurrency?:string|null;
  beneficiaryAccountMask?:string|null;
  bridgeAsset?:string|null;
  bridgeNetwork?:string|null;
};

export function tradesFromRampActivity(items:RampActivityItem[]):TradeItem[]{
  return items.map(item=>({
    id:item.id,status:item.status,createdAt:item.createdAt??item.updatedAt??"",updatedAt:item.updatedAt,dateBasis:item.createdAt?"created":"updated",
    direction:item.direction,sourceAsset:item.direction==="FIAT_TO_CRYPTO"?item.fiatCurrency:item.cryptoAsset,
    sourceNetwork:item.direction==="FIAT_TO_CRYPTO"?null:item.network,
    sourceAmount:item.direction==="FIAT_TO_CRYPTO"?(item.fiatAmount??undefined):(item.cryptoAmount??undefined),
    destinationAsset:item.direction==="FIAT_TO_CRYPTO"?item.cryptoAsset:item.fiatCurrency,
    destinationNetwork:item.direction==="FIAT_TO_CRYPTO"?item.network:null,
    deliveredAmount:item.direction==="FIAT_TO_CRYPTO"?item.cryptoAmount:item.fiatAmount,
    providerFeeAmount:item.feeAmount,
    feeCurrency:item.feeCurrency,
    activityKind:"DIRECT",
  }));
}

export function mergeTradeActivity(direct:TradeItem[],orders:TradeItem[]):TradeItem[]{
  const seen=new Set(direct.map(item=>item.id));
  return [...direct,...orders.filter(item=>!seen.has(item.id))].sort((a,b)=>Date.parse(b.createdAt||"0")-Date.parse(a.createdAt||"0"));
}

export type TimelineEvent={
  id:string;
  fromStatus?:string|null;
  toStatus:string;
  occurredAt:string;
};

export type ConversionItem={id:string;direction:string;status:string;sourceAsset:string;sourceNetwork?:string|null;grossSourceAmount:number|string;destinationAsset:string;destinationNetwork?:string|null;quotedDestinationAmount?:number|string|null;netDestinationAmount?:number|string|null;exchangeRate?:number|string|null;customerFeeAmount?:number|string|null;exchangeFeeAmount?:number|string|null;withdrawalFeeAmount?:number|string|null;bankPayoutFeeAmount?:number|string|null;createdAt:string;updatedAt?:string;completedAt?:string|null;deliveryAddress?:string|null;bridgeAsset?:string|null;bridgeNetwork?:string|null;bridgeAddress?:string|null;payoutAccountId?:string|null;payoutAccountName?:string|null;payoutAccountMask?:string|null;payoutBankCode?:string|null;payoutReference?:string|null;withdrawalReference?:string|null;depositReference?:string|null;blockchainHash?:string|null};

export function tradesFromConversions(items:ConversionItem[]):TradeItem[]{
  return items.map(item=>{
    const direction=item.direction==="NGN_TO_CRYPTO"?"FIAT_TO_CRYPTO":item.direction==="CRYPTO_TO_NGN"?"CRYPTO_TO_FIAT":item.direction;
    const fees:NonNullable<TradeItem["fees"]>=[];
    if(item.exchangeFeeAmount!=null&&item.exchangeFeeAmount!==""&&Number(item.exchangeFeeAmount)>0){
      fees.push({feeType:"EXCHANGE",amount:item.exchangeFeeAmount,assetCode:item.sourceAsset});
    }
    if(item.withdrawalFeeAmount!=null&&item.withdrawalFeeAmount!==""&&Number(item.withdrawalFeeAmount)>0){
      fees.push({feeType:"NETWORK",amount:item.withdrawalFeeAmount,assetCode:item.bridgeAsset??item.destinationAsset});
    }
    if(item.bankPayoutFeeAmount!=null&&item.bankPayoutFeeAmount!==""&&Number(item.bankPayoutFeeAmount)>0){
      fees.push({feeType:"BANK",amount:item.bankPayoutFeeAmount,assetCode:"NGN"});
    }
    return {
      id:item.id,
      status:item.status,
      createdAt:item.createdAt,
      updatedAt:item.updatedAt,
      occurredAt:item.completedAt??undefined,
      direction,
      sourceAsset:item.sourceAsset,
      sourceNetwork:item.sourceNetwork,
      sourceAmount:item.grossSourceAmount,
      destinationAsset:item.destinationAsset,
      destinationNetwork:item.destinationNetwork,
      quotedDestinationAmount:item.quotedDestinationAmount??undefined,
      deliveredAmount:item.netDestinationAmount,
      activityKind:"DIRECT",
      merchantFeeAmount:item.customerFeeAmount,
      exchangeRate:item.exchangeRate,
      settlementWalletAddress:item.bridgeAddress,
      receivingAddress:item.deliveryAddress,
      payoutAccountId:item.payoutAccountId,
      payoutAccountName:item.payoutAccountName,
      payoutAccountMask:item.payoutAccountMask
        ?item.payoutBankCode?`${item.payoutBankCode} · ${item.payoutAccountMask}`:item.payoutAccountMask
        :item.payoutBankCode||null,
      beneficiaryCurrency:item.destinationAsset==="NGN"||item.destinationAsset==="USD"||item.destinationAsset==="EUR"?item.destinationAsset:null,
      transferReference:item.payoutReference||null,
      depositReference:item.depositReference||null,
      withdrawalReference:item.withdrawalReference||null,
      blockchainHash:item.blockchainHash||null,
      bridgeAsset:item.bridgeAsset,
      bridgeNetwork:item.bridgeNetwork,
      fees,
    };
  });
}

export type PayoutAccountItem={
  id:string;
  accountName:string;
  currency:string;
  status:string;
  mainRecipient?:boolean;
  accountMask?:string|null;
};

function amount(value:number|string|null|undefined){
  if(value==null||value==="")return "—";
  return String(value);
}

export function dashboardBreadcrumb(pathname:string):BreadcrumbItem[]{
  const items:BreadcrumbItem[]=[{label:"Overview",href:"/dashboard"}];
  if(pathname.startsWith("/dashboard/buy/add")){
    items.push({label:"Accounts",href:"/dashboard/accounts"},{label:"Request pay-in account"});
  }else if(pathname.startsWith("/dashboard/buy")){
    items.push({label:"Buy crypto",href:"/dashboard/buy"});
    if(pathname.startsWith("/dashboard/buy/update"))items.push({label:"Update wallet"});
  }else if(pathname.startsWith("/dashboard/sell/add")){
    items.push({label:"Accounts",href:"/dashboard/accounts"},{label:"Add payout account"});
  }else if(pathname!=="/dashboard/sell"&&pathname.startsWith("/dashboard/sell/")){
    items.push({label:"Accounts",href:"/dashboard/accounts"},{label:"Send instructions"});
  }else if(pathname.startsWith("/dashboard/sell")){
    items.push({label:"Sell crypto"});
  }else if(pathname.startsWith("/dashboard/activity/")){
    items.push({label:"Activity",href:"/dashboard/activity"},{label:"Transaction details"});
  }else if(pathname.startsWith("/dashboard/activity")){
    items.push({label:"Activity"});
  }else if(pathname.startsWith("/dashboard/accounts")){
    items.push({label:"Accounts"});
  }else if(pathname.startsWith("/dashboard/support")){
    items.push({label:"Support"});
  }else if(pathname.startsWith("/dashboard/how-it-works")){
    items.push({label:"How it works"});
  }else if(pathname.startsWith("/dashboard/settings/team")){
    items.push({label:"Settings",href:"/dashboard/settings"},{label:"Team"});
  }else if(pathname.startsWith("/dashboard/settings/security/password")){
    items.push({label:"Settings",href:"/dashboard/settings"},{label:"Security",href:"/dashboard/settings/security"},{label:"Change password"});
  }else if(pathname.startsWith("/dashboard/settings/security/authenticator")){
    items.push({label:"Settings",href:"/dashboard/settings"},{label:"Security",href:"/dashboard/settings/security"},{label:"Authenticator"});
  }else if(pathname.startsWith("/dashboard/settings/security/sessions")){
    items.push({label:"Settings",href:"/dashboard/settings"},{label:"Security",href:"/dashboard/settings/security"},{label:"Signed-in devices"});
  }else if(pathname.startsWith("/dashboard/settings/security")){
    items.push({label:"Settings",href:"/dashboard/settings"},{label:"Security"});
  }else if(pathname.startsWith("/dashboard/settings")){
    items.push({label:"Settings"});
  }else if(pathname.startsWith("/dashboard/profile")){
    items.push({label:"Settings",href:"/dashboard/settings"},{label:"Profile"});
  }
  const last=items.at(-1);
  if(last)last.href=undefined;
  return items;
}

export function dashboardPageMeta(pathname:string,givenName?:string):DashboardPageMeta{
  if(pathname.startsWith("/dashboard/support"))return {title:"Support",copy:"A clear place for questions, updates and next steps.",active:"support",index:"07"};
  if(pathname.startsWith("/dashboard/buy/update"))return {title:"Update wallet",copy:"Change the wallet that receives bought crypto.",active:"buy",index:"02"};
  if(pathname.startsWith("/dashboard/buy/add"))return {title:"Request pay-in account",copy:"Get a bank account for funding buys.",active:"accounts",index:"05"};
  if(pathname.startsWith("/dashboard/buy"))return {title:"Buy crypto",copy:"Your settlement wallet and recent buy orders.",active:"buy",index:"02"};
  if(pathname.startsWith("/dashboard/sell/add"))return {title:"Add payout account",copy:"Add another account for sell proceeds.",active:"accounts",index:"05"};
  if(pathname!=="/dashboard/sell"&&pathname.startsWith("/dashboard/sell/"))return {title:"Send instructions",copy:"Crypto address and network for this payout destination.",active:"accounts",index:"05"};
  if(pathname.startsWith("/dashboard/sell"))return {title:"Sell crypto",copy:"Start a sell into a payout destination.",active:"sell",index:"03"};
  if(pathname.startsWith("/dashboard/activity/"))return {title:"Transaction",copy:"Status, amounts, fees, and timeline.",active:"activity",index:"04"};
  if(pathname.startsWith("/dashboard/activity"))return {title:"Activity",copy:"Buys and sells on your account.",active:"activity",index:"04"};
  if(pathname.startsWith("/dashboard/accounts"))return {title:"Accounts",copy:"Pay-in accounts and payout destinations.",active:"accounts",index:"05"};
  if(pathname.startsWith("/dashboard/how-it-works"))return {title:"How it works",copy:"How StrivePay moves money, and what you are responsible for.",active:"how-it-works",index:"06"};
  if(pathname.startsWith("/dashboard/settings/team"))return {title:"Team",copy:"Invite members and manage roles.",active:"overview",index:"01"};
  if(pathname.startsWith("/dashboard/settings/security/password"))return {title:"Change password",copy:"Update your password and sign in again.",active:"overview",index:"01"};
  if(pathname.startsWith("/dashboard/settings/security/authenticator"))return {title:"Authenticator",copy:"Add a 6-digit code step after your password.",active:"overview",index:"01"};
  if(pathname.startsWith("/dashboard/settings/security/sessions"))return {title:"Signed-in devices",copy:"Revoke devices you no longer use.",active:"overview",index:"01"};
  if(pathname.startsWith("/dashboard/settings/security"))return {title:"Security",copy:"Password, authenticator, and signed-in devices.",active:"overview",index:"01"};
  if(pathname.startsWith("/dashboard/settings"))return {title:"Settings",copy:"Profile, team, security, and setup.",active:"overview",index:"01"};
  if(pathname.startsWith("/dashboard/profile"))return {title:"Profile",copy:"Your StrivePay account details.",active:"overview",index:"01"};
  return {title:"Overview",copy:givenName?`Good to see you, ${givenName}.`:"Your control desk.",active:"overview",index:"01"};
}

export function buyOrdersFromActivity(items:RampActivityItem[]):BuyOrderRow[]{
  return items.filter(item=>item.direction==="FIAT_TO_CRYPTO").map(item=>{
    const completed=orderStatusClass(item.status)==="completed";
    const destination=destinationAmountSummary({id:item.id,status:item.status,createdAt:item.createdAt??"",destinationAsset:item.cryptoAsset,deliveredAmount:completed?item.cryptoAmount:null,quotedDestinationAmount:!completed&&Number(item.cryptoAmount)>0?item.cryptoAmount??undefined:undefined});
    return {
    id:item.id,
    createdAt:item.createdAt??item.updatedAt??"",
    dateBasis:item.createdAt?"created":"updated",
    status:item.status,
    fiatCurrency:item.fiatCurrency??"",
    fiatAmount:amount(item.fiatAmount),
    cryptoAsset:item.cryptoAsset??"",
    cryptoAmount:amount(item.cryptoAmount),
    destinationLabel:destination.label,
    destinationDisplay:destination.value,
    network:item.network??"",
  };});
}

export function buyOrdersFromTrades(items:TradeItem[]):BuyOrderRow[]{
  return items.filter(item=>item.direction==="FIAT_TO_CRYPTO").map(item=>{
    const destination=destinationAmountSummary(item);
    return {
    id:item.id,
    createdAt:item.createdAt,
    dateBasis:item.dateBasis??"created",
    status:item.status,
    fiatCurrency:item.sourceAsset??"",
    fiatAmount:amount(item.sourceAmount),
    cryptoAsset:item.destinationAsset??"",
    cryptoAmount:amount(item.deliveredAmount??item.quotedDestinationAmount),
    destinationLabel:destination.label,
    destinationDisplay:destination.value,
    network:item.destinationNetwork??"",
  };});
}

export function mergeBuyOrders(ramp:BuyOrderRow[],trades:BuyOrderRow[]):BuyOrderRow[]{
  const seen=new Set(ramp.map(item=>item.id));
  return [...ramp,...trades.filter(item=>!seen.has(item.id))].sort((a,b)=>Date.parse(b.createdAt||"0")-Date.parse(a.createdAt||"0"));
}

export function sortPayoutAccounts<T extends {mainRecipient?:boolean}>(accounts:T[]):T[]{
  return [...accounts].sort((a,b)=>Number(Boolean(b.mainRecipient))-Number(Boolean(a.mainRecipient)));
}

const APPROVED_COMPLIANCE=new Set(["FULL_USER","ACTIVE"]);
const PENDING_COMPLIANCE=new Set(["KYC_PENDING","KYB_PENDING","PENDING_KYC_DATA","PHONE_VERIFICATION_NEEDED"]);
const FAILED_COMPLIANCE=new Set(["SOFT_KYC_FAILED","HARD_KYC_FAILED","REJECTED"]);

export type OnboardingSnapshot={
  complianceStatus?:string|null;
  onboardingStatus?:string|null;
  actionRequired?:string|null;
};

export type AccountSetupState={
  approved:boolean;
  pending:boolean;
  failed:boolean;
  routesReady:boolean;
  complianceStatus:string;
};

export function accountSetupHref(accountType?:string|null,accountScope?:string|null){
  if(accountScope==="PERSONAL")return "/onboarding/personal";
  if(accountScope==="BUSINESS")return "/onboarding/business";
  return accountType==="BUSINESS"?"/onboarding/business":"/onboarding/personal";
}

export function accountSetupState(
  snapshot:OnboardingSnapshot|null,
  hasPreference:boolean,
  hasPayout:boolean,
):AccountSetupState{
  const complianceStatus=(snapshot?.complianceStatus||snapshot?.onboardingStatus||"").toUpperCase();
  const approved=APPROVED_COMPLIANCE.has(complianceStatus);
  const pending=PENDING_COMPLIANCE.has(complianceStatus);
  const failed=FAILED_COMPLIANCE.has(complianceStatus);
  return {approved,pending,failed,routesReady:approved&&hasPreference&&hasPayout,complianceStatus};
}

export function formatOrderStatus(status:string){
  const labels:Record<string,string>={
    PROCESS_COMPLETED:"Completed",COMPLETE:"Completed",COMPLETED:"Completed",SETTLED:"Completed",SUCCEEDED:"Completed",SUCCESS:"Completed",
    OUTSIDE_TRANSFER_RECEIVED:"Deposit received",OUTSIDE_TRANSFER_PENDING:"Awaiting deposit",AWAITING_FUNDS:"Awaiting deposit",
    FUNDS_RECEIVED:"Funds received",COLLECTING_FUNDS:"Collecting funds",CONVERTING:"Converting",MOVING_FUNDS:"Moving funds",
    PAYING_OUT:"Paying out",SENDING_CRYPTO:"Sending crypto",AWAITING_LIQUIDITY:"Awaiting liquidity",SETTLING:"Settling",
    IN_PROGRESS:"Processing",PAYOUT_PENDING:"Payout pending",PAYOUT_PROCESSING:"Sending payout",CONVERSION_PENDING:"Conversion pending",
    UNKNOWN:"Status unavailable",
  };
  if(labels[status.toUpperCase()])return labels[status.toUpperCase()];
  return status.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase());
}

export function formatOrderDate(value:string){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "—";
  return date.toLocaleString(undefined,{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});
}

export function formatOrderDateShort(value:string){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "—";
  return date.toLocaleString(undefined,{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});
}

export function isBuyDirection(direction?:string|null){
  const value=(direction||"").toUpperCase();
  return value==="FIAT_TO_CRYPTO"||value==="NGN_TO_CRYPTO";
}

type TradeOutcome="completed"|"progress"|"failed"|"reversed";

function tradeOutcome(status?:string|null):TradeOutcome{
  const value=(status||"").toLowerCase();
  if(!value)return "progress";
  if(value.includes("refund")||value.includes("revers"))return "reversed";
  if(value.includes("fail")||value.includes("cancel")||value.includes("reject")||value.includes("expired"))return "failed";
  if(
    ["complete","completed","process_completed"].includes(value)
    ||value==="settled"
    ||value==="delivered"
    ||value==="reconciled"
    ||value==="succeeded"
    ||value==="success"
  )return "completed";
  return "progress";
}

/** Progressive direction label: Buying/Bought, Selling/Sold, plus failed/reversed phrasing. */
export function tradeDirectionLabel(direction?:string|null,status?:string|null){
  const buy=isBuyDirection(direction);
  switch(tradeOutcome(status)){
    case "completed":return buy?"Bought":"Sold";
    case "failed":return buy?"Buy failed":"Sell failed";
    case "reversed":return buy?"Buy reversed":"Sell reversed";
    default:return buy?"Buying":"Selling";
  }
}

export function orderStatusClass(status:string){
  const outcome=tradeOutcome(status);
  if(outcome==="completed")return "completed";
  if(outcome==="failed"||outcome==="reversed")return "failed";
  const value=status.toLowerCase();
  if(value.includes("hold")||value.includes("await")||value.includes("pending")||value.includes("fund"))return "awaiting_funds";
  if(value.includes("process")||value.includes("progress")||value.includes("submit"))return "processing";
  return "processing";
}

export function formatTradeAmount(amount:number|string|null|undefined,asset?:string|null){
  if(amount==null||amount==="")return "—";
  const number=typeof amount==="number"?amount:Number(amount);
  const code=(asset||"").replace("_",".");
  if(!Number.isFinite(number))return code?`${amount} ${code}`:String(amount);
  const fiat=["EUR","USD","GBP","NGN"].includes((asset||"").toUpperCase());
  const digits=fiat?2:(asset==="BTC"||asset==="ETH"?8:6);
  const formatted=number.toLocaleString("en",{maximumFractionDigits:digits,minimumFractionDigits:0});
  return code?`${formatted} ${code}`:formatted;
}

export function receivedAmount(trade:TradeItem){
  const value=trade.deliveredAmount;
  if(value==null||value===""||!Number.isFinite(Number(value)))return null;
  // Pending direct activity can carry a zero placeholder before a payout exists.
  if(Number(value)===0&&tradeOutcome(trade.status)!=="completed")return null;
  return value;
}

/** A quote is an expectation, never evidence of settlement. */
export function destinationAmountSummary(trade:TradeItem){
  const received=receivedAmount(trade);
  if(received!=null)return {label:"Received",value:formatTradeAmount(received,trade.destinationAsset)};
  const quote=trade.quotedDestinationAmount;
  if(quote!=null&&quote!==""&&Number.isFinite(Number(quote)))return {
    label:tradeOutcome(trade.status)==="progress"?"Expected":"Quoted",
    value:formatTradeAmount(quote,trade.destinationAsset),
  };
  return {label:tradeOutcome(trade.status)==="progress"?"Payout":"Received",value:tradeOutcome(trade.status)==="progress"?"Pending":"Not reported"};
}
