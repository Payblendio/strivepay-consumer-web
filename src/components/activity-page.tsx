"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState,useTransition} from "react";
import {
  IconArrowDownLeft,
  IconArrowRight,
  IconArrowUpRight,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconLoader2,
} from "@tabler/icons-react";
import {useDashboardCustomer,useDashboardFinance,useDashboardSetup} from "./dashboard-customer";
import {CurrencyPairClip,tradePairAssets} from "./currency-pair-clip";
import {useToast} from "@/components/ui/toast";
import {Modal} from "@/components/ui/modal";
import {
  exportActivityCsv,
  exportActivityPdf,
  fetchActivityExportRows,
  resolveExportRange,
  type ExportTimeframe,
} from "@/lib/activity-export";
import {
  accountSetupHref,
  formatOrderDateShort,
  formatOrderStatus,
  formatTradeAmount,
  isBuyDirection,
  orderStatusClass,
  destinationAmountSummary,
  tradeDirectionLabel,
  type TradeItem,
} from "./dashboard-route-copy";
import {RouteEmptyState} from "./route-empty-state";

type DirectionFilter="ALL"|"BUY"|"SELL";
const PAGE_SIZES=[10,25,50] as const;
const DEFAULT_PAGE_SIZE=10;

function hrefFor(opts:{page:number;size:number;direction:DirectionFilter;status:string}){
  const query=new URLSearchParams();
  if(opts.page>0)query.set("page",String(opts.page));
  if(opts.size!==DEFAULT_PAGE_SIZE)query.set("size",String(opts.size));
  if(opts.direction!=="ALL")query.set("direction",opts.direction);
  if(opts.status!=="ALL")query.set("status",opts.status);
  const value=query.toString();
  return value?`/dashboard/activity?${value}`:"/dashboard/activity";
}

function failureCopy(status:number|null){
  if(status===401)return {title:"Sign in to view activity",hint:"Your session has expired."};
  if(status===403)return {title:"Activity unavailable",hint:"Your account doesn’t have access to this activity."};
  return {title:"Couldn’t load activity",hint:"Your history hasn’t loaded. Please try again."};
}

/** Compact page list that stays fixed-size even for thousands of pages. */
function pageItems(current:number,pages:number){
  if(pages<=1)return [1];
  if(pages<=7)return Array.from({length:pages},(_,index)=>index+1);

  const window=new Set<number>([1,pages,current]);
  for(let offset=-2;offset<=2;offset+=1){
    const page=current+offset;
    if(page>1&&page<pages)window.add(page);
  }
  if(current<=4){
    window.add(2);window.add(3);window.add(4);window.add(5);
  }
  if(current>=pages-3){
    window.add(pages-1);window.add(pages-2);window.add(pages-3);window.add(pages-4);
  }

  return Array.from(window).filter(page=>page>=1&&page<=pages).sort((a,b)=>a-b);
}

