// @vitest-environment jsdom
import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {DateOfBirthPicker} from "./date-of-birth-picker";

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

describe("date of birth picker",()=>{
  it("rejects impossible dates and exposes one roving calendar tab stop",()=>{
    render(<DateOfBirthPicker value="2020-02-30" onChange={vi.fn()}/>);
    const trigger=screen.getByRole("button",{name:/Date of birth:/});
    expect(trigger).toHaveTextContent("Choose your date of birth");
    fireEvent.click(trigger);
    const dialog=screen.getByRole("dialog",{name:"Date of birth"});
    const cells=within(dialog).getAllByRole("gridcell") as HTMLButtonElement[];
    expect(cells.filter(cell=>!cell.disabled).length).toBeGreaterThan(0);
    expect(cells.filter(cell=>cell.getAttribute("tabindex")==="0")).toHaveLength(1);
  });

  it("moves by keyboard across the calendar and restores focus after close",async()=>{
    const onChange=vi.fn();
    render(<DateOfBirthPicker value="1990-01-15" onChange={onChange}/>);
    const trigger=screen.getByRole("button",{name:/Date of birth:/});
    fireEvent.click(trigger);
    const dialog=screen.getByRole("dialog",{name:"Date of birth"});
    const grid=within(dialog).getByRole("grid");
    const selected=within(grid).getByRole("gridcell",{name:/Monday, January 15, 1990/});
    expect(selected).toHaveAttribute("tabindex","0");
    fireEvent.keyDown(selected,{key:"ArrowRight"});
    expect(within(grid).getByRole("gridcell",{name:/Tuesday, January 16, 1990/})).toHaveAttribute("tabindex","0");
    fireEvent.click(within(dialog).getByRole("button",{name:"Close dialog"}));
    await waitFor(()=>expect(trigger).toHaveFocus());
    expect(onChange).not.toHaveBeenCalled();
  });
});
