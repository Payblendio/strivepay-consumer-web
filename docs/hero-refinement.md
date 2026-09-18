# Hero refinement — 6 September 2026

The closed links communicated connection, but could also suggest constraint. The refined hero uses two open, opposing ribbon arrows: an explicit movement metaphor rather than a claim of unrestricted financial access. Design Director's single-kernel approach retains the existing ivory, teal, platinum and Geist system while changing the visual metaphor and removing redundant presentation.

Headline: **Your money. More ways to move.** Supporting copy names the actual actions: bank-funded buying and selling into a chosen bank account. The primary CTA is now **Get started**.

Removed both floating “Your bank” / “Your crypto” labels and the separate repeated currency strip. One aligned bank-money/crypto legend below the sculpture supplies recognizable currency and token marks. It is explanatory, not a list of universally available routes; the qualification remains visible.

## Deliverables

- `public/images/landing/open-routes.webp`: 1600 × 1280 transparent render, 70.7 KB.
- `art/landing/strivepay-open-routes.blend`: editable scene; original linked sculpture preserved as an alternate.
- `art/landing/OPEN_ROUTES.md`: regeneration instructions.
- `src/app/hero-flow.css`: scoped hero refinement styles.
- `art/landing-review/hero-refined-*.png`: rendered responsive screenshots.

The first preview concealed the left arrow tip. The second exposed it and deepened the teal. The final render increased platinum contrast; hero spacing was then tightened and the image container made independent of intrinsic image height.

## Verification

Eleven focused tests pass across the hero, route preview and coverage files. The hero test verifies the new headline, registration link, open-arrow asset, single currency/token group and removal of the old badges and repeated strip. Page and test ESLint passed. Responsive inspection covers narrow and wide mobile, tablet, laptop and large desktop (approximately 375, 430, 768, 1440 and 1920 CSS pixels; existing browser zoom was preserved). No document overflow or failed image loads were observed. No authentication, transfer, eligibility or backend functionality was changed.

Final recheck: all eleven focused tests and the full TypeScript check pass. The hero role-query tests use exact string names without the unsupported `exact` role option. Fresh browser captures at 375, 430, 768, 1440 and 1920 CSS pixels are saved as `art/landing-review/hero-current-*.png`; all five widths have no horizontal document overflow and the hero images load successfully. The production build was not rerun for this visual-only refinement.
