import type {TimelineEvent,TradeItem} from "@/components/dashboard-route-copy";
import {
  formatOrderDate,
  formatOrderStatus,
  formatTradeAmount,
  isBuyDirection,
  orderStatusClass,
  receivedAmount,
} from "@/components/dashboard-route-copy";
import {tradeFeeSummary} from "@/lib/trade-fees";

type ReceiptRow=[string,string];

function asNumber(value:number|string|null|undefined){
  if(value==null||value==="")return null;
  const number=typeof value==="number"?value:Number(value);
  return Number.isFinite(number)?number:null;
}

function derivedExchangeRate(trade:TradeItem){
  if(trade.exchangeRate!=null&&trade.exchangeRate!=="")return String(trade.exchangeRate);
  const sent=asNumber(trade.sourceAmount);
  const got=asNumber(receivedAmount(trade));
  if(sent==null||got==null||sent===0)return null;
  return (got/sent).toLocaleString(undefined,{maximumFractionDigits:8});
}

function push(rows:ReceiptRow[],label:string,value:string|null|undefined){
  if(value==null||value===""||value==="—")return;
  rows.push([label,value]);
}

function receiptRows(trade:TradeItem,timeline:TimelineEvent[]):ReceiptRow[]{
  const buy=isBuyDirection(trade.direction);
  const received=receivedAmount(trade);
  const exchangeRate=derivedExchangeRate(trade);
  const network=(buy?trade.destinationNetwork:trade.sourceNetwork)?.replaceAll("_"," ");
  const rows:ReceiptRow[]=[];
  push(rows,"Type",buy?"Buy":"Sell");
  push(rows,"Status",formatOrderStatus(trade.status));
  push(rows,"Sent",formatTradeAmount(trade.sourceAmount,trade.sourceAsset));
  push(rows,"Received",formatTradeAmount(received,trade.destinationAsset));
  const quoted=asNumber(trade.quotedDestinationAmount);
  const delivered=asNumber(received);
  if(quoted!=null&&(delivered==null||quoted!==delivered))push(rows,"Quoted",formatTradeAmount(trade.quotedDestinationAmount,trade.destinationAsset));
  for(const fee of tradeFeeSummary(trade,buy).lines)push(rows,fee.label,formatTradeAmount(fee.amount,fee.asset));
  if(exchangeRate)push(rows,"Exchange rate",`1 ${trade.sourceAsset} = ${exchangeRate} ${trade.destinationAsset}`);
  push(rows,"Network",network||undefined);
  if(trade.bridgeAsset)push(rows,"Bridge",`${trade.bridgeAsset}${trade.bridgeNetwork?` · ${trade.bridgeNetwork.replaceAll("_"," ")}`:""}`);
  push(rows,"Beneficiary",trade.beneficiaryName||trade.beneficiaryAccountName||trade.payoutAccountName||undefined);
  push(rows,"Account details",trade.beneficiaryAccountMask||trade.payoutAccountMask||undefined);
  push(rows,"Date",formatOrderDate(trade.createdAt));
  if(trade.updatedAt&&trade.updatedAt!==trade.createdAt)push(rows,"Updated",formatOrderDate(trade.updatedAt));
  if(trade.occurredAt&&trade.occurredAt!==trade.createdAt&&trade.occurredAt!==trade.updatedAt)push(rows,orderStatusClass(trade.status)==="completed"?"Settled":"Recorded",formatOrderDate(trade.occurredAt));
  push(rows,"Deposit reference",trade.depositReference||undefined);
  push(rows,"Payout reference",trade.transferReference||undefined);
  push(rows,"Withdrawal ID",trade.withdrawalReference||undefined);
  push(rows,"Blockchain hash",trade.blockchainHash||undefined);
  push(rows,"Sending address",trade.sendingAddress||undefined);
  push(rows,"Settlement address",trade.settlementWalletAddress||undefined);
  if(trade.receivingAddress&&trade.receivingAddress!==trade.settlementWalletAddress)push(rows,"Receiving wallet",trade.receivingAddress);
  push(rows,"Transaction ID",trade.id);
  if(timeline.length>0){
    push(rows,"Timeline",timeline.map(event=>`${formatOrderStatus(event.toStatus)} · ${formatOrderDate(event.occurredAt)}`).join("\n"));
  }
  return rows;
}

function fileName(trade:TradeItem){
  const stamp=new Date(trade.createdAt||Date.now());
  const day=Number.isNaN(stamp.getTime())?new Date():stamp;
  const ymd=day.toISOString().slice(0,10);
  return `strivepay-receipt-${ymd}-${trade.id.slice(0,8)}.pdf`;
}

function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error("Logo failed to load"));
    image.src=src;
  });
}

