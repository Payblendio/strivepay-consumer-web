// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {SupportWorkspace} from "./support-workspace";
vi.mock("@/lib/swal",()=>({confirmAction:vi.fn()}));
import {confirmAction} from "@/lib/swal";
const mocks=vi.hoisted(()=>({fetch:vi.fn(),dispose:vi.fn()}));
vi.mock("./support-linked-activity",()=>({
  SupportLinkedActivity:()=>null,
  SupportLinkedActivityPreview:({activity,onRemove}:{activity:{id:string};onRemove:()=>void})=>(
    <div>
      <strong>Linked transaction</strong>
      <p>{activity.id}</p>
      <button type="button" onClick={onRemove}>Remove transaction link</button>
    </div>
  ),
}));
vi.mock("@/lib/customer-session",()=>({customerFetch:mocks.fetch}));
vi.mock("@/lib/support-connection",()=>({connectSupport:()=>mocks.dispose}));
const ticket={id:"00000000-0000-0000-0000-000000000001",number:42,subject:"Transfer question",category:"TRANSFER",status:"OPEN",updatedAt:"2026-09-08T12:00:00Z",unreadCount:1};
beforeEach(()=>{
 mocks.fetch.mockReset();mocks.dispose.mockReset();
 mocks.fetch.mockImplementation(async(url:string,init?:RequestInit)=>{
   const value=url.includes("/history")?{items:[],before:null,hasMore:false}:url.includes("/messages")?[]:url.endsWith(ticket.id)?ticket:url.includes("/read")?{}:[ticket];
   return {ok:true,status:200,json:async()=>value};
 });
});
afterEach(cleanup);
it.each([false,true])("requires confirmation before reopening (confirmed=%s)",async confirmed=>{
 vi.mocked(confirmAction).mockReset().mockResolvedValue(confirmed);
 const original=mocks.fetch.getMockImplementation()!;
 mocks.fetch.mockImplementation(async(url:string,init?:RequestInit)=>url.endsWith(ticket.id)?{ok:true,status:200,json:async()=>({...ticket,status:"RESOLVED"})}:original(url,init));
 render(<SupportWorkspace/>);
 fireEvent.click(await screen.findByRole("button",{name:/Transfer question/}));
 fireEvent.click(await screen.findByRole("button",{name:"Reopen conversation"}));
 await waitFor(()=>expect(screen.getByRole("button",{name:"Reopen conversation"})).toBeEnabled());
 expect(confirmAction).toHaveBeenCalledWith(expect.objectContaining({title:"Reopen conversation?",confirmLabel:"Reopen conversation",showCancelButton:false}));
 const changes=mocks.fetch.mock.calls.filter(([url,init])=>url.endsWith("/status")&&init?.method==="POST");
 expect(changes).toHaveLength(confirmed?1:0);
 if(confirmed)expect(JSON.parse(changes[0][1].body)).toEqual({status:"OPEN"});
});
it.each([false,true])("requires confirmation before resolving (confirmed=%s)",async confirmed=>{
 vi.mocked(confirmAction).mockResolvedValue(confirmed);
 render(<SupportWorkspace/>);
 fireEvent.click(await screen.findByRole("button",{name:/Transfer question/}));
 fireEvent.click(await screen.findByRole("button",{name:"Mark resolved"}));
 await waitFor(()=>expect(screen.getByRole("button",{name:"Mark resolved"})).toBeEnabled());
 expect(confirmAction).toHaveBeenCalledWith(expect.objectContaining({confirmLabel:"Mark resolved",showCancelButton:false}));
 const changes=mocks.fetch.mock.calls.filter(([url,init])=>url.endsWith("/status")&&init?.method==="POST");
 expect(changes).toHaveLength(confirmed?1:0);
 if(confirmed)expect(JSON.parse(changes[0][1].body)).toEqual({status:"RESOLVED"});
});
it("keeps the open thread and its draft when selected again",async()=>{
 render(<SupportWorkspace permissions={["support.view","support.reply"]}/>);
 fireEvent.click(await screen.findByRole("button",{name:/Transfer question/}));
 const reply=await screen.findByRole("textbox",{name:"Reply"});
 fireEvent.change(reply,{target:{value:"Keep this draft"}});
 fireEvent.click(screen.getByRole("button",{name:/Transfer question/}));
 expect(screen.getByRole("heading",{name:"Transfer question"})).toBeInTheDocument();
 expect(screen.getByRole("textbox",{name:"Reply"})).toHaveValue("Keep this draft");
 expect(screen.queryByText("Loading conversation…")).not.toBeInTheDocument();
});
it("includes the selected transaction and permits removing it before retry",async()=>{
 const original=mocks.fetch.getMockImplementation()!;
 const bodies:Record<string,unknown>[]=[];
 mocks.fetch.mockImplementation(async(url:string,init?:RequestInit)=>{
   if(url.endsWith("/tickets")&&init?.method==="POST"){
     bodies.push(JSON.parse(init.body as string));
     return {ok:false,status:503,json:async()=>({title:"Request not confirmed"})};
   }
   return original(url,init);
 });
 const activity={kind:"CONVERSION" as const,id:ticket.id};
 render(<SupportWorkspace initialActivity={activity}/>);
 expect(screen.getByText("Linked transaction")).toBeInTheDocument();
 fireEvent.change(screen.getByRole("textbox",{name:"Subject"}),{target:{value:"Transfer help"}});
 fireEvent.change(screen.getByRole("textbox",{name:"Message"}),{target:{value:"Please investigate"}});
 fireEvent.click(screen.getByRole("button",{name:"Send request"}));
 await screen.findByText("Request not confirmed");
 expect(bodies[0].activity).toEqual(activity);
 fireEvent.click(screen.getByRole("button",{name:"Remove transaction link"}));
 fireEvent.click(screen.getByRole("button",{name:"Send request"}));
 await waitFor(()=>expect(bodies).toHaveLength(2));
 expect(bodies[1].activity).toBeNull();
 expect(bodies[1].clientMessageId).not.toBe(bodies[0].clientMessageId);
});
it("reuses an unchanged request identifier but renews it when subject or topic changes",async()=>{
 const original=mocks.fetch.getMockImplementation()!;
 const attempts:{subject:string;category:string;clientMessageId:string}[]=[];
 mocks.fetch.mockImplementation(async(url:string,init?:RequestInit)=>{
   if(url.endsWith("/tickets")&&init?.method==="POST"){
     attempts.push(JSON.parse(init.body as string));
     return {ok:false,status:503,json:async()=>({title:"Request not confirmed"})};
   }
   return original(url,init);
 });
 render(<SupportWorkspace/>);
 fireEvent.click(screen.getByRole("button",{name:"New request"}));
 fireEvent.change(screen.getByRole("textbox",{name:"Subject"}),{target:{value:"Original subject"}});
 fireEvent.change(screen.getByRole("textbox",{name:"Message"}),{target:{value:"Please investigate"}});
 const send=async(count:number)=>{
   fireEvent.click(screen.getByRole("button",{name:"Send request"}));
   await waitFor(()=>expect(attempts).toHaveLength(count));
   await waitFor(()=>expect(screen.getByRole("button",{name:"Send request"})).toBeEnabled());
 };
 await send(1);await send(2);
 expect(attempts[1].clientMessageId).toBe(attempts[0].clientMessageId);
 fireEvent.change(screen.getByRole("textbox",{name:"Subject"}),{target:{value:"Revised subject"}});
 await send(3);
 expect(attempts[2].subject).toBe("Revised subject");
 expect(attempts[2].clientMessageId).not.toBe(attempts[1].clientMessageId);
 fireEvent.change(screen.getByRole("combobox",{name:"Topic"}),{target:{value:"TRANSFER"}});
 await send(4);
 expect(attempts[3].category).toBe("TRANSFER");
 expect(attempts[3].clientMessageId).not.toBe(attempts[2].clientMessageId);
});
it("keeps a failed send visible when a background refresh succeeds",async()=>{
 render(<SupportWorkspace permissions={["support.view","support.reply"]}/>);
 fireEvent.click(await screen.findByRole("button",{name:/Transfer question/}));
 fireEvent.change(await screen.findByRole("textbox",{name:"Reply"}),{target:{value:"Please check this"}});
 const original=mocks.fetch.getMockImplementation()!;
 mocks.fetch.mockImplementation(async(url:string,init?:RequestInit)=>init?.method==="POST"&&url.endsWith("/messages")?{ok:false,status:503,json:async()=>({title:"Message delivery failed"})}:original(url,init));
 fireEvent.click(screen.getByRole("button",{name:"Send reply"}));
 expect(await screen.findByRole("alert")).toHaveTextContent("Message delivery failed");
 const previous=mocks.fetch.mock.calls.filter(([url])=>url.includes("tickets?page")).length;
 fireEvent.click(screen.getByRole("button",{name:"Refresh support"}));
 await waitFor(()=>expect(mocks.fetch.mock.calls.filter(([url])=>url.includes("tickets?page")).length).toBeGreaterThan(previous));
 expect(screen.getByRole("alert")).toHaveTextContent("Message delivery failed");
 expect(screen.getByRole("textbox",{name:"Reply"})).toHaveValue("Please check this");
});
it("shows inbox failures beside the list and recovers on retry",async()=>{
 const original=mocks.fetch.getMockImplementation()!;
 mocks.fetch.mockImplementation(async(url:string,init?:RequestInit)=>url.includes("tickets?page")?{ok:false,status:503,json:async()=>({title:"Inbox unavailable"})}:original(url,init));
 render(<SupportWorkspace/>);
 expect(await screen.findByRole("alert")).toHaveTextContent("Inbox unavailable");
 mocks.fetch.mockImplementation(original);
 fireEvent.click(screen.getByRole("button",{name:"Retry conversations"}));
 expect(await screen.findByRole("button",{name:/Transfer question/})).toBeInTheDocument();
 expect(screen.queryByText("Inbox unavailable")).not.toBeInTheDocument();
});
it("opens a conversation with its status and reply composer",async()=>{
 render(<SupportWorkspace permissions={["support.view","support.reply"]}/>);
 fireEvent.click(await screen.findByRole("button",{name:/Transfer question/}));
 expect(await screen.findByRole("heading",{name:"Transfer question"})).toBeInTheDocument();
 expect(screen.getByRole("textbox",{name:"Reply"})).toBeInTheDocument();
});
it("retains a failed reply and retries with the same message identifier",async()=>{
 render(<SupportWorkspace permissions={["support.view","support.reply"]}/>);
 fireEvent.click(await screen.findByRole("button",{name:/Transfer question/}));
 const input=await screen.findByRole("textbox",{name:"Reply"});
 fireEvent.change(input,{target:{value:"Please check my transfer"}});
 const original=mocks.fetch.getMockImplementation()!;
 mocks.fetch.mockImplementation(async(url:string,init?:RequestInit)=>init?.method==="POST"&&url.endsWith("/messages")?{ok:false,status:503,json:async()=>({title:"Try later"})}:original(url,init));
 fireEvent.click(screen.getByRole("button",{name:"Send reply"}));
 expect(await screen.findByRole("alert")).toHaveTextContent("Try later");
 expect(input).toHaveValue("Please check my transfer");
 fireEvent.click(screen.getByRole("button",{name:"Send reply"}));
 await waitFor(()=>expect(mocks.fetch.mock.calls.filter(([url,init])=>url.endsWith("/messages")&&init?.method==="POST")).toHaveLength(2));
 const sends=mocks.fetch.mock.calls.filter(([url,init])=>url.endsWith("/messages")&&init?.method==="POST");
 expect(JSON.parse(sends[0][1].body).clientMessageId).toBe(JSON.parse(sends[1][1].body).clientMessageId);
});
it("preserves loaded earlier history when new messages arrive",async()=>{
 const message=(sequence:number,body:string)=>({id:String(sequence),sequence,body,senderType:"ADMIN",internalNote:false,createdAt:ticket.updatedAt});
 mocks.fetch.mockImplementation(async(url:string)=>{
   const value=url.includes("/history")?(url.includes("before=")?{items:[message(1,"Earlier reply")],before:1,hasMore:false}:{items:[message(2,"Latest reply")],before:2,hasMore:true})
     :url.includes("/messages")?[message(3,"New reply")]:url.endsWith(ticket.id)?ticket:url.includes("/read")?{}:[ticket];
   return {ok:true,status:200,json:async()=>value};
 });
 render(<SupportWorkspace permissions={["support.view","support.reply"]}/>);
 fireEvent.click(await screen.findByRole("button",{name:/Transfer question/}));
 expect(await screen.findByText("Latest reply")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Load earlier messages"}));
 expect(await screen.findByText("Earlier reply")).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Load earlier messages"})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Refresh support"}));
 expect(await screen.findByText("New reply")).toBeInTheDocument();
 expect(screen.getByText("Earlier reply")).toBeInTheDocument();
 expect(screen.getAllByText("Latest reply")).toHaveLength(1);
 expect(mocks.fetch.mock.calls.some(([url])=>url.includes("/messages?size=100&after=2"))).toBe(true);
});
it("submits a literal search to the scoped inbox",async()=>{
 render(<SupportWorkspace/>);
 fireEvent.change(screen.getByRole("searchbox",{name:"Find a conversation"}),{target:{value:"Transfer & payout"}});
 fireEvent.click(screen.getByRole("button",{name:"Search"}));
 await waitFor(()=>expect(mocks.fetch.mock.calls.some(([url])=>url.includes("q=Transfer%20%26%20payout"))).toBe(true));
 fireEvent.click(screen.getByRole("button",{name:"Clear search"}));
 expect(screen.getByRole("searchbox")).toHaveValue("");
});
it("restores an unsent reply after visiting another conversation",async()=>{
 const second={...ticket,id:"00000000-0000-0000-0000-000000000002",number:43,subject:"Account question"};
 mocks.fetch.mockImplementation(async(url:string)=>{
   const value=url.includes("/history")?{items:[],before:null,hasMore:false}:url.includes("/messages")?[]:url.endsWith(ticket.id)?ticket:url.endsWith(second.id)?second:url.includes("/read")?{}:[ticket,second];
   return {ok:true,status:200,json:async()=>value};
 });
 render(<SupportWorkspace permissions={["support.view","support.reply"]}/>);
 fireEvent.click(await screen.findByRole("button",{name:/Transfer question/}));
 fireEvent.change(await screen.findByRole("textbox",{name:"Reply"}),{target:{value:"Unsent transfer details"}});
 fireEvent.click(screen.getByRole("button",{name:/Account question/}));
 expect(await screen.findByRole("textbox",{name:"Reply"})).toHaveValue("");
 fireEvent.click(screen.getByRole("button",{name:/Transfer question/}));
 expect(await screen.findByRole("textbox",{name:"Reply"})).toHaveValue("Unsent transfer details");
});
it("closes the real-time subscription on unmount",()=>{
 const view=render(<SupportWorkspace/>);view.unmount();expect(mocks.dispose).toHaveBeenCalled();
});
