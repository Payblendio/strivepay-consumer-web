"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { CountrySelect } from "@/components/ui/country-select";
import { CryptoLogo } from "@/components/ui/crypto-logo";
import { DataTable, Pagination, TablePerson, type Column } from "@/components/ui/data-table";
import { Dropdown } from "@/components/ui/dropdown";
import { GlassCard, Pill } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { Badge, Button, Chip, Notice, Progress, SegmentedControl, Skeleton, TextField, Toggle, Tooltip } from "@/components/ui/primitives";
import { DetailList, EmptyState, StatusIllustration, type StatusArt } from "@/components/ui/status-state";
import { useToast } from "@/components/ui/toast";

type Transaction = { id: string; initials: string; title: string; subtitle: string; amount: string; asset: string; status: "Completed" | "Processing" | "Failed"; date: string };
const transactions: Transaction[] = [
  { id: "SP-8F21", initials: "BT", title: "Buy Bitcoin", subtitle: "NGN to BTC", amount: "NGN 2,500,000.00", asset: "0.01042 BTC", status: "Processing", date: "29 Aug, 10:42" },
  { id: "SP-2C94", initials: "SE", title: "Sell Ethereum", subtitle: "ETH to NGN", amount: "1.25 ETH", asset: "NGN 6,820,000.00", status: "Completed", date: "28 Aug, 13:35" },
  { id: "SP-7A16", initials: "EU", title: "Euro on-ramp", subtitle: "EUR to USDC", amount: "EUR 10,000.00", asset: "10,842.30 USDC", status: "Failed", date: "27 Aug, 18:06" },
];
const statusTone = { Completed: "success", Processing: "info", Failed: "danger" } as const;
const columns: Column<Transaction>[] = [
  { key: "transaction", header: "Transaction", render: row => <TablePerson initials={row.initials} title={row.title} subtitle={`${row.id} · ${row.subtitle}`} /> },
  { key: "amount", header: "Amount", render: row => <strong>{row.amount}</strong> },
  { key: "receive", header: "Expected", render: row => row.asset },
  { key: "status", header: "Status", render: row => <Badge tone={statusTone[row.status]} dot>{row.status}</Badge> },
  { key: "date", header: "Updated", align: "right", render: row => row.date },
];
const artStates: { state: StatusArt; label: string }[] = [
  { state: "success", label: "Successful" }, { state: "failed", label: "Failed" }, { state: "processing", label: "Processing" }, { state: "pending", label: "Pending" },
  { state: "action", label: "Action required" }, { state: "kyc", label: "KYC verified" }, { state: "kyb", label: "KYB verified" }, { state: "security", label: "Secure" },
];

