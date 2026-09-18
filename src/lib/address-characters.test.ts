import {describe,expect,it} from "vitest";
import {addressCharacterError} from "./address-characters";

describe("provider address characters",()=>{
  it.each(["Lindenstraße 38","Müllerstrasse 8","Café 17","Suite\n4","住所 8","Road 😀"])("rejects unsupported characters in %s",value=>{
    expect(addressCharacterError({addressLine1:value})).toContain("use A–Z");
  });
  it("checks optional line 2 and identifies the address",()=>{
    expect(addressCharacterError({addressLine1:"Lindenstrasse 38",addressLine2:"Büro 4"},"Mailing address")).toContain("Mailing address line 2");
  });
  it.each(["Lindenstrasse 38","Muellerstrasse 8","12-14 O'Connell St. / #4 (Rear), A"])("accepts %s",value=>{
    expect(addressCharacterError({addressLine1:value,addressLine2:""})).toBeNull();
  });
});
