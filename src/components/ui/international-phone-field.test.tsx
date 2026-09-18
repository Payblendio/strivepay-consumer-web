// @vitest-environment jsdom
import {useState} from "react";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import "@testing-library/jest-dom/vitest";
import type {Value} from "react-phone-number-input";
import {InternationalPhoneField} from "./international-phone-field";

vi.mock("./modal",()=>({Modal:()=>null}));
afterEach(cleanup);
function Form(){
  const[value,setValue]=useState<Value>();
  return <><InternationalPhoneField country="DE" value={value} onChange={setValue} onCountryChange={()=>{}}/><output aria-label="Stored phone">{value}</output></>;
}
it.each([
  ["+49 1522 9481736","+4915229481736","+49"],
  ["+44 7700 900123","+447700900123","+44"],
])("normalizes an international paste without duplicating its prefix: %s",(input,expected,prefix)=>{
  render(<Form/>);
  fireEvent.paste(screen.getByLabelText("Phone number"),{clipboardData:{getData:()=>input}});
  expect(screen.getByLabelText("Stored phone")).toHaveTextContent(expected);
  expect(screen.getByRole("button",{name:"Change phone country"})).toHaveTextContent(prefix);
  expect(screen.getByRole("button",{name:"Country of residence"})).toHaveTextContent("Germany");
});
it("still accepts a German national number",()=>{
  render(<Form/>);
  fireEvent.change(screen.getByLabelText("Phone number"),{target:{value:"015229481736"}});
  expect(screen.getByLabelText("Stored phone")).toHaveTextContent("+4915229481736");
});
it("accepts an international number entered by autofill or typing",()=>{
  render(<Form/>);
  fireEvent.change(screen.getByLabelText("Phone number"),{target:{value:"+49 1522 9481736"}});
  expect(screen.getByLabelText("Stored phone")).toHaveTextContent(/^\+4915229481736$/);
});
