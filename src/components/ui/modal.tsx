"use client";
import {useEffect,useId,useRef,type ReactNode} from "react";
import {IconX} from "@tabler/icons-react";
export function Modal({open,onClose,title,description,children,size="medium",className=""}:{open:boolean;onClose:()=>void;title:string;description?:string;children:ReactNode;size?:"small"|"medium"|"large";className?:string}){
  const ref=useRef<HTMLDialogElement>(null);
  const id=useId();
  useEffect(()=>{
    const dialog=ref.current;
    if(!dialog)return;
    if(open&&!dialog.open)dialog.showModal();
    // Test doubles and a few embedded browsers expose the `open` attribute
    // without updating HTMLDialogElement.open. Treat either signal as open so
    // dismissing a selector always clears its state before it is reopened.
    if(!open&&(dialog.open||dialog.hasAttribute("open")))dialog.close();
  },[open]);
  return <dialog ref={ref} className={`ui-dialog ${size} ${className}`.trim()} aria-labelledby={`${id}-title`} aria-describedby={description?`${id}-description`:undefined} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===ref.current)onClose();}}>
    <div className="dialog-panel">
      <header>
        <div><span className="micro-label">STRIVEPAY</span><h2 id={`${id}-title`}>{title}</h2>{description?<p id={`${id}-description`}>{description}</p>:null}</div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog"><IconX size={19} stroke={2}/></button>
      </header>
      <div className="dialog-body">{children}</div>
    </div>
  </dialog>;
}
