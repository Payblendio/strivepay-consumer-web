// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({api:vi.fn(),path:"/dashboard"}));
vi.mock("@/lib/customer-auth",()=>({authApi:mock.api}));
vi.mock("next/navigation",()=>({usePathname:()=>mock.path}));
vi.mock("./ui/modal",()=>({Modal:({open,children,title}:any)=>open?<div role="dialog" aria-label={title}>{children}</div>:null}));
import {TwoFactorReminder} from "./two-factor-reminder";
beforeEach(()=>{vi.useFakeTimers();mock.api.mockReset();mock.path="/dashboard";Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"});});
afterEach(()=>{cleanup();vi.useRealTimers();});
async function tick(){await act(async()=>{await vi.advanceTimersByTimeAsync(1200);});}
it("shows the claimed reminder and links to authenticator setup",async()=>{mock.api.mockResolvedValue({show:true});render(<TwoFactorReminder/>);await tick();expect(screen.getByRole("link",{name:/Set up 2FA/})).toHaveAttribute("href","/dashboard/settings/security/authenticator");fireEvent.click(screen.getByRole("button",{name:"Remind me next week"}));expect(screen.queryByRole("dialog")).toBeNull();});
it.each([{show:false},null])("does not show when not eligible or unknown: %s",async result=>{mock.api.mockResolvedValue(result);render(<TwoFactorReminder/>);await tick();expect(screen.queryByRole("dialog")).toBeNull();});
it("does not interrupt security setup",async()=>{mock.path="/dashboard/settings/security/authenticator";render(<TwoFactorReminder/>);await tick();expect(mock.api).not.toHaveBeenCalled();});
it("fails quietly when offline",async()=>{mock.api.mockRejectedValue(new Error("Offline"));render(<TwoFactorReminder/>);await tick();expect(screen.queryByRole("dialog")).toBeNull();});
