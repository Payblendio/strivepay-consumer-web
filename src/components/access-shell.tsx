import Image from "next/image";
import Link from "next/link";
import {AccessRoutePreview} from "./access-route-preview";
import {BrandLogo} from "./brand-logo";
import {ThemeToggle} from "./theme-toggle";

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
          <div className="access-story-top">
            <Link className="access-logo" href="/" aria-label="StrivePay home">
              <BrandLogo force="dark" width={1937} height={621} priority/>
            </Link>
            <ThemeToggle placement="access" className="access-theme-toggle-story"/>
          </div>

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
              <AccessRoutePreview/>

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
        <div className="access-main-top">
          <div className="access-mobile-brand">
            <Link href="/" aria-label="StrivePay home">
              <BrandLogo width={1937} height={621}/>
            </Link>
          </div>
          <ThemeToggle placement="access" className="access-theme-toggle-main"/>
        </div>
        <div className="access-main-inner">{children}</div>
        <p className="access-safety-note">
          Never share your password or security code with anyone, including StrivePay support.
        </p>
      </main>
    </div>
  );
}