export default function Components() {
  const [country, setCountry] = useState("NG"), [asset, setAsset] = useState("BTC"), [modal, setModal] = useState(false), [alert, setAlert] = useState(false);
  const [enabled, setEnabled] = useState(true), [segment, setSegment] = useState("all"), [page, setPage] = useState(1);
  const [chips, setChips] = useState(["Bank transfer", "Crypto", "Completed"]);
  const { show } = useToast();
  return <main className="component-lab">
    <header className="lab-nav"><Link href="/"><Image src="/branding/strivepay-logo.webp" width={175} height={50} alt="StrivePay" /></Link><Pill active>Component system · v0.2</Pill></header>
    <section className="lab-copy"><span className="micro-label">STRIVEPAY DESIGN SYSTEM</span><h1>Big, clean.<br /><span>Quietly distinct.</span></h1><p>A concise financial interface built around decisions, movement, trust, and clear outcomes.</p></section>
    <section className="lab-grid">
      <GlassCard className="showcase-card"><Heading number="01" title="Country selector" description="Large, searchable and built for global coverage." /><CountrySelect value={country} onChange={setCountry} /></GlassCard>
      <GlassCard className="showcase-card"><Heading number="02" title="Asset dropdown" description="Rich options with useful context and clear selection." /><Dropdown label="Asset to receive" value={asset} onChange={setAsset} options={[{ value: "BTC", label: "Bitcoin", description: "Bitcoin network", leading: <CryptoLogo code="btc" /> }, { value: "ETH", label: "Ethereum", description: "Ethereum network", leading: <CryptoLogo code="eth" /> }, { value: "USDC", label: "USD Coin", description: "Stablecoin", leading: <CryptoLogo code="usdc" /> }]} /></GlassCard>
      <GlassCard className="showcase-card component-section"><SectionTop title="Status artwork" description="One compact visual for every important customer state." /><div className="status-art-row">{artStates.map(item => <div className="status-art-item" key={item.state}><StatusIllustration status={item.state} size={104} /><span>{item.label}</span></div>)}</div></GlassCard>
      <GlassCard className="showcase-card component-section"><SectionTop title="Chips, pills and badges" description="Filters, classifications and transaction state at three densities." /><div className="component-stack"><div className="chip-row">{chips.map(chip => <Chip key={chip} selected={chip === "Crypto"} onRemove={() => setChips(current => current.filter(value => value !== chip))}>{chip}</Chip>)}<Chip>NGN</Chip></div><div className="badge-row"><Badge dot>Draft</Badge><Badge tone="info" dot>Processing</Badge><Badge tone="success" dot>Completed</Badge><Badge tone="warning" dot>Review</Badge><Badge tone="danger" dot>Failed</Badge></div></div></GlassCard>
      <GlassCard className="showcase-card"><Heading number="03" title="Form controls" description="Large targets and concise guidance." /><div className="form-grid"><TextField label="Amount" prefix="NGN" placeholder="0.00" hint="Minimum conversion is NGN 10,000" /><TextField label="Wallet address" placeholder="Enter destination address" suffix={<Tooltip content="Use the exact network address"><span>?</span></Tooltip>} /></div></GlassCard>
      <GlassCard className="showcase-card"><Heading number="04" title="Preferences" description="Simple settings without visual clutter." /><div className="component-stack"><Toggle checked={enabled} onChange={setEnabled} label="Automatic conversion" description="Convert when your account reaches the threshold." /><Progress value={68} label="Daily transaction limit" detail="NGN 6.8m of NGN 10m" /><SegmentedControl value={segment} onChange={setSegment} options={[{ value: "all", label: "All" }, { value: "fiat", label: "Fiat" }, { value: "crypto", label: "Crypto" }]} /></div></GlassCard>
      <GlassCard className="showcase-card component-section"><SectionTop title="Transaction table" description="Responsive ledger rows with useful financial hierarchy." /><DataTable columns={columns} rows={transactions} getKey={row => row.id} /><div className="table-footer"><span>Showing 1 to 3 of 24 transactions</span><Pagination page={page} pages={8} onChange={setPage} /></div></GlassCard>
      <GlassCard className="showcase-card"><Heading number="05" title="Notices" description="Information that is visible without becoming alarming." /><div className="component-stack"><Notice tone="info" title="Deposit confirmed">Your conversion has started at the current market rate.</Notice><Notice tone="warning" title="Verification needed" action={<Button size="small" variant="secondary">Continue</Button>}>Complete your identity check before your next transfer.</Notice></div></GlassCard>
      <GlassCard className="showcase-card"><Heading number="06" title="Loading and empty states" description="Polished waiting states with a clear next action." /><div className="component-stack"><Skeleton height={58} radius={15} /><Skeleton width="72%" /><EmptyState compact status="pending" title="No pending transfers" description="New transfers requiring attention will appear here." /></div></GlassCard>
      <GlassCard className="showcase-card"><Heading number="07" title="Modal and confirmation" description="Focused decisions with safe, predictable actions." /><div className="button-row"><Button onClick={() => setModal(true)}>Open modal</Button><Button variant="secondary" onClick={() => setAlert(true)}>Show confirmation</Button><Button variant="danger">Danger action</Button></div></GlassCard>
      <GlassCard className="showcase-card"><Heading number="08" title="Toast feedback" description="Short, friendly status feedback in four tones." /><div className="button-row"><Button size="small" variant="secondary" onClick={() => show({ tone: "success", title: "Destination saved", message: "Your BTC wallet is ready." })}>Success</Button><Button size="small" variant="secondary" onClick={() => show({ tone: "info", title: "Quote refreshed", message: "The latest rate is available." })}>Info</Button><Button size="small" variant="secondary" onClick={() => show({ tone: "warning", title: "Action required", message: "Verify your email to continue." })}>Warning</Button><Button size="small" variant="secondary" onClick={() => show({ tone: "danger", title: "Transfer paused", message: "We could not confirm the destination." })}>Error</Button></div></GlassCard>
      <GlassCard className="showcase-card component-section"><SectionTop title="Transaction detail" description="The essential information a customer needs to understand a conversion." /><DetailList items={[{ label: "Conversion", value: "ETH to NGN" }, { label: "Amount received", value: "1.25 ETH" }, { label: "Exchange rate", value: "1 ETH = NGN 5,456,000" }, { label: "Network and exchange fees", value: "NGN 136,400" }, { label: "Expected settlement", value: "NGN 6,683,600", emphasized: true }]} /></GlassCard>
    </section>
    <Modal open={modal} onClose={() => setModal(false)} title="Add a destination" description="Choose where you want your converted asset delivered."><div className="modal-demo"><Dropdown label="Destination type" value="wallet" onChange={() => undefined} options={[{ value: "wallet", label: "External crypto wallet", description: "You control the destination address" }, { value: "bank", label: "Verified bank account", description: "For supported fiat settlement" }]} /><Button onClick={() => setModal(false)}>Continue</Button></div></Modal>
    <AlertDialog open={alert} onClose={() => setAlert(false)} onConfirm={() => { setAlert(false); show({ tone: "success", title: "Preference updated" }); }} tone="warning" title="Update this destination?" message="Future automatic conversions will be delivered to the newly selected destination." confirmLabel="Yes, update it" />
  </main>;
}

function Heading({ number, title, description }: { number: string; title: string; description: string }) { return <div className="card-heading"><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></div>; }
function SectionTop({ title, description }: { title: string; description: string }) { return <div className="section-top"><div><h2>{title}</h2><p>{description}</p></div></div>; }
