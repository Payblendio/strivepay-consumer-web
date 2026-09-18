import {describe,expect,it} from "vitest";
import {maskBankIdentifier} from "./masked-identifier";

describe("maskBankIdentifier",()=>{
  it("preserves a recognizable country prefix and last four digits",()=>{
    expect(maskBankIdentifier("ES9121000418450200051332")).toBe("ES •••• 1332");
    expect(maskBankIdentifier("•••• 1234")).toBe("•••• 1234");
  });

  it("does not expose short or missing identifiers",()=>{
    expect(maskBankIdentifier("1234")).toBe("••••");
    expect(maskBankIdentifier(null)).toBe("Verified account");
  });
});
