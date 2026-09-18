import {afterEach,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
import {POST} from "./route";
const mocks=vi.hoisted(()=>({backend:vi.fn()}));
vi.mock("@/lib/backend",()=>({backend:mocks.backend,responseBody:(response:Response)=>response.json()}));
vi.mock("@/app/api/money/scope",()=>({moneyAuthHeaders:async()=>({Authorization:"Bearer test-only"})}));
afterEach(()=>{vi.unstubAllEnvs();mocks.backend.mockReset();});
it("uses the validated browser origin instead of the server bind address for sockets",async()=>{
 vi.stubEnv("SUPPORT_WEBSOCKET_URL","");
 mocks.backend.mockResolvedValue(Response.json({connectionToken:"test-ticket"}));
 const request=new NextRequest("http://0.0.0.0:18081/api/support/socket-ticket",{method:"POST",headers:{origin:"http://localhost:18081",host:"localhost:18081"}});
 const response=await POST(request,{params:Promise.resolve({path:["socket-ticket"]})});
 expect(response.status).toBe(200);
 expect((await response.json()).websocketUrl).toBe("ws://localhost:18080/v1/support/socket");
});
it("rejects a foreign origin before issuing a ticket",async()=>{
 const request=new NextRequest("http://0.0.0.0:18081/api/support/socket-ticket",{method:"POST",headers:{origin:"https://foreign.invalid",host:"localhost:18081"}});
 expect((await POST(request,{params:Promise.resolve({path:["socket-ticket"]})})).status).toBe(403);
 expect(mocks.backend).not.toHaveBeenCalled();
});
