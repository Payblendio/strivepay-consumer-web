// @vitest-environment jsdom
import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {BankSelect,ChoiceSelect,RouteSelect,type SelectOption} from "./money-route-controls";
import {Modal} from "./ui/modal";
import {InternationalPhoneField} from "./ui/international-phone-field";

const originalShowModal=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,"showModal");
const originalClose=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,"close");
beforeAll(()=>{
  Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute("open","");}});
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute("open");}});
});
afterAll(()=>{
  if(originalShowModal)Object.defineProperty(HTMLDialogElement.prototype,"showModal",originalShowModal);else Reflect.deleteProperty(HTMLDialogElement.prototype,"showModal");
  if(originalClose)Object.defineProperty(HTMLDialogElement.prototype,"close",originalClose);else Reflect.deleteProperty(HTMLDialogElement.prototype,"close");
});
afterEach(cleanup);

const options:SelectOption[]=[{value:"EUR",label:"Euro",detail:"Bank funding",kind:"fiat"},{value:"GBP",label:"British Pound",detail:"Bank funding",kind:"fiat"}];

describe("shared selector accessibility",()=>{
  it("names native dialogs from unique headings and associates optional descriptions",()=>{
    const onClose=vi.fn();
    render(<><Modal open onClose={onClose} title="First dialog" description="First explanation"><p>Content</p></Modal><Modal open onClose={onClose} title="Second dialog"><p>More content</p></Modal></>);
    const first=screen.getByRole("dialog",{name:"First dialog"});
    const second=screen.getByRole("dialog",{name:"Second dialog"});
    expect(first).toHaveAccessibleDescription("First explanation");
    expect(first.getAttribute("aria-labelledby")).not.toBe(second.getAttribute("aria-labelledby"));
    expect(second).not.toHaveAttribute("aria-describedby");
    fireEvent(first,new Event("cancel",{bubbles:true,cancelable:true}));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders a selected boolean false value and announces selection and dialog state",()=>{
    const onChange=vi.fn();
    render(<ChoiceSelect label="Business account" value="false" options={[true,false]} onChange={onChange}/>);
    const trigger=screen.getByRole("button",{name:"Business account: False"});
    expect(trigger).toHaveTextContent("False");
    expect(trigger).toHaveAttribute("aria-haspopup","dialog");
    expect(trigger).toHaveAttribute("aria-expanded","false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded","true");
    const dialog=screen.getByRole("dialog",{name:"Business account"});
    expect(within(dialog).getByRole("button",{name:"False"})).toHaveAttribute("aria-pressed","true");
    fireEvent.click(within(dialog).getByRole("button",{name:"True"}));
    expect(onChange).toHaveBeenCalledWith("true");
    expect(trigger).toHaveAttribute("aria-expanded","false");
  });

  it("associates the route label and value, names search, and clears a dismissed empty search",()=>{
    const onChange=vi.fn();
    render(<RouteSelect label="Payout currency" value="EUR" options={options} onChange={onChange} placeholder="Choose a currency"/>);
    const trigger=screen.getByRole("button",{name:"Payout currency EUR Euro"});
    fireEvent.click(trigger);
    let dialog=screen.getByRole("dialog",{name:"Payout currency"});
    fireEvent.change(within(dialog).getByRole("textbox",{name:"Search payout currency"}),{target:{value:"missing"}});
    expect(within(dialog).getByRole("status")).toHaveTextContent("No matches for “missing”");
    fireEvent(dialog,new Event("cancel",{bubbles:true,cancelable:true}));
    expect(trigger).toHaveAttribute("aria-expanded","false");
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    dialog=screen.getByRole("dialog",{name:"Payout currency"});
    expect(within(dialog).getByRole("textbox",{name:"Search payout currency"})).toHaveValue("");
    expect(within(dialog).getByRole("button",{name:/EUR · Euro/})).toHaveAttribute("aria-pressed","true");
    fireEvent.click(within(dialog).getByRole("button",{name:/GBP · British Pound/}));
    expect(onChange).toHaveBeenCalledWith("GBP");
  });

  it("keeps disabled route selectors closed",()=>{
    render(<RouteSelect label="Network" value="" options={[]} onChange={vi.fn()} placeholder="Choose a network" disabled/>);
    const trigger=screen.getByRole("button",{name:"Network Choose a network"});
    fireEvent.click(trigger);
    expect(trigger).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names bank search and distinguishes an unavailable bank list",()=>{
    render(<BankSelect value="" banks={[]} onChange={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Bank: Choose a supported bank"}));
    const dialog=screen.getByRole("dialog",{name:"Choose your bank"});
    expect(within(dialog).getByRole("textbox",{name:"Search bank name or code"})).toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent("No banks are available for this payout currency.");
  });

  it("shows country no-results, clears it on dismiss, and preserves the Italian phone region",()=>{
    const onCountryChange=vi.fn(),onChange=vi.fn();
    render(<InternationalPhoneField country="IT" value="+393518476295" onCountryChange={onCountryChange} onChange={onChange} allowedCountries={["IT","GB"]} className="compliance"/>);
    const residence=screen.getByRole("button",{name:"Country of residence"});
    fireEvent.click(residence);
    let dialog=screen.getByRole("dialog",{name:"Country of residence"});
    const search=within(dialog).getByRole("textbox",{name:"Search country, code or dial prefix"});
    fireEvent.change(search,{target:{value:"no-such-country"}});
    expect(within(dialog).getByRole("status")).toHaveTextContent("No countries match your search.");
    fireEvent.click(within(dialog).getByRole("button",{name:"Close dialog"}));
    fireEvent.click(residence);
    dialog=screen.getByRole("dialog",{name:"Country of residence"});
    expect(within(dialog).getByRole("textbox",{name:"Search country, code or dial prefix"})).toHaveValue("");
    expect(within(dialog).getByRole("button",{name:/Italy IT · \+39/})).toHaveAttribute("aria-pressed","true");
    fireEvent.click(within(dialog).getByRole("button",{name:"Close dialog"}));
    fireEvent.click(screen.getByRole("button",{name:"Change phone country"}));
    const phoneDialog=screen.getByRole("dialog",{name:"Phone country code"});
    fireEvent.change(within(phoneDialog).getByRole("textbox",{name:"Search country, code or dial prefix"}),{target:{value:"Italy"}});
    expect(within(phoneDialog).getByRole("button",{name:/Italy IT · \+39/})).toHaveAttribute("aria-pressed","true");
    expect(onCountryChange).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  },10000);
});
