import Image from "next/image";

/**
 * Auth0-style floating product proof for the hero:
 * real StrivePay rate-calculator language on a soft teal atmosphere (Teamwork aura).
 */
export function HeroRouteVisual() {
  return (
    <div className="lp-hero-visual" aria-hidden>
      <div className="lp-hero-aura" />
      <div className="lp-hero-product">
        <div className="lp-hero-product-chrome">
          <span className="lp-hero-product-dot" />
          <span className="lp-hero-product-dot" />
          <span className="lp-hero-product-dot" />
          <strong>Live rate</strong>
        </div>

        <div className="lp-hero-quote">
          <div className="lp-hero-quote-row">
            <span className="lp-hero-quote-label">You send</span>
            <div className="lp-hero-quote-value">
              <b>100</b>
              <span className="lp-hero-quote-asset">
                <Image src="/branding/fiat/eu.svg" alt="" width={28} height={28} />
                EUR
              </span>
            </div>
          </div>

          <div className="lp-hero-quote-swap" aria-hidden />

          <div className="lp-hero-quote-row">
            <span className="lp-hero-quote-label">You receive</span>
            <div className="lp-hero-quote-value">
              <b>113.68</b>
              <span className="lp-hero-quote-asset">
                <Image src="/branding/crypto/usdc.svg" alt="" width={28} height={28} />
                USDC
              </span>
            </div>
          </div>
        </div>

        <div className="lp-hero-quote-meta">
          <span>Indicative StrivePay quote</span>
          <span className="lp-hero-quote-cta">Continue to buy</span>
        </div>
      </div>

      <div className="lp-hero-routes-float">
        <Image
          src="/images/auth/strivepay-currency-routes-primary-v2.webp"
          alt=""
          width={1152}
          height={768}
          priority
          unoptimized
          sizes="(max-width: 980px) 55vw, 320px"
        />
      </div>
    </div>
  );
}
