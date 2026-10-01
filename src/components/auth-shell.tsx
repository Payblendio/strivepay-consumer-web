import Image from "next/image";
import Link from "next/link";
import {CurrencyMarquee} from "./currency-marquee";

export function AuthShell({children,title,copy}:{children:React.ReactNode;title:string;copy:string}){
  return <main className="auth-shell auth-shell-v2">
    <aside className="auth-visual">
      <Image className="auth-photo" src="/images/auth/login-finance-professional.webp" fill sizes="(max-width: 900px) 100vw, 48vw" alt="A professional securely managing money from her phone" priority />
      <div className="auth-photo-shade" />
      <div className="auth-brand-top"><Link href="/"><Image src="/branding/strivepay-logo.webp" width={190} height={55} alt="StrivePay" priority /></Link><span>Secure customer access</span></div>
      <div className="auth-message"><span className="auth-kicker"><i /> BANK TO CRYPTO. BOTH DIRECTIONS.</span><h1>{title}</h1><p>{copy}</p><div className="auth-trust"><span>Encrypted sessions</span><span>Protected transactions</span></div></div>
      <CurrencyMarquee />
    </aside>
    <section className="auth-content auth-content-v2"><div className="auth-content-inner"><div className="auth-mobile-brand"><Link href="/"><Image src="/branding/strivepay-logo.webp" width={160} height={46} alt="StrivePay" /></Link></div>{children}<p className="auth-copyright">© StrivePay. All rights reserved.</p></div></section>
  </main>;
}
