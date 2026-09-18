"use client";

import {createContext,useContext,useEffect,type ReactNode} from "react";
import type {AccountSetupState} from "@/components/dashboard-route-copy";
import type {AccountScope} from "@/lib/account-scope";
import {setCustomerFetchAccountScope} from "@/lib/customer-session";
import type {DashboardCustomer} from "@/lib/dashboard-access";

type DashboardFinanceContextValue={
  accountScope:AccountScope;
  canMutateFinances:boolean;
};

const DashboardCustomerContext=createContext<DashboardCustomer|null>(null);
const DashboardSetupContext=createContext<AccountSetupState|null|undefined>(undefined);
const DashboardFinanceContext=createContext<DashboardFinanceContextValue|null>(null);

export function DashboardCustomerProvider({
  customer,
  setup=null,
  accountScope="PERSONAL",
  canMutateFinances=true,
  children,
}:{customer:DashboardCustomer;setup?:AccountSetupState|null;accountScope?:AccountScope;canMutateFinances?:boolean;children:ReactNode}){
  useEffect(()=>{
    setCustomerFetchAccountScope(accountScope);
    return()=>setCustomerFetchAccountScope(null);
  },[accountScope]);
  return <DashboardCustomerContext.Provider value={customer}>
    <DashboardSetupContext.Provider value={setup}>
      <DashboardFinanceContext.Provider value={{accountScope,canMutateFinances}}>{children}</DashboardFinanceContext.Provider>
    </DashboardSetupContext.Provider>
  </DashboardCustomerContext.Provider>;
}

export function useDashboardCustomer(){
  const customer=useContext(DashboardCustomerContext);
  if(!customer)throw new Error("useDashboardCustomer must be used inside DashboardCustomerProvider");
  return customer;
}

export function useDashboardSetup(){
  const setup=useContext(DashboardSetupContext);
  if(setup===undefined)throw new Error("useDashboardSetup must be used inside DashboardCustomerProvider");
  return setup;
}

export function useDashboardFinance(){
  const finance=useContext(DashboardFinanceContext);
  if(!finance)throw new Error("useDashboardFinance must be used inside DashboardCustomerProvider");
  return finance;
}
