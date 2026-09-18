import {
  formatOrderDateShort,
  formatOrderStatus,
  formatTradeAmount,
  receivedAmount,
  tradeDirectionLabel,
  type TradeItem,
} from "@/components/dashboard-route-copy";

export type ActivityExportFilters={
  direction:string;
  status:string;
  timeframeLabel?:string;
};

export type ExportTimeframe="all"|"7d"|"30d"|"90d"|"custom";

export type ExportDateRange={
  from?:string;
  to?:string;
  label:string;
};

type ActivityFeedItem={
  id:string;
  kind?:string;
  direction?:string;
  status:string;
  sourceAsset?:string|null;
  sourceAmount?:number|string|null;
  destinationAsset?:string|null;
  destinationAmount?:number|string|null;
  createdAt:string;
};

type ActivityFeed={
  page:number;
  size:number;
  total:number;
  items:ActivityFeedItem[];
};

function asTrade(item:ActivityFeedItem):TradeItem{
  return {
    id:item.id,
    status:item.status,
    createdAt:item.createdAt,
    direction:item.direction,
    sourceAsset:item.sourceAsset??undefined,
    sourceAmount:item.sourceAmount??undefined,
    destinationAsset:item.destinationAsset??undefined,
    deliveredAmount:item.destinationAmount??undefined,
    activityKind:item.kind==="ORDER"?"ORDER":"DIRECT",
  };
}

function downloadBlob(contents:BlobPart[],type:string,filename:string){
  const url=URL.createObjectURL(new Blob(contents,{type}));
  const link=document.createElement("a");
  link.href=url;
  link.download=filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportName(extension:string){
  return `strivepay-activity-${new Date().toISOString().slice(0,10)}.${extension}`;
}

function csvCell(value:unknown){
  return `"${String(value??"").replace(/"/g,'""')}"`;
}

function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error("Logo failed to load"));
    image.src=src;
  });
}

async function strivepayLogoPng(){
  const response=await fetch("/branding/strivepay-logo-dark.svg");
  if(!response.ok)throw new Error("Logo unavailable");
  let svg=await response.text();
  svg=svg.replaceAll("#2D3047","#FFFFFF");
  const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
  const objectUrl=URL.createObjectURL(blob);
  try{
    const image=await loadImage(objectUrl);
    const targetW=480;
    const scale=targetW/image.naturalWidth;
    const canvas=document.createElement("canvas");
    canvas.width=targetW;
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("Canvas unavailable");
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return {dataUrl:canvas.toDataURL("image/png"),aspect:canvas.width/canvas.height};
  }finally{
    URL.revokeObjectURL(objectUrl);
  }
}

function isoDate(value:Date){
  return value.toISOString().slice(0,10);
}

/** Resolve export timeframe into YYYY-MM-DD bounds (UTC calendar days). */
export function resolveExportRange(
  timeframe:ExportTimeframe,
  customFrom:string,
  customTo:string,
):ExportDateRange{
  if(timeframe==="all")return {label:"All time"};
  if(timeframe==="custom"){
    const from=customFrom.trim()||undefined;
    const to=customTo.trim()||undefined;
    const parts=[
      from?`From ${from}`:null,
      to?`To ${to}`:null,
    ].filter(Boolean);
    return {from,to,label:parts.length?parts.join(" · "):"Custom range"};
  }
  const days=timeframe==="7d"?7:timeframe==="30d"?30:90;
  const end=new Date();
  const start=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth(),end.getUTCDate()));
  start.setUTCDate(start.getUTCDate()-(days-1));
  return {
    from:isoDate(start),
    to:isoDate(new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth(),end.getUTCDate()))),
    label:`Last ${days} days`,
  };
}

export function filterTradesByRange(rows:TradeItem[],range:ExportDateRange){
  if(!range.from&&!range.to)return rows;
  const fromMs=range.from?Date.parse(`${range.from}T00:00:00.000Z`):null;
  const toMs=range.to?Date.parse(`${range.to}T23:59:59.999Z`):null;
  return rows.filter(row=>{
    const at=Date.parse(row.createdAt);
    if(Number.isNaN(at))return false;
    if(fromMs!=null&&at<fromMs)return false;
    if(toMs!=null&&at>toMs)return false;
    return true;
  });
}

export function exportActivityCsv(rows:TradeItem[]){
  const headings=["Date","Type","Status","Sent","Received","Transaction ID"];
  const body=rows.map(row=>[
    formatOrderDateShort(row.createdAt),
    tradeDirectionLabel(row.direction,row.status),
    formatOrderStatus(row.status),
    formatTradeAmount(row.sourceAmount,row.sourceAsset),
    formatTradeAmount(receivedAmount(row),row.destinationAsset),
    row.id,
  ]);
  const csv=[headings,...body].map(line=>line.map(csvCell).join(",")).join("\r\n");
  downloadBlob(["\uFEFF",csv],"text/csv;charset=utf-8",exportName("csv"));
}

