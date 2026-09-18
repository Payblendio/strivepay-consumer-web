import {afterEach,describe,expect,it,vi} from "vitest";
import {createClientId,ensureClientRandomUUID} from "./client-id";
afterEach(()=>vi.unstubAllGlobals());
describe("client UUID",()=>{
 it("supports LAN HTTP without randomUUID",()=>{
   vi.stubGlobal("crypto",{getRandomValues:(bytes:Uint8Array)=>{bytes.fill(165);return bytes;}});
   expect(createClientId()).toBe("a5a5a5a5-a5a5-45a5-a5a5-a5a5a5a5a5a5");
 });
 it("uses native randomUUID when supported",()=>{
   const native=vi.fn(()=>"native-id");vi.stubGlobal("crypto",{randomUUID:native});
   expect(createClientId()).toBe("native-id");expect(native).toHaveBeenCalledOnce();
 });
 it("falls back when randomUUID exists but throws",()=>{
   vi.stubGlobal("crypto",{
     randomUUID:()=>{throw new TypeError("crypto.randomUUID is not a function");},
     getRandomValues:(bytes:Uint8Array)=>{bytes.fill(17);return bytes;},
   });
   expect(createClientId()).toBe("11111111-1111-4111-9111-111111111111");
 });
 it("patches missing randomUUID for other callers",()=>{
   const crypto={getRandomValues:(bytes:Uint8Array)=>{bytes.fill(165);return bytes;}} as Crypto;
   vi.stubGlobal("crypto",crypto);
   ensureClientRandomUUID();
   expect(typeof globalThis.crypto.randomUUID).toBe("function");
   expect(globalThis.crypto.randomUUID()).toBe("a5a5a5a5-a5a5-45a5-a5a5-a5a5a5a5a5a5");
 });
 it("fails closed without secure randomness",()=>{
   vi.stubGlobal("crypto",undefined);expect(()=>createClientId()).toThrow("Secure randomness");
 });
});