async function svgToRaster(
  path:string,
  opts:{
    targetW:number;
    inkReplace?:string;
    format:"png"|"jpeg";
    quality?:number;
  },
){
  const response=await fetch(path);
  if(!response.ok)throw new Error("Brand asset unavailable");
  let svg=await response.text();
  if(opts.inkReplace)svg=svg.replaceAll("#2D3047",opts.inkReplace);
  const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
  const objectUrl=URL.createObjectURL(blob);
  try{
    const image=await loadImage(objectUrl);
    const scale=opts.targetW/image.naturalWidth;
    const canvas=document.createElement("canvas");
    canvas.width=opts.targetW;
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("Canvas unavailable");
    if(opts.format==="jpeg"){
      ctx.fillStyle="#ffffff";
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const mime=opts.format==="jpeg"?"image/jpeg":"image/png";
    return {
      dataUrl:canvas.toDataURL(mime,opts.quality??0.72),
      format:opts.format==="jpeg"?"JPEG":"PNG" as "JPEG"|"PNG",
      aspect:canvas.width/canvas.height,
    };
  }finally{
    URL.revokeObjectURL(objectUrl);
  }
}

/** Compact wordmark for the navy header (white ink). */
function strivepayLogoPng(){
  return svgToRaster("/branding/strivepay-logo-dark.svg",{
    targetW:280,
    inkReplace:"#FFFFFF",
    format:"png",
  });
}

/** Small favicon-style mark; opacity applied in the PDF, not baked into pixels. */
function strivepayMarkWatermarkPng(){
  return svgToRaster("/branding/strivepay-mark.svg",{
    targetW:160,
    format:"png",
  });
}

/** StrivePay single-transaction receipt — layout patterned on EasyRamp exportPdf. */
export async function downloadTransactionReceipt(trade:TradeItem,timeline:TimelineEvent[]=[]){
  const [{jsPDF},{default:autoTable},logo,mark]=await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    strivepayLogoPng().catch(()=>null),
    strivepayMarkWatermarkPng().catch(()=>null),
  ]);

  // EasyRamp: navy / blue / mint → StrivePay ink / teal / soft teal
  const navy:[number,number,number]=[45,48,71];       // #2D3047
  const teal:[number,number,number]=[0,178,202];      // #00B2CA
  const mint:[number,number,number]=[236,250,252];    // soft teal strip
  const muted:[number,number,number]=[91,111,132];
  const buy=isBuyDirection(trade.direction);
  const rows=receiptRows(trade,timeline);
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
  const pageW=210;
  const pageH=297;

  function drawMarkWatermark(){
    if(!mark)return;
    const markH=72;
    const markW=markH*mark.aspect;
    const x=(pageW-markW)/2;
    const y=(pageH-markH)/2+4;
    doc.saveGraphicsState();
    doc.setGState(doc.GState({opacity:0.05}));
    doc.addImage(mark.dataUrl,mark.format,x,y,markW,markH,undefined,"FAST");
    doc.restoreGraphicsState();
  }

  doc.setFillColor(...navy);
  doc.rect(0,0,pageW,30,"F");

  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold");
  if(logo){
    const logoH=12;
    const logoW=logoH*logo.aspect;
    doc.addImage(logo.dataUrl,logo.format,14,9,logoW,logoH,undefined,"FAST");
  }else{
    doc.setFontSize(20);
    doc.text("StrivePay",14,20);
  }

  doc.setFontSize(14);
  doc.text("Transaction receipt",pageW-14,17.5,{align:"right"});

  doc.setTextColor(...navy);
  doc.setFontSize(18);
  doc.setFont("helvetica","bold");
  doc.text(buy?"Buy receipt":"Sell receipt",14,43);

  doc.setFont("helvetica","normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  const summary=[
    `${trade.sourceAsset||"Not specified"} to ${trade.destinationAsset||"Not specified"}`,
    formatOrderStatus(trade.status),
    formatTradeAmount(trade.sourceAmount,trade.sourceAsset),
    receivedAmount(trade)!=null?`${formatTradeAmount(receivedAmount(trade),trade.destinationAsset)} received`:null,
  ].filter(value=>value&&value!=="—").join("  |  ");
  const summaryLines=doc.splitTextToSize(summary,pageW-28) as string[];
  doc.text(summaryLines,14,50);

  autoTable(doc,{
    startY:57+Math.max(0,summaryLines.length-1)*4,
    head:[["Detail","Value"]],
    body:rows,
    theme:"grid",
    headStyles:{fillColor:teal,textColor:[255,255,255],fontStyle:"bold",cellPadding:3.2},
    bodyStyles:{textColor:navy,cellPadding:3.2,lineColor:[220,228,237],lineWidth:0.2},
    alternateRowStyles:{fillColor:mint},
    styles:{font:"helvetica",fontSize:9,overflow:"linebreak"},
    columnStyles:{
      0:{cellWidth:48,fontStyle:"bold",textColor:muted},
      1:{cellWidth:134},
    },
    margin:{left:14,right:14,bottom:18},
    didDrawPage:data=>{
      drawMarkWatermark();
      doc.setDrawColor(220,228,237);
      doc.line(14,285,pageW-14,285);
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(`Generated ${new Date().toLocaleString()}`,14,291);
      doc.text(`Page ${data.pageNumber}`,pageW-14,291,{align:"right"});
    },
  });

  doc.save(fileName(trade));
}
