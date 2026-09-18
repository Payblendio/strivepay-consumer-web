// @vitest-environment jsdom
import {cleanup,render,screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,expect,it} from "vitest";
import {SupportHelp} from "./support-help";
afterEach(cleanup);
it("offers topic-specific guidance without navigating away from the draft",()=>{
  const {rerender}=render(<SupportHelp category="BUY"/>);
  expect(screen.getByText(/Never send again/)).toBeInTheDocument();
  const link=screen.getByText(/Review buy instructions/).closest("a");
  expect(link).toHaveAttribute("href","/dashboard/buy");
  expect(link).toHaveAttribute("target","_blank");
  rerender(<SupportHelp category="SELL"/>);
  expect(screen.getByText(/private keys/)).toBeInTheDocument();
  expect(screen.queryByText(/Never send again/)).not.toBeInTheDocument();
});
it("does not solicit sensitive verification documents",()=>{
  render(<SupportHelp category="VERIFICATION"/>);
  expect(screen.getByText(/Do not attach identity documents/)).toBeInTheDocument();
});
it("falls back to general help for an unknown topic",()=>{
  render(<SupportHelp category="UNKNOWN"/>);
  expect(screen.getByText(/Hide unrelated personal/)).toBeInTheDocument();
});
