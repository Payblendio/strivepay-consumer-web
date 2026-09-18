// @vitest-environment jsdom
import {createElement} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {RoutePreview} from "./route-preview";

vi.mock("next/image", () => ({
  default: (props: {src: string; alt: string; width: number; height: number}) => createElement("img", props),
}));

afterEach(cleanup);

describe("landing route preview", () => {
  it("switches both the explanation and route endpoints between buying and selling", () => {
    render(<RoutePreview />);
    const buy = screen.getByRole("button", {name: "Buy crypto"});
    const sell = screen.getByRole("button", {name: "Sell crypto"});

    expect(buy).toHaveAttribute("aria-pressed", "true");
    expect(sell).toHaveAttribute("aria-pressed", "false");
    const buyRoute = within(screen.getByLabelText("Buy route illustration"));
    expect(buyRoute.getByText("Your EUR bank account")).toBeInTheDocument();
    expect(buyRoute.getByText("USDC on Ethereum")).toBeInTheDocument();
    expect(screen.getByText("Reusable pay-in account details")).toBeInTheDocument();

    fireEvent.click(sell);
    expect(sell).toHaveAttribute("aria-pressed", "true");
    expect(buy).toHaveAttribute("aria-pressed", "false");
    const sellRoute = within(screen.getByLabelText("Sell route illustration"));
    expect(sellRoute.getByText("USDC")).toBeInTheDocument();
    expect(sellRoute.getByText("Your EUR payout account")).toBeInTheDocument();
    expect(screen.getByText("Saved payout destinations")).toBeInTheDocument();
    expect(screen.queryByText("Reusable pay-in account details")).not.toBeInTheDocument();
    expect(sellRoute.getByText("Illustrative route · availability varies")).toBeInTheDocument();

    fireEvent.click(buy);
    expect(screen.getByLabelText("Buy route illustration")).toBeInTheDocument();
    expect(screen.queryByLabelText("Sell route illustration")).not.toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Find your route"})).toHaveAttribute("href", "/register");
  });
});
