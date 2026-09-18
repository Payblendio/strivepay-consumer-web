// @vitest-environment jsdom
import {createElement} from "react";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,expect,it,vi} from "vitest";
import {PartnerMarquee} from "./partner-marquee";
vi.mock("next/image",()=>({default:({src,alt,width,height}:{src:string;alt:string;width:number;height:number})=>createElement("img",{src,alt,width,height})}));
afterEach(cleanup);
it("exposes all five partners once while keeping the repeating copy decorative",()=>{
 const {container}=render(<PartnerMarquee/>);
 for(const name of ["Bakkt","Quidax","Stripe","Tatum","Dot MFB"])expect(screen.getAllByRole("img",{name})).toHaveLength(1);
 expect(container.querySelectorAll('.partner-marquee-group[aria-hidden="true"] img')).toHaveLength(5);
 expect(screen.getByText(/availability vary by route/)).toBeInTheDocument();
});
it("pauses and resumes motion explicitly",()=>{
 const {container}=render(<PartnerMarquee/>);
 fireEvent.click(screen.getByRole("button",{name:"Pause motion"}));
 expect(screen.getByRole("button",{name:"Resume motion"})).toHaveAttribute("aria-pressed","true");
 expect(container.querySelector(".partner-marquee-track")).toHaveAttribute("data-paused","true");
 fireEvent.click(screen.getByRole("button",{name:"Resume motion"}));
 expect(container.querySelector(".partner-marquee-track")).toHaveAttribute("data-paused","false");
});
