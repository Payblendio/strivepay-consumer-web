// @vitest-environment jsdom
import {createElement} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen, within} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Home from "./page";

vi.mock("next/image", () => ({
  default: ({src, alt, width, height, title, sizes}: {
    src: string; alt: string; width: number; height: number; title?: string; sizes?: string;
  }) => createElement("img", {src, alt, width, height, title, sizes}),
}));
vi.mock("@/components/marketing/coverage-explorer", () => ({CoverageExplorer: () => null}));
vi.mock("@/components/marketing/route-preview", () => ({RoutePreview: () => null}));

afterEach(cleanup);

describe("landing hero", () => {
  it("connects illustrated setup to sanitized buy and sell walkthroughs and account help", () => {
    render(<Home />);
    expect(screen.getByRole("link", {name: "See the buy flow ↗"})).toHaveAttribute("href", "#buy-walkthrough");
    expect(screen.getByRole("link", {name: "See the sell flow ↗"})).toHaveAttribute("href", "#sell-walkthrough");
    expect(screen.getAllByText("Illustrative mockup based on the product. Account details removed.")).toHaveLength(2);
    expect(screen.getByRole("img", {name: "A teal and platinum bank beside a matching crypto wallet."})).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Get help"})).toHaveAttribute("href", "/dashboard/support");
    expect(screen.getByRole("link", {name: "Start with a personal account"})).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", {name: "Set up your business"})).toHaveAttribute("href", "/register");
  });
  it("presents open two-way movement with one bank and crypto legend instead of repeated badges", () => {
    const {container} = render(<Home />);
    const hero = within(screen.getByRole("region", {name: /Your money\.\s*More ways\s*to move\./}));

    expect(hero.getByRole("heading", {level: 1, name: /Your money\.\s*More ways\s*to move\./})).toBeInTheDocument();
    expect(hero.getByRole("link", {name: "Get started"})).toHaveAttribute("href", "/register");
    expect(hero.getByText("Buy crypto with a bank transfer. Sell into your chosen bank account.")).toBeInTheDocument();

    const artwork = within(hero.getByRole("figure", {name: "Move between bank money and crypto"}));
    expect(artwork.getByRole("img", {name: "Open teal and silver ribbon arrows flowing in opposite directions."}))
      .toHaveAttribute("src", "/images/landing/open-routes.webp");
    expect(artwork.getByText("Bank money")).toBeInTheDocument();
    expect(artwork.getByText("Crypto", {exact: true})).toBeInTheDocument();

    for (const code of ["EUR", "GBP", "USD", "NGN", "BTC", "ETH", "USDC", "USDT"]) {
      const marks = screen.getAllByRole("img", {name: code});
      expect(marks).toHaveLength(1);
      expect(artwork.getByRole("img", {name: code})).toBe(marks[0]);
    }
    expect(screen.queryByText("Your bank", {exact: true})).not.toBeInTheDocument();
    expect(screen.queryByText("Your crypto", {exact: true})).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="linked-routes"]')).toBeNull();
    expect(container.querySelector(".landing-currency-line")).toBeNull();
  });
});
