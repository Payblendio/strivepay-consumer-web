import {expect,it} from "vitest";
import {parseSupportActivity} from "./support-activity";
it("accepts the three supported activity types and rejects malformed links",()=>{
 const id="00000000-0000-0000-0000-000000000001";
 for(const kind of ["RAMP","CONVERSION","ORDER"])expect(parseSupportActivity(kind,id)).toEqual({kind,id});
 expect(parseSupportActivity("UNKNOWN",id)).toBeNull();
 expect(parseSupportActivity("ORDER","https://foreign.invalid")).toBeNull();
 expect(parseSupportActivity(null,null)).toBeNull();
});
