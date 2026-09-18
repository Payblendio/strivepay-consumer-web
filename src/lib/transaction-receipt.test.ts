// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {jsPDF, jsPDFOptions} from "jspdf";
import type {UserOptions} from "jspdf-autotable";
import type {TradeItem} from "@/components/dashboard-route-copy";
import {downloadTransactionReceipt} from "./transaction-receipt";

const exported = vi.hoisted(() => ({documents: [] as jsPDF[], names: [] as string[], tables: [] as UserOptions[]}));
vi.mock("jspdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jspdf")>();
  return {...actual, jsPDF: vi.fn(function(options?: jsPDFOptions) {
    const doc = new actual.jsPDF(options);
    doc.save = new Proxy(doc.save, {apply(_target, _receiver, args: [string?, {returnPromise?: boolean}?]) {
      exported.names.push(args[0] ?? "");
      return args[1]?.returnPromise ? Promise.resolve() : doc;
    }});
    exported.documents.push(doc);
    return doc;
  })};
});
vi.mock("jspdf-autotable", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jspdf-autotable")>();
  return {...actual, default: (doc: jsPDF, options: UserOptions) => {
    exported.tables.push(options);
    return actual.default(doc, options);
  }};
});

const PIXEL_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
const completed: TradeItem = {
  id: "11111111-2222-3333-4444-555555555555",
  direction: "FIAT_TO_CRYPTO",
  status: "COMPLETED",
  createdAt: "2026-09-01T10:00:00Z",
  sourceAsset: "EUR",
  sourceAmount: "100",
  destinationAsset: "USDC",
  destinationNetwork: "ETHEREUM",
  quotedDestinationAmount: "99",
  deliveredAmount: "98",
};

beforeEach(() => {
  exported.documents.length = 0;
  exported.names.length = 0;
  exported.tables.length = 0;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}));
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL() { return "blob:receipt-logo"; }
    static revokeObjectURL() {}
  });
  vi.stubGlobal("Image", class {
    naturalWidth = 1;
    naturalHeight = 1;
    onload: (() => void) | null = null;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({drawImage: vi.fn(), fillRect: vi.fn()} as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(PIXEL_PNG);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function rows() { return exported.tables[0].body as string[][]; }

describe("transaction receipt export", () => {
  it("generates an actual PDF with a watermark and separate quoted and received amounts", async () => {
    await downloadTransactionReceipt(completed);
    const doc = exported.documents[0];
    expect(doc.output()).toMatch(/^%PDF-/);
    expect(doc.output()).toContain("/ca 0.05");
    expect(exported.names).toEqual(["strivepay-receipt-2026-09-01-11111111.pdf"]);
    expect(rows()).toContainEqual(["Received", "98 USDC"]);
    expect(rows()).toContainEqual(["Quoted", "99 USDC"]);
    expect(rows()).toContainEqual(["Exchange rate", "1 EUR = 0.98 USDC"]);
  });

  it("does not present an undelivered quote or a pending event as settled money", async () => {
    await downloadTransactionReceipt({...completed, status: "AWAITING_FUNDS", deliveredAmount: null, occurredAt: "2026-09-01T10:05:00Z"});
    expect(rows()).toContainEqual(["Quoted", "99 USDC"]);
    expect(rows().some(([label]) => label === "Received")).toBe(false);
    expect(rows().some(([label]) => label === "Exchange rate")).toBe(false);
    expect(rows().some(([label]) => label === "Settled")).toBe(false);
    expect(rows().some(([label]) => label === "Recorded")).toBe(true);
  });

  it("keeps zero delivered amounts explicit and does not derive rates from a zero source", async () => {
    await downloadTransactionReceipt({...completed, sourceAmount: "0", deliveredAmount: "0", quotedDestinationAmount: undefined});
    expect(rows()).toContainEqual(["Received", "0 USDC"]);
    expect(rows().some(([label]) => label === "Exchange rate")).toBe(false);
  });

  it.each([0,"0"])("does not label a pending zero placeholder as received: %s",async deliveredAmount=>{
    await downloadTransactionReceipt({...completed,status:"PAYOUT_PENDING",deliveredAmount});
    expect(rows()).toContainEqual(["Quoted","99 USDC"]);
    expect(rows().some(([label])=>label==="Received")).toBe(false);
    expect(rows().some(([label])=>label==="Exchange rate")).toBe(false);
  });

  it("still exports the transaction when optional branding cannot load", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Brand asset unavailable"));
    await downloadTransactionReceipt(completed);
    expect(exported.documents[0].output()).toMatch(/^%PDF-/);
    expect(exported.names).toHaveLength(1);
    expect(rows()).toContainEqual(["Status", "Completed"]);
    expect(rows()).toContainEqual(["Transaction ID", completed.id]);
  });

  it("preserves sell destination details and paginates a long status history", async () => {
    await downloadTransactionReceipt({
      ...completed,
      direction: "CRYPTO_TO_FIAT",
      sourceAsset: "BTC",
      sourceAmount: "0.002",
      sourceNetwork: "BITCOIN",
      destinationAsset: "EUR",
      destinationNetwork: null,
      deliveredAmount: "100",
      quotedDestinationAmount: "100",
      merchantFeeAmount: "1",
      feeCurrency: "EUR",
      payoutAccountName: "Primary EUR account",
      payoutAccountMask: "****1332",
    }, Array.from({length: 60}, (_, index) => ({
      id: `event-${index}`,
      toStatus: index === 59 ? "COMPLETED" : "PROCESSING",
      occurredAt: new Date(Date.UTC(2026, 8, 1, 10, index)).toISOString(),
    })));
    expect(rows()).toContainEqual(["Type", "Sell"]);
    expect(rows()).toContainEqual(["Network", "BITCOIN"]);
    expect(rows()).toContainEqual(["Beneficiary", "Primary EUR account"]);
    expect(rows()).toContainEqual(["Account details", "****1332"]);
    expect(rows()).toContainEqual(["Total fees", "1 EUR"]);
    expect(rows().some(([label]) => label === "Quoted")).toBe(false);
    expect(exported.documents[0].getNumberOfPages()).toBeGreaterThan(1);
    expect(exported.documents[0].output()).toMatch(/^%PDF-/);
  });
});
