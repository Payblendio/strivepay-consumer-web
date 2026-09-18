// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {afterEach,expect,it} from "vitest";
import {MoneyRouteMap} from "./money-route-map";
afterEach(cleanup);
it("shows a useful route without IntersectionObserver and switches directions",()=>{
 render(<MoneyRouteMap/>);
 expect(screen.getByRole("button",{name:"Buy crypto"})).toHaveAttribute("aria-pressed","true");
 expect(screen.getByRole("heading",{name:"Bank transfer"})).toBeInTheDocument();
 expect(screen.getByRole("heading",{name:"Your receiving wallet"})).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Sell crypto"}));
 expect(screen.getByRole("button",{name:"Sell crypto"})).toHaveAttribute("aria-pressed","true");
 expect(screen.getByRole("heading",{name:"Crypto deposit"})).toBeInTheDocument();
 expect(screen.getByRole("heading",{name:"Your payout account"})).toBeInTheDocument();
 expect(screen.getByText(/not a live transfer/)).toBeInTheDocument();
 expect(screen.getAllByRole("listitem")).toHaveLength(3);
});
