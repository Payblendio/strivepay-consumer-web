// @vitest-environment jsdom
import {createElement} from "react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import DashboardError from "./error";
import DashboardLoading from "./loading";

vi.mock("next/image",()=>({default:({src,alt}:{src:string;alt:string})=>createElement("img",{src,alt})}));
vi.mock("next/link",()=>({default:({children,href,...props}:{children:React.ReactNode;href:string})=>createElement("a",{href,...props},children)}));

afterEach(cleanup);

describe("dashboard recovery states",()=>{
  it("uses Next 16 retry to refetch the failed segment, rather than reset alone",()=>{
    const retry=vi.fn(),reset=vi.fn();
    render(<DashboardError error={new Error("Private upstream details")} retry={retry} reset={reset}/>);
    fireEvent.click(screen.getByRole("button",{name:/Try again/i}));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
  });

  it("does not reveal the error, digest, stack or provider details",()=>{
    const error=Object.assign(new Error("Private provider token xyz"),{digest:"private-digest"});
    error.stack="Private server stack";
    const {container}=render(<DashboardError error={error} retry={vi.fn()} reset={vi.fn()}/>);
    expect(screen.getByText("We couldn’t load this page.")).toBeInTheDocument();
    expect(container.querySelector('img[src="/illustrations/account-error-3d.png"]')).not.toBeNull();
    expect(container).not.toHaveTextContent(/Private|provider|token|digest|stack/);
    expect(screen.getByRole("link",{name:/Back to overview/i})).toHaveAttribute("href","/dashboard");
    expect(screen.queryByRole("link",{name:/login|sign in/i})).not.toBeInTheDocument();
  });

  it("shows a lightweight announced loading state without account data or actions",()=>{
    render(<DashboardLoading/>);
    expect(screen.getByRole("status",{name:"Loading dashboard"})).toHaveTextContent("Loading your dashboard");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
