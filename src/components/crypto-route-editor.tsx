"use client";

import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {IconAlertTriangle,IconArrowRight,IconLoader2} from "@tabler/icons-react";
import {useToast} from "@/components/ui/toast";
import {moneyRouteApi,sessionApi,sessionRequired,titleCase,walletAddressValid} from "@/lib/money-route-api";
import {ASSET_RELEVANCE,COUNTRY_CURRENCY,FIAT_NAME,Field,ROUTE_TOKENS,RouteSelect,TARGET_NETWORKS,networkRailLabel,residenceAllowsCurrency} from "./money-route-controls";
import {RouteOtpGate,type RequireRouteSession} from "./route-otp-gate";
import {loadErrorMessage,withDeadline} from "./account-readiness";
import {useDashboardFinance} from "./dashboard-customer";
import type {DashboardCustomer} from "@/lib/dashboard-access";

type Network={code:string;name:string};
type Asset={code:string;name:string;type:string;networks:Network[]};
type Coverage={fiatCurrencies:Array<{code:string;name:string}>;fundingCurrencies?:Array<{code:string;name:string}>;transferableAssets:Asset[]};
type Preference={fiatCurrency:string;token:string;network:string;routeType?:"NATIVE"|"COMPOSITE"|"STABLECOIN";address?:string|null;addressType?:string|null;vasp?:string|null};

