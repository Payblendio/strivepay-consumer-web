import {describe,expect,it} from "vitest";
import {buyLane,networkLabel,sellLane,shortenAddress} from "./ready-route-copy";

describe("ready route copy",()=>{
  it("shortens wallet addresses and titles networks",()=>{
    expect(shortenAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
    expect(networkLabel("POLYGON")).toBe("Polygon");
  });

  it("describes buy as fiat in and crypto out to the target wallet",()=>{
    const lane=buyLane({fiatCurrency:"EUR",token:"USDC",network:"POLYGON",address:"0x1234567890abcdef1234567890abcdef12345678"},{currency:"EUR",accountMask:"PT50 **** 7833"});
    expect(lane.kicker).toBe("Buy");
    expect(lane.title).toBe("EUR → USDC");
    expect(lane.line).toBe("Send EUR to your pay-in account. USDC arrives on Polygon.");
    expect(lane.from).toBe("Pay-in · PT50 **** 7833");
    expect(lane.to).toBe("Wallet · 0x1234…5678");
  });

  it("describes sell as crypto in and local fiat to the payout account",()=>{
    const lane=sellLane({fiatCurrency:"EUR",token:"USDC",network:"POLYGON",address:"0x1234567890abcdef1234567890abcdef12345678"},{currency:"MXN",accountName:"Primary MXN account",accountMask:"****7771"});
    expect(lane.kicker).toBe("Sell");
    expect(lane.title).toBe("USDC → MXN");
    expect(lane.line).toBe("Send USDC. MXN settles to your payout account.");
    expect(lane.to).toBe("Primary MXN account · ****7771");
  });
});
