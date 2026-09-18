import {describe,expect,it} from "vitest";
import {apiErrorMessage} from "./api-error";

describe("apiErrorMessage",()=>{
  it("prefers RFC7807 detail over a generic title",()=>{
    expect(apiErrorMessage({title:"Bad Request",detail:"iban has an invalid format"},"fallback")).toBe("iban has an invalid format");
  });

  it("reads nested provider error arrays",()=>{
    expect(apiErrorMessage({errors:[{message:"Account number must be 18 digits"}]},"fallback")).toBe("Account number must be 18 digits");
  });

  it("reads Spring Boot error when title and detail are missing",()=>{
    expect(apiErrorMessage({status:500,error:"Internal Server Error"},"fallback")).toBe("Internal Server Error");
  });
});