export function CryptoRouteEditor({customer}:{customer:DashboardCustomer}){
  const router=useRouter();
  const {canMutateFinances}=useDashboardFinance();
  const {show}=useToast();
  const error=useCallback((message:string)=>show({tone:"danger",title:"Check this step",message}),[show]);
  const success=useCallback((message:string)=>show({tone:"success",title:"Saved",message}),[show]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [loadAttempt,setLoadAttempt]=useState(0);
  const [busy,setBusy]=useState(false);
  const [coverage,setCoverage]=useState<Coverage|null>(null);
  const [currency,setCurrency]=useState("");
  const [token,setToken]=useState("");
  const [network,setNetwork]=useState("");
  const [address,setAddress]=useState("");
  const [addressType,setAddressType]=useState("SELF_HOSTED");
  const [vasp,setVasp]=useState("");

  useEffect(()=>{let cancelled=false;void (async()=>{try{
    const [loadedCoverage,preferences]=await withDeadline(Promise.all([
      sessionApi<Coverage>("/coverage?refresh=true"),
      moneyRouteApi<Preference[]>("/preferences"),
    ]));
    if(cancelled)return;
    if(!loadedCoverage)throw new Error("Crypto options could not be loaded.");
    const saved=preferences[0];
    const home=COUNTRY_CURRENCY[customer.country.toUpperCase()];
    const accepted=loadedCoverage?.fundingCurrencies?.map(item=>item.code)??[];
    setCoverage(loadedCoverage);
    setCurrency(saved?.fiatCurrency??(home&&accepted.includes(home)?home:accepted[0]??""));
    setToken(saved?.token??"");
    setNetwork(saved?.network??"");
    setAddress(saved?.address??"");
    setAddressType(saved?.addressType??"SELF_HOSTED");
    setVasp(saved?.vasp??"");
    setLoadError("");
  }catch(problem){if(!cancelled)setLoadError(loadErrorMessage(problem,"Your destination could not be loaded."));}
  finally{if(!cancelled)setLoading(false);}
  })();return()=>{cancelled=true;};},[customer.country,loadAttempt]);

  const assets=useMemo(()=>coverage?.transferableAssets.filter(item=>item.type==="CRYPTO"&&item.networks.length>0||item.type==="STABLECOIN"&&ROUTE_TOKENS.has(item.code)&&item.networks.some(value=>TARGET_NETWORKS.has(value.code))).sort((a,b)=>(ASSET_RELEVANCE.get(a.code)??Number.MAX_SAFE_INTEGER)-(ASSET_RELEVANCE.get(b.code)??Number.MAX_SAFE_INTEGER)||a.name.localeCompare(b.name))??[],[coverage]);
  const selectedAsset=assets.find(item=>item.code===token)??null;
  const networks=selectedAsset?.networks.filter(item=>selectedAsset.type==="CRYPTO"||TARGET_NETWORKS.has(item.code))??[];
  const nativeRoute=selectedAsset?.type==="CRYPTO"&&currency==="NGN";
  const fiatNames=new Map(coverage?.fiatCurrencies.map(item=>[item.code,item.name])??[]);
  const fundingOptions=(coverage?.fundingCurrencies??[])
    .filter(item=>residenceAllowsCurrency(customer.country,item.code))
    .map(item=>({value:item.code,label:fiatNames.get(item.code)??FIAT_NAME[item.code]??item.code,detail:"Available for your residence",kind:"fiat" as const}));
  const assetOptions=assets.map(item=>({value:item.code,label:item.name,detail:item.type==="STABLECOIN"?"Direct stablecoin route":"Crypto delivery route",kind:"crypto" as const}));
  const networkOptions=networks.map(item=>({value:item.code,label:item.name||titleCase(item.code),detail:networkRailLabel(item.code),kind:"network" as const}));

  function chooseAsset(value:string){
    setToken(value);
    setAddress("");
    const item=assets.find(asset=>asset.code===value);
    setNetwork(item?.networks.find(entry=>item.type==="CRYPTO"||TARGET_NETWORKS.has(entry.code))?.code??"");
  }

  async function saveCrypto(event:FormEvent,sessionActive:boolean,requireSession:RequireRouteSession){
    event.preventDefault();
    if(!currency||!token||!network||!address.trim()||addressType==="HOSTED"&&!vasp.trim()){error("Choose the route and add the wallet that should receive crypto");return;}
    const wallet=address.trim();
    if(!walletAddressValid(network,wallet)){error("Enter a valid wallet address for the selected network");return;}
    if(!nativeRoute&&!sessionActive&&!requireSession())return;
    setBusy(true);
    try{
      await moneyRouteApi<Preference>("/crypto",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({fiatCurrency:currency,token,network,address:wallet,addressType,vasp:addressType==="HOSTED"?vasp.trim():undefined})});
      success("Your crypto destination is updated.");
      router.push("/dashboard/buy");
      router.refresh();
    }catch(problem){
      if(sessionRequired(problem)){requireSession({expired:true});error(problem instanceof Error?problem.message:"Confirm this session to continue");return;}
      error(problem instanceof Error?problem.message:"The crypto route could not be saved");
    }finally{
      setBusy(false);
    }
  }

  if(loading)return <div className="compliance-loading"><IconLoader2 className="spin"/>Loading your destination…</div>;
  if(!canMutateFinances)return <div className="compliance-form"><p className="compliance-form-copy">Company money routes are view-only for your role. Switch to personal or ask an administrator to update the company wallet.</p><button type="button" className="compliance-secondary" onClick={()=>router.push("/dashboard/accounts")}>Back to Accounts</button></div>;
  if(loadError)return <div className="accounts-load-error" role="alert"><IconAlertTriangle size={22}/><div><strong>Your destination could not be loaded</strong><p>{loadError}</p></div><button type="button" className="compliance-primary" onClick={()=>{setLoading(true);setLoadAttempt(value=>value+1);}}>Try again</button></div>;
  if(!fundingOptions.length||!assets.length)return <div className="compliance-form"><p className="compliance-form-copy">No crypto routes are available for your account right now.</p><button type="button" className="compliance-secondary" onClick={()=>{setLoading(true);setLoadAttempt(value=>value+1);}}>Check again</button></div>;

  return <RouteOtpGate email={customer.email} nativeAllowed={nativeRoute}>
    {(sessionActive,requireSession)=>
      <form className="compliance-form" onSubmit={event=>void saveCrypto(event,sessionActive,requireSession)} noValidate>
        <div className="compliance-form-grid">
          <RouteSelect label="Bank currency" value={currency} options={fundingOptions} onChange={setCurrency} placeholder="Choose a currency"/>
          <RouteSelect label="Crypto asset" value={token} options={assetOptions} onChange={chooseAsset} placeholder="Choose an asset"/>
          <RouteSelect label="Network" value={network} options={networkOptions} onChange={setNetwork} placeholder="Choose a network" disabled={!token}/>
          <Field label="Wallet type"><select value={addressType} onChange={event=>setAddressType(event.target.value)}><option value="SELF_HOSTED">I control this wallet</option><option value="HOSTED">Exchange or custodian</option></select></Field>
          <Field label="Receiving wallet" hint="Use an address for the selected network." wide><input value={address} onChange={event=>setAddress(event.target.value.trim())} placeholder={network==="BITCOIN"?"bc1…":network==="SOLANA"?"Solana address":"Wallet address"}/></Field>
          {addressType==="HOSTED"?<Field label="Wallet service" wide><input value={vasp} onChange={event=>setVasp(event.target.value)} placeholder="Exchange or custodian name"/></Field>:null}
        </div>
        <div className="compliance-form-actions">
          <button className="compliance-primary" type="submit" disabled={busy}>{busy?<IconLoader2 className="spin" size={17}/>:null}Save destination <IconArrowRight size={17}/></button>
        </div>
      </form>
    }
  </RouteOtpGate>;
}