export function ActivityPage({
  trades,
  tradeDataAvailable,
  loadStatus=null,
  page,
  size,
  total,
  direction,
  status,
  statuses,
}:{
  trades:TradeItem[];
  tradeDataAvailable:boolean;
  loadStatus?:number|null;
  page:number;
  size:number;
  total:number;
  direction:DirectionFilter;
  status:string;
  statuses:string[];
}){
  const router=useRouter();
  const {show}=useToast();
  const [isPending,startTransition]=useTransition();
  const customer=useDashboardCustomer();
  const setup=useDashboardSetup();
  const {accountScope}=useDashboardFinance();
  const [exportOpen,setExportOpen]=useState(false);
  const [exportFormat,setExportFormat]=useState<"pdf"|"csv">("pdf");
  const [exportScope,setExportScope]=useState<"all"|"page">("all");
  const [exportTimeframe,setExportTimeframe]=useState<ExportTimeframe>("all");
  const [exportFrom,setExportFrom]=useState("");
  const [exportTo,setExportTo]=useState("");
  const [exporting,setExporting]=useState(false);
  const setupHref=accountSetupHref(customer.accountType,accountScope,setup);
  const emptyAction=setup?.pending
    ?{href:setupHref,label:"Check verification"}
    :setup?.approved
      ?{href:"/dashboard/buy",label:"Start converting"}
      :{href:setupHref,label:"Continue setup"};

  const pages=Math.max(1,Math.ceil(total/Math.max(1,size)));
  const currentPage=Math.min(page,pages-1);
  const from=total===0?0:currentPage*size+1;
  const to=Math.min(total,(currentPage+1)*size);
  const filterActive=direction!=="ALL"||status!=="ALL";
  const failed=!tradeDataAvailable;
  const empty=tradeDataAvailable&&total===0&&!filterActive;
  const noMatches=tradeDataAvailable&&trades.length===0&&filterActive;

  function go(next:{page?:number;size?:number;direction?:DirectionFilter;status?:string}){
    startTransition(()=>router.push(hrefFor({
      page:next.page??0,
      size:next.size??size,
      direction:next.direction??direction,
      status:next.status??status,
    })));
  }

  async function runExport(){
    setExporting(true);
    try{
      const range=resolveExportRange(exportTimeframe,exportFrom,exportTo);
      if(exportTimeframe==="custom"&&!range.from&&!range.to){
        show({tone:"warning",title:"Choose dates",message:"Pick a from and/or to date for the custom timeframe."});
        return;
      }
      if(range.from&&range.to&&range.from>range.to){
        show({tone:"warning",title:"Invalid range",message:"The from date must be on or before the to date."});
        return;
      }
      const rows=await fetchActivityExportRows({
        scope:exportScope,
        pageRows:trades,
        page:currentPage,
        size,
        direction,
        status,
        total,
        from:range.from,
        to:range.to,
      });
      if(rows.length===0){
        show({tone:"warning",title:"Nothing to export",message:"No transactions match the current filters and timeframe."});
        return;
      }
      if(exportFormat==="pdf")await exportActivityPdf(rows,{direction,status,timeframeLabel:range.label});
      else exportActivityCsv(rows);
      setExportOpen(false);
      show({tone:"success",title:"Download started",message:`Your ${rows.length} transaction${rows.length===1?"":"s"} ${rows.length===1?"file is":"files are"} being downloaded.`});
    }catch{
      show({tone:"danger",title:"Couldn’t export",message:"Try again in a moment."});
    }finally{
      setExporting(false);
    }
  }

  if(failed){
    const copy=failureCopy(loadStatus);
    return <section className="dashboard-canvas dashboard-route-page activity-workspace" aria-labelledby="activity-empty-title">
      <header className="sell-toolbar">
        <div>
          <p id="activity-empty-title">{copy.title}</p>
          <p className="sell-toolbar-hint">{copy.hint}</p>
        </div>
      </header>
      <div className="activity-empty-cta">
        {loadStatus===401?<Link className="compliance-primary" href="/login?returnTo=%2Fdashboard%2Factivity">Sign in</Link>:<button type="button" className="compliance-primary" onClick={()=>router.refresh()}>
          Try again <IconArrowRight size={17}/>
        </button>}
      </div>
    </section>;
  }

  if(empty||noMatches){
    const title=empty?"Nothing moved yet":"No matching transactions";
    const detail=empty?"Your first buy or sell will show up here.":"Clear or widen the filters to see more activity.";
    return <section className="dashboard-canvas dashboard-route-page activity-workspace" aria-label="Activity empty state">
      <RouteEmptyState title={title} detail={detail} imageSrc="/illustrations/account-activity-3d.png">
        {empty&&!setup?<button type="button" className="compliance-primary" onClick={()=>router.refresh()}>Retry setup status</button>:empty?<Link className="compliance-primary" href={emptyAction.href}>
          {emptyAction.label} <IconArrowRight size={17}/>
        </Link>:null}
        {noMatches?<button type="button" className="compliance-primary" onClick={()=>go({direction:"ALL",status:"ALL",page:0})}>
          Clear filters <IconArrowRight size={17}/>
        </button>:null}
      </RouteEmptyState>
    </section>;
  }

  return <section className="dashboard-canvas dashboard-route-page activity-workspace" aria-labelledby="activity-title">
    <header className="sell-toolbar">
      <div>
        <p id="activity-title">Buys and sells on this account</p>
        <p className="sell-toolbar-hint">Open a row for amounts, fees, and the status timeline.</p>
      </div>
    </header>

    <form className="activity-filters" onSubmit={event=>event.preventDefault()} aria-label="Filter activity" aria-busy={isPending}>
      <label>
        <span>Type</span>
        <select
          value={direction}
          onChange={event=>go({direction:event.target.value as DirectionFilter,page:0})}
          aria-label="Filter by type"
          disabled={isPending}
        >
          <option value="ALL">All</option>
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select
          value={statuses.includes(status)?status:"ALL"}
          onChange={event=>go({status:event.target.value,page:0})}
          aria-label="Filter by status"
          disabled={isPending}
        >
          {statuses.map(item=><option key={item} value={item}>{item==="ALL"?"All":formatOrderStatus(item)}</option>)}
        </select>
      </label>
      <label>
        <span>Per page</span>
        <select
          value={PAGE_SIZES.includes(size as typeof PAGE_SIZES[number])?size:DEFAULT_PAGE_SIZE}
          onChange={event=>go({size:Number(event.target.value),page:0})}
          aria-label="Rows per page"
          disabled={isPending}
        >
          {PAGE_SIZES.map(item=><option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      {filterActive?<button type="button" className="activity-filter-clear" disabled={isPending} onClick={()=>go({direction:"ALL",status:"ALL",page:0})}>Clear</button>:null}
      <button type="button" className="compliance-primary activity-export-button" disabled={total===0} onClick={()=>setExportOpen(true)}>
        <IconDownload size={16}/> Export
      </button>
    </form>

    <section className="activity-panel">
      <div className="activity-list-meta">
        <p>Showing {from}–{to} of {total} transaction{total===1?"":"s"}{filterActive?" matching filters":""}</p>
      </div>
      <ul className="activity-list">
        {trades.map(trade=>{
          const buy=isBuyDirection(trade.direction);
          const destination=destinationAmountSummary(trade);
          const pair=tradePairAssets(buy,trade.sourceAsset,trade.destinationAsset);
          return <li key={trade.id}>
            <Link href={`/dashboard/activity/${encodeURIComponent(trade.id)}`} className="activity-item">
              <div className="activity-item-lead">
                <span className="activity-direction">
                  <CurrencyPairClip from={pair.from} to={pair.to} size="sm"/>
                  {buy?<IconArrowUpRight size={14}/>:<IconArrowDownLeft size={14}/>}
                  {tradeDirectionLabel(trade.direction,trade.status)}
                </span>
                <span className={`activity-status ${orderStatusClass(trade.status)}`}>{formatOrderStatus(trade.status)}</span>
              </div>
              <div className="activity-item-amounts">
                <span><small>Sent</small>{formatTradeAmount(trade.sourceAmount,trade.sourceAsset)}</span>
                <span><small>{destination.label}</small>{destination.value}</span>
              </div>
              <div className="activity-item-meta">
                <time dateTime={trade.createdAt}>{formatOrderDateShort(trade.createdAt)}</time>
                <span className="activity-item-open" aria-hidden="true"><IconArrowRight size={16}/></span>
              </div>
            </Link>
          </li>;
        })}
      </ul>
      {pages>1?<nav className="activity-pagination" aria-label="Activity pages">
        <Link
          className="activity-pagination-button"
          aria-disabled={currentPage<=0}
          tabIndex={currentPage<=0?-1:undefined}
          href={currentPage<=0?"#":hrefFor({page:currentPage-1,size,direction,status})}
        >Previous</Link>
        <div className="activity-pagination-pages">
          {pageItems(currentPage+1,pages).map((item,index,visible)=>{
            const previous=visible[index-1]??0;
            const gap=index>0&&item-previous>1;
            const active=item===currentPage+1;
            return <span key={item} className="activity-pagination-slot">
              {gap?<i aria-hidden="true">…</i>:null}
              <Link
                className={`activity-pagination-page${active?" active":""}`}
                aria-current={active?"page":undefined}
                href={active?"#":hrefFor({page:item-1,size,direction,status})}
                tabIndex={active?-1:undefined}
              >{item}</Link>
            </span>;
          })}
        </div>
        <Link
          className="activity-pagination-button"
          aria-disabled={currentPage>=pages-1}
          tabIndex={currentPage>=pages-1?-1:undefined}
          href={currentPage>=pages-1?"#":hrefFor({page:currentPage+1,size,direction,status})}
        >Next</Link>
      </nav>:null}
    </section>

    <Modal open={exportOpen} onClose={()=>{if(!exporting)setExportOpen(false);}} title="Export transactions" description="Download the transactions matching your filters." size="large" className="compliance-selector-dialog activity-export-dialog">
        <fieldset className="activity-export-options">
          <legend>Format</legend>
          <label className={exportFormat==="pdf"?"selected":""}>
            <input type="radio" name="activity-export-format" value="pdf" checked={exportFormat==="pdf"} onChange={()=>setExportFormat("pdf")}/>
            <IconFileTypePdf size={20}/><span><strong>Designed PDF</strong><small>Branded landscape report</small></span>
          </label>
          <label className={exportFormat==="csv"?"selected":""}>
            <input type="radio" name="activity-export-format" value="csv" checked={exportFormat==="csv"} onChange={()=>setExportFormat("csv")}/>
            <IconFileTypeCsv size={20}/><span><strong>CSV spreadsheet</strong><small>Open in Excel or Sheets</small></span>
          </label>
        </fieldset>

        <fieldset className="activity-export-options compact timeframe-options">
          <legend>Timeframe</legend>
          {([
            ["all","All time","No date limit"],
            ["7d","Last 7 days","Rolling week"],
            ["30d","Last 30 days","Rolling month"],
            ["90d","Last 90 days","Rolling quarter"],
            ["custom","Custom range","Pick from and to dates"],
          ] as const).map(([value,title])=>(
            <label key={value} className={exportTimeframe===value?"selected":""}>
              <input
                type="radio"
                name="activity-export-timeframe"
                checked={exportTimeframe===value}
                onChange={()=>setExportTimeframe(value)}
              />
              <span><strong>{title}</strong></span>
            </label>
          ))}
          {exportTimeframe==="custom"?<div className="activity-export-dates">
            <label>
              <span>From</span>
              <input type="date" value={exportFrom} max={exportTo||undefined} onChange={event=>setExportFrom(event.target.value)}/>
            </label>
            <label>
              <span>To</span>
              <input type="date" value={exportTo} min={exportFrom||undefined} onChange={event=>setExportTo(event.target.value)}/>
            </label>
          </div>:null}
        </fieldset>

        <fieldset className="activity-export-options compact">
          <legend>Transactions</legend>
          <label className={exportScope==="all"?"selected":""}>
            <input type="radio" name="activity-export-scope" checked={exportScope==="all"} onChange={()=>setExportScope("all")}/>
            <span><strong>All matching</strong><small>{total} record{total===1?"":"s"} with type/status filters{exportTimeframe==="all"?"":", then timeframe"}</small></span>
          </label>
          <label className={exportScope==="page"?"selected":""}>
            <input type="radio" name="activity-export-scope" checked={exportScope==="page"} onChange={()=>setExportScope("page")}/>
            <span><strong>Current page</strong><small>{trades.length} visible record{trades.length===1?"":"s"}{exportTimeframe==="all"?"":", filtered by timeframe"}</small></span>
          </label>
        </fieldset>

        <div className="activity-export-includes">
          <strong>Included</strong>
          <p>Date, type, status, sent, received, and transaction ID.</p>
        </div>
        <div className="activity-export-actions">
          <button type="button" className="compliance-secondary" disabled={exporting} onClick={()=>setExportOpen(false)}>Cancel</button>
          <button type="button" className="compliance-primary" disabled={exporting} onClick={()=>void runExport()}>
            {exporting?<IconLoader2 className="spin" size={16}/>:<IconDownload size={16}/>}
            {exporting?"Preparing…":`Export ${exportFormat.toUpperCase()}`}
          </button>
        </div>
    </Modal>
  </section>;
}
