// @vitest-environment jsdom
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {CoverageExplorer} from "./coverage-explorer";

const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeAll(() => Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {configurable: true, value: vi.fn()}));
afterAll(() => {
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});
beforeEach(() => {
  // The selector must remain usable when canvas or its map cannot load.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Map unavailable")));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function search() { return screen.getByRole("combobox", {name: "Search country of residence"}); }
function selectItaly() {
  fireEvent.focus(search());
  fireEvent.change(search(), {target: {value: "  ita  "}});
  fireEvent.keyDown(search(), {key: "Enter"});
}

describe("landing coverage selector", () => {
  it("filters case-insensitively and selects a residence with the keyboard", () => {
    render(<CoverageExplorer />);
    fireEvent.focus(search());
    fireEvent.change(search(), {target: {value: "  ITa  "}});
    expect(screen.getAllByRole("option")).toHaveLength(1);
    const italy = screen.getByRole("option", {name: "Italy"});
    expect(search()).toHaveAttribute("aria-activedescendant", italy.id);
    fireEvent.keyDown(search(), {key: "ArrowDown"});
    fireEvent.keyDown(search(), {key: "Enter"});

    expect(screen.getByRole("heading", {level: 3, name: "Italy"})).toBeInTheDocument();
    expect(screen.getByText("Bank pay-in").nextElementSibling).toHaveTextContent("EUR · GBP");
    expect(screen.getByText("Bank payout").nextElementSibling).toHaveTextContent("By destination");
    expect(search()).toHaveValue("");
    expect(search()).toHaveAttribute("aria-expanded", "false");
    expect(search()).not.toHaveAttribute("aria-controls");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports selecting by country code and updates funding without inferring payout currencies", () => {
    render(<CoverageExplorer />);
    fireEvent.focus(search());
    fireEvent.change(search(), {target: {value: "ng"}});
    fireEvent.click(screen.getByRole("option", {name: "Nigeria"}));
    expect(screen.getByRole("heading", {level: 3, name: "Nigeria"})).toBeInTheDocument();
    expect(screen.getByText("Bank pay-in").nextElementSibling).toHaveTextContent("NGN");
    expect(screen.getByText("Bank payout").nextElementSibling).toHaveTextContent("By destination");
    expect(screen.getByText(/Availability depends on your residence/)).toBeInTheDocument();
  });

  it("keeps the selected residence on no match and clears the dismissed query on Escape", () => {
    render(<CoverageExplorer />);
    selectItaly();
    fireEvent.focus(search());
    fireEvent.change(search(), {target: {value: "Brazil"}});
    expect(screen.getByText("No matching residence is listed. Try another name.")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    fireEvent.keyDown(search(), {key: "Enter"});
    expect(screen.getByRole("heading", {level: 3, name: "Italy"})).toBeInTheDocument();
    fireEvent.keyDown(search(), {key: "Escape"});
    expect(search()).toHaveValue("");
    expect(search()).toHaveAttribute("aria-expanded", "false");
    expect(search()).not.toHaveAttribute("aria-controls");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clears an unselected query on outside blur while preserving the selected residence", () => {
    render(<CoverageExplorer />);
    selectItaly();
    fireEvent.focus(search());
    fireEvent.change(search(), {target: {value: "Brazil"}});
    fireEvent.blur(search(), {relatedTarget: screen.getByRole("button", {name: "Rotate globe"})});
    expect(search()).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", {level: 3, name: "Italy"})).toBeInTheDocument();
  });
});