/** Landscape activity report patterned on EasyRamp exportPdf. */
export async function exportActivityPdf(rows:TradeItem[],filters:ActivityExportFilters){
  const [{jsPDF},{default:autoTable},logo]=await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    strivepayLogoPng(),
  ]);
  const navy:[number,number,number]=[45,48,71];
  const teal:[number,number,number]=[0,178,202];
  const mint:[number,number,number]=[236,250,252];
  const muted:[number,number,number]=[91,111,132];
  const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  const pageW=297;

  doc.setFillColor(...navy);
  doc.rect(0,0,pageW,30,"F");
  const logoH=12;
  const logoW=logoH*logo.aspect;
  doc.addImage(logo.dataUrl,"PNG",14,9,logoW,logoH,undefined,"FAST");
  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold");
  doc.setFontSize(14);
  doc.text("Activity report",pageW-14,17.5,{align:"right"});

  doc.setTextColor(...navy);
  doc.setFontSize(18);
  doc.text("Transactions",14,43);
  doc.setFont("helvetica","normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  const filterSummary=[
    filters.direction&&filters.direction!=="ALL"?`Type: ${filters.direction==="BUY"?"Buy":filters.direction==="SELL"?"Sell":filters.direction}`:"All types",
    filters.status&&filters.status!=="ALL"?`Status: ${formatOrderStatus(filters.status)}`:"All statuses",
    filters.timeframeLabel||"All time",
    `${rows.length} transaction${rows.length===1?"":"s"}`,
  ].join("  |  ");
  doc.text(filterSummary,14,50);

  autoTable(doc,{
    startY:57,
    head:[["Date","Type","Status","Sent","Received","Transaction ID"]],
    body:rows.map(row=>[
      formatOrderDateShort(row.createdAt),
      tradeDirectionLabel(row.direction,row.status),
      formatOrderStatus(row.status),
      formatTradeAmount(row.sourceAmount,row.sourceAsset),
      formatTradeAmount(receivedAmount(row),row.destinationAsset),
      row.id,
    ]),
    theme:"grid",
    headStyles:{fillColor:teal,textColor:[255,255,255],fontStyle:"bold",cellPadding:3.2},
    bodyStyles:{textColor:navy,cellPadding:3.2,lineColor:[220,228,237],lineWidth:0.2},
    alternateRowStyles:{fillColor:mint},
    styles:{font:"helvetica",fontSize:8,overflow:"linebreak"},
    columnStyles:{
      0:{cellWidth:32},
      1:{cellWidth:28},
      2:{cellWidth:36},
      3:{cellWidth:42},
      4:{cellWidth:42},
      5:{cellWidth:85},
    },
    margin:{left:14,right:14,bottom:18},
    didDrawPage:data=>{
      doc.setDrawColor(220,228,237);
      doc.line(14,199,pageW-14,199);
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text(`Generated ${new Date().toLocaleString()}`,14,205);
      doc.text(`Page ${data.pageNumber}`,pageW-14,205,{align:"right"});
    },
  });

  doc.save(exportName("pdf"));
}

export async function fetchActivityExportRows(opts:{
  scope:"all"|"page";
  pageRows:TradeItem[];
  page:number;
  size:number;
  direction:string;
  status:string;
  total:number;
  from?:string;
  to?:string;
}){
  const range={from:opts.from,to:opts.to,label:""};
  if(opts.scope==="page")return filterTradesByRange(opts.pageRows,range);
  const pageSize=100;
  const query=new URLSearchParams({page:"0",size:String(pageSize)});
  if(opts.direction&&opts.direction!=="ALL")query.set("direction",opts.direction);
  if(opts.status&&opts.status!=="ALL")query.set("status",opts.status);
  if(opts.from)query.set("from",opts.from);
  if(opts.to)query.set("to",opts.to);
  const firstResponse=await fetch(`/api/money/activity?${query.toString()}`,{credentials:"same-origin",headers:{Accept:"application/json"}});
  if(!firstResponse.ok)throw new Error("Could not load activity for export");
  const first=await firstResponse.json() as ActivityFeed;
  const rows=[...(Array.isArray(first.items)?first.items.map(asTrade):[])];
  const totalPages=Math.max(1,Math.ceil((first.total||0)/Math.max(1,first.size||pageSize)));
  for(let index=1;index<totalPages;index+=1){
    query.set("page",String(index));
    const nextResponse=await fetch(`/api/money/activity?${query.toString()}`,{credentials:"same-origin",headers:{Accept:"application/json"}});
    if(!nextResponse.ok)throw new Error("Could not load activity for export");
    const next=await nextResponse.json() as ActivityFeed;
    rows.push(...(Array.isArray(next.items)?next.items.map(asTrade):[]));
  }
  return rows;
}
