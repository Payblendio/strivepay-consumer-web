import Link from "next/link";

const guidance:Record<string,{title:string;body:string;context:string;href:string;link:string}>={
  ACCOUNT:{title:"Account setup",body:"Check Accounts for the setup or account details you need before buying or selling.",context:"Tell us which setup step is blocked and the error shown. Do not include passwords or verification codes.",href:"/dashboard/accounts",link:"Review accounts"},
  VERIFICATION:{title:"Verification help",body:"Follow the identity or company checks shown in your setup flow. Submitted details must be accurate.",context:"Tell us which check needs attention and the status shown. Do not attach identity documents unless the support team directs you to an approved collection flow.",href:"/dashboard",link:"Review setup status"},
  BUY:{title:"Before funding a buy",body:"Use the pay-in details and currency shown for your route. Check the receiving wallet and network before sending bank money.",context:"For a transfer already sent, include its activity reference, amount, currency and date. Never send again just because a transfer is pending.",href:"/dashboard/buy",link:"Review buy instructions"},
  SELL:{title:"Before sending crypto",body:"The asset, network and address must match your destination instructions. Do not reuse an old address after changing the destination or network.",context:"For crypto already sent, include the transaction hash, asset, network and date. Never share wallet recovery phrases or private keys.",href:"/dashboard/sell",link:"Review sell instructions"},
  TRANSFER:{title:"Tracking a transfer",body:"Activity shows transfer status and its timeline. A pending status does not mean the transfer failed.",context:"Include the activity reference and tell us which step needs attention. For a crypto transfer, add its transaction hash and network if available.",href:"/dashboard/activity",link:"Check activity"},
  OTHER:{title:"What to include",body:"Describe what you expected, what happened instead and any error message shown.",context:"You can add a screenshot after sending your request. Hide unrelated personal or financial details first.",href:"/dashboard/activity",link:"Review recent activity"},
};

export function SupportHelp({category}:{category:string}){
  const item=guidance[category]??guidance.OTHER;
  return <details className="support-help" key={category}>
    <summary>{item.title} · useful checks</summary>
    <div><p>{item.body}</p><p>{item.context}</p><Link href={item.href} target="_blank" rel="noopener noreferrer">{item.link} <span>(opens a new tab)</span></Link></div>
  </details>;
}
