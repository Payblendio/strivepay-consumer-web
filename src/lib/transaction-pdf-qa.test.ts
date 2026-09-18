// @vitest-environment jsdom
// Opt-in visual fixtures: PDF_QA_OUTPUT_DIR=<absolute path> vitest run this file.
import {Blob as NodeBlob} from "node:buffer";
import {mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import {join} from "node:path";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import type {jsPDF,jsPDFOptions} from "jspdf";
import type {TradeItem} from "@/components/dashboard-route-copy";
import {downloadTransactionReceipt} from "./transaction-receipt";
import {exportActivityPdf} from "./activity-export";

const captured=vi.hoisted(()=>({documents:[] as jsPDF[]}));
vi.mock("jspdf",async importOriginal=>{
  const actual=await importOriginal<typeof import("jspdf")>();
  return {...actual,jsPDF:vi.fn(function(options?:jsPDFOptions){
    const doc=new actual.jsPDF(options);
    doc.save=new Proxy(doc.save,{apply(){captured.documents.push(doc);return doc;}});
    return doc;
  })};
});
const output=process.env.PDF_QA_OUTPUT_DIR;
const completed:TradeItem={
  id:"11111111-2222-3333-4444-555555555555",direction:"FIAT_TO_CRYPTO",status:"COMPLETED",
  createdAt:"2026-09-01T10:00:00Z",updatedAt:"2026-09-01T10:05:00Z",sourceAsset:"EUR",sourceAmount:"100",
  destinationAsset:"USDC",destinationNetwork:"ETHEREUM",quotedDestinationAmount:"99",deliveredAmount:"98",
  merchantFeeAmount:"2",feeCurrency:"EUR",receivingAddress:"0x1111111111111111111111111111111111111111",
  blockchainHash:`0x${"a".repeat(64)}`,transferReference:"QA-FIXTURE-NOT-A-REAL-TRANSACTION",
};

describe.skipIf(!output)("synthetic PDF visual QA",()=>{
  beforeEach(()=>{
    captured.documents.length=0;
    const localRequire=createRequire(import.meta.url);
    const sharp=localRequire(localRequire.resolve("sharp",{paths:[localRequire.resolve("next")]}));
    const blobs=new Map<string,NodeBlob>();let blobIndex=0;
    vi.stubGlobal("Blob",NodeBlob);
    vi.stubGlobal("fetch",vi.fn(async(path:string)=>({ok:true,text:async()=>readFileSync(join(process.cwd(),"public",path),"utf8")})));
    vi.stubGlobal("URL",class extends URL{
      static createObjectURL(blob:unknown){const id=`blob:pdf-qa-${blobIndex++}`;blobs.set(id,blob as NodeBlob);return id;}
      static revokeObjectURL(id:string){blobs.delete(id);}
    });
    class RasterImage{
      naturalWidth=1;naturalHeight=1;png="";
      onload:(()=>void)|null=null;onerror:(()=>void)|null=null;
      set src(value:string){
        void blobs.get(value)!.text().then(async svg=>{
          const data=await sharp(Buffer.from(svg)).resize({width:960}).png().toBuffer({resolveWithObject:true});
          this.naturalWidth=data.info.width;this.naturalHeight=data.info.height;this.png=`data:image/png;base64,${data.data.toString("base64")}`;this.onload?.();
        }).catch(()=>this.onerror?.());
      }
    }
    vi.stubGlobal("Image",RasterImage);
    const drawn=new WeakMap<HTMLCanvasElement,RasterImage>();
    vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockImplementation(function(this:HTMLCanvasElement){
      return {drawImage:(image:RasterImage)=>drawn.set(this,image),fillRect:()=>{}} as unknown as CanvasRenderingContext2D;
    });
    vi.spyOn(HTMLCanvasElement.prototype,"toDataURL").mockImplementation(function(this:HTMLCanvasElement){return drawn.get(this)!.png;});
  });
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

  it("renders real branded receipts and a multi-page activity report using fixtures only",async()=>{
    await downloadTransactionReceipt(completed);
    await downloadTransactionReceipt({...completed,status:"PAYOUT_PENDING",deliveredAmount:0,receivingAddress:undefined,blockchainHash:undefined});
    await downloadTransactionReceipt({...completed,direction:"CRYPTO_TO_FIAT",sourceAsset:"BTC",sourceAmount:"0.002",sourceNetwork:"BITCOIN",destinationAsset:"EUR",destinationNetwork:null,deliveredAmount:"100",quotedDestinationAmount:"101",payoutAccountName:"QA Primary EUR account",payoutAccountMask:"****1332"},Array.from({length:50},(_,index)=>({id:`qa-event-${index}`,toStatus:index===49?"COMPLETED":"PROCESSING",occurredAt:new Date(Date.UTC(2026,8,1,10,index)).toISOString()})));
    await exportActivityPdf(Array.from({length:36},(_,index)=>({...completed,id:`qa-transaction-${String(index+1).padStart(3,"0")}-0000-0000-0000-000000000000`,status:index%3===0?"PAYOUT_PENDING":"COMPLETED",deliveredAmount:index%3===0?0:98,createdAt:new Date(Date.UTC(2026,8,1+Math.floor(index/4),10,index%4)).toISOString()})),{direction:"ALL",status:"ALL",timeframeLabel:"Synthetic QA fixtures - September 2026"});
    expect(captured.documents).toHaveLength(4);
    const directory=output!;mkdirSync(directory,{recursive:true});
    ["receipt-completed.pdf","receipt-pending-zero.pdf","receipt-long-history.pdf","activity-report.pdf"].forEach((name,index)=>{
      const document=captured.documents[index];expect(document.output()).toMatch(/^%PDF-/);
      writeFileSync(join(directory,name),Buffer.from(document.output("arraybuffer")));
    });
  },30000);
});
