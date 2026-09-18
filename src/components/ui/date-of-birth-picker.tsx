"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {IconCalendar,IconChevronLeft,IconChevronRight} from "@tabler/icons-react";
import {Modal} from "./modal";

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS=["Mo","Tu","We","Th","Fr","Sa","Su"];
const DAY_MS=86400000;

function iso(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function parse(value?:string){
  if(!value||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))return null;
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(year,month-1,day);
  return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;
}
function maxDob(){const today=new Date();return new Date(today.getFullYear()-18,today.getMonth(),today.getDate());}
function minDob(){const today=new Date();return new Date(today.getFullYear()-120,today.getMonth(),today.getDate());}
function sameDay(a:Date|null,b:Date){return Boolean(a&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate());}
function monthNumber(date:Date){return date.getFullYear()*12+date.getMonth();}
function firstOfMonth(date:Date){return new Date(date.getFullYear(),date.getMonth(),1);}
function daysInMonth(year:number,month:number){return new Date(year,month+1,0).getDate();}
function clampDateWithin(date:Date,earliest:Date,latest:Date){return date.getTime()<earliest.getTime()?earliest:date.getTime()>latest.getTime()?latest:date;}

export function DateOfBirthPicker({value,onChange,error}:{value:string;onChange:(value:string)=>void;error?:string}){
  const selected=parse(value),latest=useMemo(()=>maxDob(),[]),earliest=useMemo(()=>minDob(),[]);
  const [open,setOpen]=useState(false);
  const [view,setView]=useState<Date>(()=>firstOfMonth(selected??latest));
  const [focusDay,setFocusDay]=useState("");
  const triggerRef=useRef<HTMLButtonElement>(null);
  const gridRef=useRef<HTMLDivElement>(null);
  const wasOpen=useRef(false);
  const earliestMonth=monthNumber(earliest),latestMonth=monthNumber(latest);
  const years=Array.from({length:latest.getFullYear()-earliest.getFullYear()+1},(_,index)=>latest.getFullYear()-index);
  const viewMonth=monthNumber(view);
  const monthAllowed=(year:number,month:number)=>{
    const key=year*12+month;
    return key>=earliestMonth&&key<=latestMonth;
  };
  const allowed=(date:Date)=>date.getTime()>=earliest.getTime()&&date.getTime()<=latest.getTime();
  const setViewAndFocus=(date:Date)=>{
    const next=clampDateWithin(date,earliest,latest);
    setView(firstOfMonth(next));
    setFocusDay(iso(next));
  };
  const first=new Date(view.getFullYear(),view.getMonth(),1),leading=(first.getDay()+6)%7,days=daysInMonth(view.getFullYear(),view.getMonth());
  const cells=[...Array<null>(leading).fill(null),...Array.from({length:days},(_,index)=>new Date(view.getFullYear(),view.getMonth(),index+1))];

  useEffect(()=>{
    if(open){
      wasOpen.current=true;
      const target=focusDay||iso(clampDateWithin(selected??latest,earliest,latest));
      const focus=()=>{
        const button=gridRef.current?.querySelector<HTMLButtonElement>(`button[data-day="${target}"]`)??gridRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
        button?.focus();
      };
      if(typeof window!=="undefined"&&"requestAnimationFrame" in window){
        const frame=window.requestAnimationFrame(focus);
        return()=>window.cancelAnimationFrame(frame);
      }
      focus();
    }
    if(wasOpen.current&&!open){
      triggerRef.current?.focus();
      wasOpen.current=false;
    }
  },[open,view,focusDay,selected,latest,earliest]);

  function closePicker(){setOpen(false);}
  function shift(amount:number){
    const nextMonth=viewMonth+amount;
    if(nextMonth<earliestMonth||nextMonth>latestMonth)return;
    const next=new Date(Math.floor(nextMonth/12),nextMonth%12,1);
    setViewAndFocus(new Date(next.getFullYear(),next.getMonth(),Math.min(view.getDate(),daysInMonth(next.getFullYear(),next.getMonth()))));
  }
  function choose(day:Date){if(!allowed(day))return;onChange(iso(day));closePicker();}
  function moveBy(day:Date,amount:number){
    const target=new Date(day.getTime()+amount*DAY_MS);
    if(!allowed(target))return;
    setViewAndFocus(target);
  }
  function moveToMonth(day:Date,amount:number,yearStep=false){
    const targetMonth=viewMonth+(yearStep?amount*12:amount);
    if(targetMonth<earliestMonth||targetMonth>latestMonth)return;
    const year=Math.floor(targetMonth/12),month=targetMonth%12;
    setViewAndFocus(new Date(year,month,Math.min(day.getDate(),daysInMonth(year,month))));
  }
  function onDayKeyDown(event:React.KeyboardEvent<HTMLButtonElement>,day:Date){
    let handled=true;
    switch(event.key){
      case "ArrowLeft":moveBy(day,-1);break;
      case "ArrowRight":moveBy(day,1);break;
      case "ArrowUp":moveBy(day,-7);break;
      case "ArrowDown":moveBy(day,7);break;
      case "Home":moveBy(day,-((day.getDay()+6)%7));break;
      case "End":moveBy(day,6-((day.getDay()+6)%7));break;
      case "PageUp":moveToMonth(day,-1,event.shiftKey);break;
      case "PageDown":moveToMonth(day,1,event.shiftKey);break;
      case "Enter":
      case " ":choose(day);break;
      default:handled=false;
    }
    if(handled)event.preventDefault();
  }
  const display=selected?new Intl.DateTimeFormat("en",{day:"2-digit",month:"short",year:"numeric"}).format(selected):"Choose your date of birth";

  return <>
    <button ref={triggerRef} className={`compliance-date-trigger${error?" invalid":""}`} type="button" onClick={()=>{setViewAndFocus(selected??latest);setOpen(true);}} aria-haspopup="dialog" aria-label={`Date of birth: ${display}`}>
      <span><IconCalendar size={19}/><strong className={selected?"":"placeholder"}>{display}</strong></span><small>18+ only</small>
    </button>
    {error?<small className="compliance-control-error">{error}</small>:null}
    <Modal open={open} onClose={closePicker} title="Date of birth" description="Choose the date shown on your identity document." size="small" className="compliance-date-dialog">
      <div className="compliance-calendar-toolbar">
        <button type="button" onClick={()=>shift(-1)} disabled={viewMonth<=earliestMonth} aria-label="Previous month"><IconChevronLeft size={18}/></button>
        <div><select aria-label="Month" value={view.getMonth()} onChange={event=>{const month=Number(event.target.value);if(monthAllowed(view.getFullYear(),month))setViewAndFocus(new Date(view.getFullYear(),month,view.getDate()));}}>{MONTHS.map((month,index)=><option key={month} value={index} disabled={!monthAllowed(view.getFullYear(),index)}>{month}</option>)}</select><select aria-label="Year" value={view.getFullYear()} onChange={event=>{const year=Number(event.target.value);const month=monthAllowed(year,view.getMonth())?view.getMonth():year===earliest.getFullYear()?earliest.getMonth():latest.getMonth();setViewAndFocus(new Date(year,month,view.getDate()));}}>{years.map(year=><option key={year} value={year}>{year}</option>)}</select></div>
        <button type="button" onClick={()=>shift(1)} disabled={viewMonth>=latestMonth} aria-label="Next month"><IconChevronRight size={18}/></button>
      </div>
      <div ref={gridRef} className="compliance-calendar" role="grid" aria-label={`${MONTHS[view.getMonth()]} ${view.getFullYear()}`}>
        {WEEKDAYS.map(day=><span className="weekday" key={day} role="columnheader">{day}</span>)}
        {cells.map((day,index)=>day?<button type="button" role="gridcell" data-day={iso(day)} tabIndex={focusDay===iso(day)?0:-1} aria-selected={sameDay(selected,day)} aria-label={new Intl.DateTimeFormat("en",{dateStyle:"full"}).format(day)} className={sameDay(selected,day)?"selected":""} disabled={!allowed(day)} onFocus={()=>setFocusDay(iso(day))} onKeyDown={event=>onDayKeyDown(event,day)} onClick={()=>choose(day)} key={iso(day)}>{day.getDate()}</button>:<span aria-hidden="true" key={`blank-${index}`}/>) }
      </div>
      <p className="compliance-calendar-note">Your date must match your verification document.</p>
    </Modal>
  </>;
}
