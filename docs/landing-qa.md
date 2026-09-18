# Landing page verification

Reviewed 6 September 2026 at http://localhost:18081/.

## Rendered review

Inspected narrow mobile (375 × 850), wide mobile (430 × 932), tablet (768 × 1024), laptop (1440 × 1000), and large desktop (1920 × 1080). The page has no horizontal document overflow at these sizes. All referenced images loaded, the page has one H1, and duplicate anchors were removed.

Screenshot evidence is in `art/landing-review/`: five hero captures plus mobile/tablet/desktop coverage, product preview, and FAQ states. These are viewport captures, not stitched full-page exports. The design review uses real rendered HTML; illustrations of money routes are explicitly labeled illustrative.

The original 1680 × 1520 transparent Blender hero is 65 KB as WebP. Editable scene, generator and full PNG master are retained in `art/landing/` and `public/images/landing/`.

## Interactions

- Buy/Sell buttons change the explanation and route illustration.
- Keyboard search and Enter select Italy with EUR/GBP funding; payout is independently destination-dependent.
- Unlisted residence search has a no-match state. Escape and outside blur clear the query while preserving the selected country.
- Globe rotation starts/pauses; selecting a residence stops rotation and focuses the country. Reduced-motion and offscreen suspension are implemented.
- Native FAQ disclosure opens and closes. The main CTA opens the existing registration page; no registration or financial transaction was submitted.
- Existing authenticated dashboard and Buy flow were inspected to ground public copy. Personal account information is excluded from public-page screenshots.

## Automated checks

Focused ESLint passed for the page, both marketing components, coverage data and new tests. Ten focused tests passed across three files, including interactive selection and parity with backend residence funding rules.

Production build compiled successfully, then failed on the pre-existing unrelated TypeScript error in `src/lib/transaction-receipt.ts:183` (TS7009, `new doc.GState` has no construct signature). That file was left unchanged. The build was not reported as passing.

## Scope

This change redesigns the public landing page and its explanatory interactions. It does not alter registration, verification, transfer execution, account eligibility or backend provider integrations. Public funding examples remain qualified; no guaranteed settlement times, fixed pricing, custody claims, fabricated statistics or provider branding were added.
