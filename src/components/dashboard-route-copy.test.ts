import {describe,expect,it} from "vitest";
import {
  buyOrdersFromActivity,
  buyOrdersFromTrades,
  tradesFromRampActivity,
  dashboardBreadcrumb,
  dashboardPageMeta,
  mergeBuyOrders,
  sortPayoutAccounts,
  accountSetupHref,
  accountSetupState,
  receivedAmount,
  destinationAmountSummary,
  orderStatusClass,
  formatOrderStatus,
} from "./dashboard-route-copy";

describe("dashboard route copy",()=>{
  it("distinguishes update dates from creation dates when mapping direct activity",()=>{
    const direct={id:"direct",status:"PENDING",direction:"FIAT_TO_CRYPTO",updatedAt:"2026-09-06T10:00:00Z"};
    expect(tradesFromRampActivity([direct])[0]).toMatchObject({createdAt:direct.updatedAt,dateBasis:"updated"});
    expect(buyOrdersFromActivity([direct])[0]).toMatchObject({createdAt:direct.updatedAt,dateBasis:"updated"});
    const withCreation={...direct,createdAt:"2026-09-01T10:00:00Z"};
    expect(tradesFromRampActivity([withCreation])[0]).toMatchObject({createdAt:withCreation.createdAt,dateBasis:"created"});
    expect(buyOrdersFromActivity([withCreation])[0]).toMatchObject({createdAt:withCreation.createdAt,dateBasis:"created"});
  });

  it("keeps quoted Buy amounts expected and pending placeholders unsettled",()=>{
    const trade={id:"order",status:"PENDING",createdAt:"2026-09-01",direction:"FIAT_TO_CRYPTO",destinationAsset:"USDC",quotedDestinationAmount:99};
    expect(buyOrdersFromTrades([trade])[0]).toMatchObject({destinationLabel:"Expected",destinationDisplay:"99 USDC"});
    expect(buyOrdersFromTrades([{...trade,deliveredAmount:0}])[0]).toMatchObject({destinationLabel:"Expected",destinationDisplay:"99 USDC"});
    expect(buyOrdersFromTrades([{...trade,status:"COMPLETED",deliveredAmount:98}])[0]).toMatchObject({destinationLabel:"Received",destinationDisplay:"98 USDC"});
    const direct={id:"direct",status:"PENDING",direction:"FIAT_TO_CRYPTO",cryptoAsset:"USDC",cryptoAmount:0};
    expect(buyOrdersFromActivity([direct])[0]).toMatchObject({destinationLabel:"Payout",destinationDisplay:"Pending"});
    expect(buyOrdersFromActivity([{...direct,cryptoAmount:99}])[0]).toMatchObject({destinationLabel:"Expected",destinationDisplay:"99 USDC"});
    expect(buyOrdersFromActivity([{...direct,status:"COMPLETE",cryptoAmount:98}])[0]).toMatchObject({destinationLabel:"Received",destinationDisplay:"98 USDC"});
  });
  it("never presents an estimate or an unsettled zero placeholder as received",()=>{
    const base={id:"pending",createdAt:"2026-09-01",status:"OUTSIDE_TRANSFER_RECEIVED",destinationAsset:"EUR"};
    expect(receivedAmount({...base,quotedDestinationAmount:100})).toBeNull();
    expect(destinationAmountSummary({...base,quotedDestinationAmount:100})).toEqual({label:"Expected",value:"100 EUR"});
    expect(receivedAmount({...base,deliveredAmount:0})).toBeNull();
    expect(destinationAmountSummary({...base,deliveredAmount:0})).toEqual({label:"Payout",value:"Pending"});
    expect(receivedAmount({...base,status:"COMPLETED",deliveredAmount:0})).toBe(0);
    expect(receivedAmount({...base,deliveredAmount:10})).toBe(10);
    expect(receivedAmount({...base,deliveredAmount:"not-a-number"})).toBeNull();
    expect(orderStatusClass("INCOMPLETE")).not.toBe("completed");
    expect(formatOrderStatus("PROCESS_COMPLETED")).toBe("Completed");
    expect(formatOrderStatus("OUTSIDE_TRANSFER_RECEIVED")).toBe("Deposit received");
  });
  it("keeps a solid breadcrumb trail for buy and sell nested pages",()=>{
    expect(dashboardBreadcrumb("/dashboard")).toEqual([{label:"Overview"}]);
    expect(dashboardBreadcrumb("/dashboard/buy")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Buy crypto"}]);
    expect(dashboardBreadcrumb("/dashboard/buy/update")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Buy crypto",href:"/dashboard/buy"},{label:"Update wallet"}]);
    expect(dashboardBreadcrumb("/dashboard/buy/add")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Accounts",href:"/dashboard/accounts"},{label:"Request pay-in account"}]);
    expect(dashboardBreadcrumb("/dashboard/profile")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Settings",href:"/dashboard/settings"},{label:"Profile"}]);
    expect(dashboardBreadcrumb("/dashboard/settings")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Settings"}]);
    expect(dashboardBreadcrumb("/dashboard/settings/security")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Settings",href:"/dashboard/settings"},{label:"Security"}]);
    expect(dashboardBreadcrumb("/dashboard/settings/security/password")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Settings",href:"/dashboard/settings"},{label:"Security",href:"/dashboard/settings/security"},{label:"Change password"}]);
    expect(dashboardBreadcrumb("/dashboard/settings/security/authenticator")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Settings",href:"/dashboard/settings"},{label:"Security",href:"/dashboard/settings/security"},{label:"Authenticator"}]);
    expect(dashboardBreadcrumb("/dashboard/settings/security/sessions")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Settings",href:"/dashboard/settings"},{label:"Security",href:"/dashboard/settings/security"},{label:"Signed-in devices"}]);
    expect(dashboardBreadcrumb("/dashboard/sell")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Sell crypto"}]);
    expect(dashboardBreadcrumb("/dashboard/sell/add")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Accounts",href:"/dashboard/accounts"},{label:"Add payout account"}]);
    expect(dashboardBreadcrumb("/dashboard/sell/account-1")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Accounts",href:"/dashboard/accounts"},{label:"Send instructions"}]);
    expect(dashboardBreadcrumb("/dashboard/activity")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Activity"}]);
    expect(dashboardBreadcrumb("/dashboard/activity/tx-1")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Activity",href:"/dashboard/activity"},{label:"Transaction details"}]);
    expect(dashboardBreadcrumb("/dashboard/accounts")).toEqual([{label:"Overview",href:"/dashboard"},{label:"Accounts"}]);
    expect(dashboardBreadcrumb("/dashboard/how-it-works")).toEqual([{label:"Overview",href:"/dashboard"},{label:"How it works"}]);
  });

  it("marks buy and sell as the active money-control pages",()=>{
    expect(dashboardPageMeta("/dashboard","Marco").active).toBe("overview");
    expect(dashboardPageMeta("/dashboard","Marco").copy).toBe("Good to see you, Marco.");
    expect(dashboardPageMeta("/dashboard/buy").active).toBe("buy");
    expect(dashboardPageMeta("/dashboard/buy/update").title).toBe("Update wallet");
    expect(dashboardPageMeta("/dashboard/buy/add").title).toBe("Request pay-in account");
    expect(dashboardPageMeta("/dashboard/profile").title).toBe("Profile");
    expect(dashboardPageMeta("/dashboard/settings").title).toBe("Settings");
    expect(dashboardPageMeta("/dashboard/settings/security").title).toBe("Security");
    expect(dashboardPageMeta("/dashboard/settings/security/password").title).toBe("Change password");
    expect(dashboardPageMeta("/dashboard/settings/security/authenticator").title).toBe("Authenticator");
    expect(dashboardPageMeta("/dashboard/settings/security/sessions").title).toBe("Signed-in devices");
    expect(dashboardPageMeta("/dashboard/sell").active).toBe("sell");
    expect(dashboardPageMeta("/dashboard/sell/add").title).toBe("Add payout account");
    expect(dashboardPageMeta("/dashboard/sell/account-1").title).toBe("Send instructions");
    expect(dashboardPageMeta("/dashboard/activity").active).toBe("activity");
    expect(dashboardPageMeta("/dashboard/activity/tx-1").title).toBe("Transaction");
    expect(dashboardPageMeta("/dashboard/accounts").active).toBe("accounts");
    expect(dashboardPageMeta("/dashboard/how-it-works").active).toBe("how-it-works");
    expect(dashboardPageMeta("/dashboard/how-it-works").title).toBe("How it works");
  });

  it("flags unfinished compliance and money-route setup",()=>{
    expect(accountSetupHref("BUSINESS")).toBe("/onboarding/business");
    expect(accountSetupHref("PERSONAL")).toBe("/onboarding/personal");
    expect(accountSetupState(null,false,false)).toEqual({approved:false,pending:false,failed:false,routesReady:false,complianceStatus:""});
    expect(accountSetupState({complianceStatus:"KYC_PENDING"},true,true)).toMatchObject({approved:false,pending:true,routesReady:false});
    expect(accountSetupState({complianceStatus:"FULL_USER"},true,false)).toMatchObject({approved:true,routesReady:false});
    expect(accountSetupState({complianceStatus:"FULL_USER"},true,true)).toMatchObject({approved:true,routesReady:true});
    expect(accountSetupState({complianceStatus:"REJECTED"},false,false).failed).toBe(true);
  });

  it("keeps only FIAT_TO_CRYPTO rows in recent buy orders",()=>{
    const ramp=buyOrdersFromActivity([
      {id:"ramp-buy",direction:"FIAT_TO_CRYPTO",status:"COMPLETE",fiatCurrency:"EUR",fiatAmount:"100",cryptoAsset:"USDT",cryptoAmount:"98",network:"ETHEREUM",updatedAt:"2026-09-01T10:00:00Z"},
      {id:"ramp-sell",direction:"CRYPTO_TO_FIAT",status:"COMPLETE",fiatCurrency:"EUR",fiatAmount:"50",cryptoAsset:"USDT",cryptoAmount:"49",network:"ETHEREUM",updatedAt:"2026-09-01T11:00:00Z"},
    ]);
    const trades=buyOrdersFromTrades([
      {id:"order-buy",status:"SETTLED",createdAt:"2026-09-01T12:00:00Z",direction:"FIAT_TO_CRYPTO",sourceAsset:"EUR",sourceAmount:"25",destinationAsset:"USDT",quotedDestinationAmount:"24"},
      {id:"order-sell",status:"SETTLED",createdAt:"2026-09-01T13:00:00Z",direction:"CRYPTO_TO_FIAT",sourceAsset:"USDT",sourceAmount:"10",destinationAsset:"EUR",quotedDestinationAmount:"9"},
    ]);
    expect(ramp.map(item=>item.id)).toEqual(["ramp-buy"]);
    expect(trades.map(item=>item.id)).toEqual(["order-buy"]);
    expect(mergeBuyOrders(ramp,[{...ramp[0],status:"DUPLICATE"},...trades]).map(item=>item.id)).toEqual(["order-buy","ramp-buy"]);
  });

  it("lists the primary payout account first",()=>{
    const accounts=sortPayoutAccounts([
      {id:"secondary",accountName:"Backup",mainRecipient:false},
      {id:"primary",accountName:"Primary EUR",mainRecipient:true},
    ]);
    expect(accounts.map(item=>item.id)).toEqual(["primary","secondary"]);
  });
});
