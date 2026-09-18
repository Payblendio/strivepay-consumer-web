# Dashboard improvement and verification

Objective: inspect and improve the consumer dashboard across its screens, sign in, and test the actual experience. Preserve the established teal/ink dashboard, provider-agnostic copy, account eligibility and existing financial workflows.

## Coverage and evidence requirements

- Authentication: custom validation, sign-in, safe return destination, expired-session recovery.
- Navigation: desktop/sidebar, mobile open/close, keyboard focus, profile menu, breadcrumbs.
- Overview: setup progress, buy/sell entry points, truthful chart period/data states, recent activity, quotes.
- Buy and Sell: loaded/empty/error/retry, eligible asset/network selection, pay-in and payout instructions, wallet/account setup and session gate.
- Activity and details: filtering, pagination, status/amount accuracy, timeline, copy controls and receipt/export.
- Accounts, How it works, Profile and Settings: clear state, links and responsive layout.
- Security: password, authenticator and sessions; loading/failure must never look like a confirmed setting.
- Onboarding: existing progress/resume/exit, selector labeling and recovery. No real identity changes or account creation for testing.
- Verification: focused regression tests, full TypeScript/build, browser routes and representative 375/430/768/1440/1920 widths; keyboard and recoverable state checks.

The browser uses an existing authorized test account. No real transfer, bank/wallet setup, verification submission, password change, authenticator activation, or device revocation is performed. Consequential actions are tested with fixtures/mocks rather than submitted to live services.

## Confirmed issues being addressed

1. Received amounts fall back to quotes; pending zero-value settlements look complete. Raw provider statuses/step names and completion phrasing leak into transaction UI.
2. Overview's 14-day chart counters count all supplied transactions. Missing numeric scale, refresh recovery, and motion control.
3. Closed mobile sidebar stays keyboard-focusable; no focus containment or restoration.
4. Quote responses can race and survive changes/failures; real-environment backend pricing silently falls back to simulated values.
5. Route editors swallow load errors into empty/completed states. Expired session cannot reopen a cached active OTP gate. Sell address loading has no timeout.
6. Security failures render as Off/zero sessions. Shared dialogs/selectors need accessible labels and state.
7. Receipt PDF typing and amount/timestamp accuracy needed fixes; fixture-based PDF generation tests are now present.

## Progress

The dashboard pass is implemented and verified against the local running app.

### Implemented

- Activity status copy now distinguishes pending payout, expected/quoted amounts, and completed receipts. Unknown provider labels are kept out of the customer-facing rows and detail timeline.
- The overview chart is a truthful 14-day UTC view with a numeric scale, an accessible daily-count table, refresh control, pause/resume for the asset marquee, and an explicit notice when the loaded history is partial or limited to the latest 100 records.
- Buy, Sell, Accounts, route editors, session gates, address preparation, quote loading, and security screens now expose recoverable failure states with retry actions instead of silently presenting empty or successful states.
- Payout identifiers are masked (`•••• 1332`) in destination lists and send-instruction headers. Pay-in details remain usable and copyable only when a complete identifier is actually available.
- The date-of-birth picker rejects impossible dates, uses a roving calendar tab stop, supports arrow/Home/End/PageUp/PageDown navigation, disables out-of-range months, and restores focus to its trigger after closing.
- Activity filter navigation is transition-guarded so rapid type/status changes cannot drop one of the selected filters. Export and receipt feedback now says when a download has started.

### Browser evidence

Using the existing authorized test account, I verified sign-in return-to recovery, overview, Buy, Sell, Accounts, Activity pagination/filter/empty states, the compact export modal (including Escape/focus return), How it works, Profile, Security, mobile navigation focus containment, existing onboarding resume, and route selector labeling. No transfer, account creation, identity submission, password/authenticator change, device revocation, or OTP send was performed.

Responsive captures are stored under `art/dashboard-review/` for the inspected 430, 768, and 1440 layouts. The inspected pages had no horizontal document overflow. The live provider catalog is occasionally slow: Sell and Accounts can take about 12 seconds to settle, after which the UI keeps the last usable details and offers retry. This is surfaced as a recoverable state rather than hidden.

### Verification

- Full Vitest suite: **211 passed, 1 skipped** across 33 files with two workers.
- TypeScript: `tsc --noEmit` passed.
- Production build: `pnpm build` passed and generated all dashboard/auth/onboarding routes.
- Focused lint for the new date picker and masked-identifier utility passed. Existing data-loader components still trigger the repository's React 19 `set-state-in-effect` lint rule; those pre-existing warnings/errors were not rewritten as part of this UI pass.
- Synthetic receipt/PDF QA generated and raster-inspected four PDFs over eight pages; tables, wrapping, branding, totals, status labels, and continuation pages were intact. Browser download byte capture is not claimed because the in-app browser does not expose a local download path.
