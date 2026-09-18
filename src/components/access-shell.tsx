import Image from "next/image";
import Link from "next/link";

type AccessShellProps = {
  children: React.ReactNode;
  contentClassName?: string;
  eyebrow?: string;
  /** Desktop story headline (marketing). */
  title: string;
  copy: string;
  /** Short mobile story headline — usually the form panel title (e.g. Welcome back). */
  panelTitle: string;
};

export function AccessShell({
  children,
  contentClassName,
  eyebrow,
  title,
  copy,
  panelTitle,
}: AccessShellProps) {
  return (
    <div className="access-shell">
      <aside className="access-story" aria-label="StrivePay account access">
        <div className="access-story-grid" aria-hidden="true" />
        <div className="access-story-content">
          <Link className="access-logo" href="/" aria-label="StrivePay home">
            <Image
              src="/branding/strivepay-logo-dark.svg"
              alt="StrivePay"
              width={1937}
              height={621}
              priority
            />
          </Link>

          <div className="access-story-body">
            <div className="access-story-message">
              {eyebrow ? <span className="access-eyebrow access-story-eyebrow-desktop">{eyebrow}</span> : null}
              <h1 className="access-story-title-desktop">{title}</h1>
              <p className="access-story-copy-desktop">{copy}</p>
              <h1 className="access-story-title-mobile">{panelTitle}</h1>
            </div>

            <div
              className="access-collage"
              role="img"
              aria-label="A StrivePay conversion preview showing EUR, USD and GBP alongside BTC, ETH and USDC."
            >
              <div className="access-story-shape" aria-hidden="true" />
              <div className="access-product-preview" aria-hidden="true">
                <svg viewBox="0 0 600 350" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
                  <rect width="600" height="350" fill="#e4f5f5"/>
                  {[75,175,275].map(y=><g key={y} stroke="#7ed3d9" strokeWidth="2"><path d={`M190 ${y} C240 ${y} 250 175 280 175`}/><path d={`M320 175 C350 175 360 ${y} 410 ${y}`}/></g>)}
                  {[{code:"EUR",icon:"fiat/eu",x:25,y:50},{code:"USD",icon:"fiat/us",x:25,y:150},{code:"GBP",icon:"fiat/gb",x:25,y:250},{code:"BTC",icon:"crypto/btc",x:410,y:50},{code:"ETH",icon:"crypto/eth",x:410,y:150},{code:"USDC",icon:"crypto/usdc",x:410,y:250}].map(item=><g key={item.code} transform={`translate(${item.x} ${item.y})`}><rect width="165" height="50" fill="white"/><image href={`/branding/${item.icon}.svg`} x="12" y="9" width="32" height="32"/><text x="56" y="31" fill="#0b1733" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="17">{item.code}</text></g>)}
                  <circle cx="300" cy="175" r="42" fill="#eefafa" stroke="#a4dfe3"/>
                  <image href="/branding/strivepay-mark.svg" x="284" y="153" width="32" height="44"/>
                </svg>
              </div>

              <Image
                className="access-story-person"
                src="/images/auth/strivepay-access-professional-v3.png"
                alt=""
                width={1024}
                height={1536}
                priority
                sizes="(max-width: 760px) 46vw, (max-width: 1050px) 34vw, 26vw"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </aside>

      <main className={`access-main${contentClassName ? ` ${contentClassName}` : ""}`}>
        <div className="access-mobile-brand">
          <Link href="/" aria-label="StrivePay home">
            <Image src="/branding/strivepay-logo-dark.svg" alt="StrivePay" width={1937} height={621} />
          </Link>
        </div>
        <div className="access-main-inner">{children}</div>
        <p className="access-safety-note">
          Never share your password or security code with anyone, including StrivePay support.
        </p>
      </main>
    </div>
  );
}
