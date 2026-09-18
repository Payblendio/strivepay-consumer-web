import {describe,expect,it} from "vitest";
import {tradeFeeSummary} from "./trade-fees";

describe("tradeFeeSummary",()=>{
  it("treats Bakkt fees as total with merchantFee inside (no double count)",()=>{
    // Webhook: fees=24, merchantFee=16 on €800 → 3% total, 2% StrivePay, 1% processing
    const summary=tradeFeeSummary({
      providerFeeAmount:"24.00",
      merchantFeeAmount:"16.00",
      feeCurrency:"EUR",
      sourceAsset:"EUR",
      destinationAsset:"USDT",
    },true);
    expect(summary.total).toEqual({key:"total",label:"Total fees",amount:24,asset:"EUR"});
    expect(summary.lines).toEqual([
      {key:"merchant",label:"StrivePay fee",amount:16,asset:"EUR"},
      {key:"provider",label:"Processing fee",amount:8,asset:"EUR"},
    ]);
  });

  it("labels a lone StrivePay fee as Total fees",()=>{
    const summary=tradeFeeSummary({
      merchantFeeAmount:"1.5",
      feeCurrency:"EUR",
      sourceAsset:"EUR",
      destinationAsset:"USDC",
    },true);
    expect(summary.total?.label).toBe("Total fees");
    expect(summary.total?.amount).toBe(1.5);
    expect(summary.lines).toHaveLength(1);
  });

  it("sums additive conversion fees when currencies match",()=>{
    const summary=tradeFeeSummary({
      merchantFeeAmount:2,
      feeCurrency:"NGN",
      sourceAsset:"NGN",
      destinationAsset:"USDT",
      fees:[
        {feeType:"EXCHANGE",amount:1,assetCode:"NGN"},
        {feeType:"NETWORK",amount:0.5,assetCode:"NGN"},
      ],
    },true);
    expect(summary.total?.amount).toBe(3.5);
    expect(summary.lines).toHaveLength(3);
  });
});
