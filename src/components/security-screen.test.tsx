// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {SecurityAuthenticatorScreen,SecurityPasswordScreen,SecurityScreen,SecuritySessionsScreen} from "./security-screen";

const {authApi,show,signOut}=vi.hoisted(()=>({authApi:vi.fn(),show:vi.fn(),signOut:vi.fn()}));
vi.mock("@/components/ui/toast",()=>({useToast:()=>({show})}));
vi.mock("@/lib/customer-auth",async()=>({...await import("@/lib/customer-auth-format"),authApi,signOut}));
vi.mock("qrcode",()=>({default:{toDataURL:vi.fn().mockResolvedValue("data:image/png;base64,test")}}));

const session={id:"mock-session",createdAt:"2026-01-01T10:00:00Z",lastSeenAt:"2026-01-01T10:00:00Z",expiresAt:"2099-01-01T10:00:00Z",userAgent:"Chrome/140",current:true};
beforeEach(()=>{vi.clearAllMocks();});
afterEach(()=>{cleanup();});

describe("security data states",()=>{
  it("does not label loading or unavailable settings as Off or zero sessions, and retries",async()=>{
    authApi.mockRejectedValue(new Error("Unavailable"));
    render(<SecurityScreen/>);
    expect(screen.getByText("Checking authenticator…")).toBeInTheDocument();
    expect(screen.getByText("Loading sessions…")).toBeInTheDocument();
    expect(screen.queryByText(/Off ·/)).not.toBeInTheDocument();
    await screen.findByText("Some security details could not be loaded.");
    expect(screen.getByText("Status unavailable")).toBeInTheDocument();
    expect(screen.getByText("Sessions unavailable")).toBeInTheDocument();
    expect(screen.queryByText("0 active sessions")).not.toBeInTheDocument();

    authApi.mockImplementation((path:string)=>Promise.resolve(path==="/2fa"?{enabled:true}:[session]));
    fireEvent.click(screen.getByRole("button",{name:"Retry"}));
    await screen.findByText("Enabled · 6-digit code at login");
    expect(screen.getByText("1 active session")).toBeInTheDocument();
    expect(authApi.mock.calls.every(([,init])=>!init)).toBe(true);
  });

  it("keeps authenticator actions hidden until status is known, including malformed responses",async()=>{
    authApi.mockResolvedValue(null);
    render(<SecurityAuthenticatorScreen/>);
    expect(screen.getByText("Checking authenticator status…")).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Enable authenticator"})).not.toBeInTheDocument();
    await screen.findByText("Authenticator status could not be loaded.");
    expect(screen.queryByText("Off")).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Enable authenticator"})).not.toBeInTheDocument();
    authApi.mockResolvedValue({enabled:false});
    fireEvent.click(screen.getByRole("button",{name:"Retry"}));
    await screen.findByRole("button",{name:"Enable authenticator"});
    expect(screen.getByText("Off")).toBeInTheDocument();
    expect(authApi.mock.calls.every(([path])=>path==="/2fa")).toBe(true);
  });

  it("distinguishes failed session loading from a successful empty result",async()=>{
    authApi.mockRejectedValue(new Error("Unavailable"));
    render(<SecuritySessionsScreen/>);
    expect(screen.getByRole("combobox",{name:"Filter by status"})).toBeDisabled();
    await screen.findByText("Your signed-in devices could not be loaded.");
    expect(screen.queryByText("No sessions found.")).not.toBeInTheDocument();
    authApi.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button",{name:"Retry"}));
    await screen.findByText("No sessions found.");
    expect(screen.getByRole("combobox",{name:"Filter by status"})).toBeEnabled();
  });

  it("shows loaded devices and a distinct filtered empty state",async()=>{
    authApi.mockResolvedValue([session]);
    render(<SecuritySessionsScreen/>);
    await screen.findByText("Chrome · This device");
    fireEvent.change(screen.getByRole("combobox",{name:"Filter by status"}),{target:{value:"ENDED"}});
    expect(screen.getByText("No sessions match this filter.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Show active"}));
    expect(screen.getByText("Chrome · This device")).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Revoke"})).not.toBeInTheDocument();
  });
});

describe("security form validation",()=>{
  it("shows the password requirement upfront and focuses the first missing field without sending a request",()=>{
    render(<SecurityPasswordScreen/>);
    const current=screen.getByLabelText("Current password");
    const next=screen.getByLabelText("New password");
    expect(next).toHaveAccessibleDescription("At least 12 characters, including uppercase, lowercase and a number.");
    fireEvent.click(screen.getByRole("button",{name:"Update password"}));
    expect(current).toHaveFocus();
    expect(current).toHaveAttribute("aria-invalid","true");
    expect(current).toHaveAccessibleDescription("Enter your current password.");
    expect(authApi).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("marks a short password and then a mismatched confirmation without submitting",()=>{
    render(<SecurityPasswordScreen/>);
    const current=screen.getByLabelText("Current password");
    const next=screen.getByLabelText("New password");
    const confirmation=screen.getByLabelText("Confirm new password");
    fireEvent.change(current,{target:{value:"mock-current-password"}});
    fireEvent.change(next,{target:{value:"short"}});
    fireEvent.change(confirmation,{target:{value:"short"}});
    fireEvent.click(screen.getByRole("button",{name:"Update password"}));
    expect(next).toHaveFocus();
    expect(next).toHaveAttribute("aria-invalid","true");
    fireEvent.change(next,{target:{value:"MockNewPassword2026"}});
    fireEvent.click(screen.getByRole("button",{name:"Update password"}));
    expect(confirmation).toHaveFocus();
    expect(confirmation).toHaveAccessibleDescription("The passwords do not match.");
    expect(authApi).not.toHaveBeenCalled();
  });

  it("validates the same password policy as registration and the backend",()=>{
    render(<SecurityPasswordScreen/>);
    fireEvent.change(screen.getByLabelText("Current password"),{target:{value:"mock-current-password"}});
    const next=screen.getByLabelText("New password");
    const confirmation=screen.getByLabelText("Confirm new password");
    for(const [value,message] of [["missinguppercase2026","Add an uppercase letter"],["MISSINGLOWERCASE2026","Add a lowercase letter"],["MissingNumbersHere","Add a number"]]){
      fireEvent.change(next,{target:{value}});
      fireEvent.change(confirmation,{target:{value}});
      fireEvent.click(screen.getByRole("button",{name:"Update password"}));
      expect(next).toHaveFocus();
      expect(next).toHaveAccessibleDescription(expect.stringContaining(message));
    }
    expect(authApi).not.toHaveBeenCalled();
  });

  it("requires a current password before disabling an authenticator",async()=>{
    authApi.mockResolvedValue({enabled:true});
    render(<SecurityAuthenticatorScreen/>);
    await screen.findByRole("button",{name:"Disable authenticator"});
    fireEvent.change(screen.getByLabelText("Authenticator code"),{target:{value:"123456"}});
    fireEvent.click(screen.getByRole("button",{name:"Disable authenticator"}));
    await waitFor(()=>expect(screen.getByLabelText("Current password")).toHaveFocus());
    expect(screen.getByLabelText("Current password")).toHaveAccessibleDescription("Enter your current password.");
    expect(authApi).toHaveBeenCalledTimes(1);
    expect(authApi).toHaveBeenCalledWith("/2fa");
  });
});
