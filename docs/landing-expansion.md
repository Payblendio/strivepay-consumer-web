# Landing expansion — September 8, 2026

## Current brief

Expand the landing page with official Bakkt, Quidax, Stripe, Tatum and Dot MFB logos suitable for a dark marquee; product screenshots captured from the authorized test account; illustrated how-it-works; original Blender and generated artwork; purposeful scroll animation and a route graph. Keep all existing working coverage and registration paths.

## New reference set

References are the nine images in attachment a49b2b24-5204-4197-bbd9-0c2be33bd0ff, not the earlier references described in landing-direction.md. Inspected 1–5 and 7–9. Image 6 repeatedly failed image decoding and remains unreviewed.

- 1: alternating dark/light editorial pacing and physical device presentation.
- 2: real product proof with restrained explanatory overlays.
- 3: tangible 3D visual followed by concise capability sections.
- 4: product walkthroughs that pair selectable context with screen imagery.
- 5: structured grid and a connected multi-device composition.
- 7: explain the product using a focused screen, then supporting details.
- 8: recognizable physical object paired with UI fragments.
- 9: numbered illustrated steps rather than a text-only checklist.

Use StrivePay's existing ink/teal/ivory palette and typography as the single visual kernel. Do not copy third-party composition, slogans, invented performance statistics or endorsements. Design-reference search tools are unavailable; the supplied references provide the visual evidence.

## Intended page sequence

1. Existing concise hero with original 3D money-route artwork.
2. Dark official-logo marquee with pause control and reduced-motion fallback.
3. Buy/sell product showcase using sanitized real screenshots and clear illustrative labels.
4. Route graph: bank funding → supported crypto wallet; crypto deposit → chosen payout account. This is a process graph, not an invented price/profit chart.
5. Existing interactive coverage explorer.
6. Image-led how-it-works: verify, configure, track; screenshots in original device compositions.
7. Personal/business use cases and permission/visibility benefits supported by implemented functionality.
8. Security and in-app help explanation, FAQ, final CTA.

## Acceptance

September 9 verification: production build and TypeScript compilation pass. Public-page browser QA captures five widths (360, 430, 768, 1366, 1920) in `art/landing/qa/`. All five report no horizontal overflow, broken images or browser errors; one H1; functioning route selection, keyboard country selection and FAQ disclosure; no running CSS animations with reduced motion. Normal-motion checks confirm marquee pause/resume and intersection-triggered route animation. Screenshots were visually reviewed at all five widths, with detailed captures of walkthroughs, coverage, setup and personal/business content. The final QA script additionally checks keyboard entry and server-rendered content without JavaScript.

- Obtain official logo assets and retain provenance/usage notes; do not treat a logo as evidence of endorsement or universal availability.
- Capture the authorized product session; do not publish emails, names, account identifiers, addresses or transaction hashes. Keep real UI structure, not generated financial facts.
- Generate and save original image artwork and Blender source/render in the workspace.
- Motion must be progressive enhancement: content visible without JavaScript, reduced motion respected, marquee pausable.
- Check mobile/tablet/desktop layout, screenshot legibility, image loading, keyboard operation and existing coverage interactions.
- Run focused tests, typecheck and build after implementation. No deployment/completion claim before verification.

## Generated artwork v1

Built-in image generation, not Blender or CLI. Saved to `public/images/landing/money-routes-dark-v1.png` and used by the new dark feature section in `src/app/page.tsx`. Inspected generated output: teal/platinum two-direction currency sculpture on ink navy, no personal information or invented interface. Actual Blender source and render are documented below.

Prompt: Use case: stylized-concept. Asset type: premium StrivePay financial website wide feature illustration, original artwork, no text. Create a refined studio 3D composition representing money moving in both directions between bank money and crypto: two independent open satin-metal ribbons bending smoothly through space in opposite directions, one deep teal enamel and one brushed platinum, with three small upright milled metallic currency discs travelling along the paths. Discs have subtle embossed euro, dollar and bitcoin symbols, not third-party logos. Wide 3:2 composition, object group concentrated in the center-right, clean dark ink navy #071e28 backdrop with generous negative space left. Physically credible thickness, finely beveled edges, restrained teal rim lighting, crisp satin surfaces, soft grounded reflections. Editorial financial-product campaign quality, sophisticated and calm. No interlocked chain links, no padlocks, no candlestick charts, no upward growth arrows, no invented UI, no words, no watermark, no purple gradients. This is a secondary website art panel, keep the silhouette legible at small sizes.

## Blender setup artwork

September 9: created and rendered original bank/wallet scene using Blender 5.2.1 LTS, Cycles, 48 samples, 1200×900. Source `art/landing/generate_setup_scene.py`; editable scene `art/landing/generate_setup_scene.blend`; inspected image `public/images/landing/setup-bank-wallet-v1.png`. Added to the how-it-works section. This is actual Blender geometry, separate from the generated dark artwork. Further composition polish can follow the real-screen walkthrough integration.

## Delivered scope and evidence

Final acceptance (September 9): `next build` completed successfully, including TypeScript and all 40 static pages. Marketing/landing regression suite: 10 tests passed in 5 files. Final production browser run passed all five widths, normal-motion pause/scroll checks, first-tab skip-link check, and no-JavaScript heading visibility. Rendered screenshots and JSON results are in `art/landing/qa/`. No material layout or functional failures remain in this landing-page scope. This is local frontend acceptance, not a production deployment or provider/compliance certification.

- More sections: partner band, interactive route graph, separate buy/sell screen walkthroughs, dark artwork-led benefit section, illustrated setup, personal/business uses and support guidance, alongside existing coverage, FAQ and CTA.
- Five requested partner logos: actual downloaded/extracted official assets and source notes in `art/partner-sources/README.md`. White/dark-background presentation, pause control, reduced-motion static layout. Tatum is a monochrome CSS treatment of the official source; brand-use approval remains a publishing consideration, not a claim of endorsement.
- Reference synthesis: eight decodable supplied examples informed editorial pacing, device mockups and numbered walkthroughs. Reference 6 cannot be decoded; no claim that it was reviewed.
- Real product input: authorized buy and sell screens captured in the browser, used to generate sanitized, clearly labeled illustrative mockups. Prompts and privacy notes in `art/landing/buy-mockup-provenance.md` and `sell-mockup-provenance.md`. No raw customer screen is published. A third activity mockup was considered but is not needed for the two requested directional walkthroughs.
- Original artwork: Blender `.py`, `.blend` and PNG; generated dark currency artwork; generated screen mockups. Blender coins separated and lighting refined after render inspection.
- Navigation: setup links directly to illustrated buy/sell flows, registration links retain the existing account-choice flow, help links to authenticated dashboard support.
- Responsive polish: tablet walkthroughs stack for screen legibility; high-contrast dark-section CTA; visible keyboard focus and hidden-until-focused skip link.
- Verification runner: `art/landing/verify-landing.cjs`, accepts `LANDING_PLAYWRIGHT` module path and `LANDING_URL`. Screenshots/report are public-page only and contain no customer session data. Production preview uses local port 18085 during QA; normal development remains on 18081. No deployment performed.
