# Actual DE sandbox onboarding — September 9, 2026

Supersedes the earlier dry-run restriction: user authorized real local account creation, Bakkt sandbox compliance outcomes, and admin-simulated transactions only.

- Created Lukas Weber (`lukas.weber.strivepay.sept9@yopmail.com`), Germany, personal account.
- Verified registration email through Mailpit and provider session through Yopmail.
- No identity documents fabricated/uploaded and no real funds transferred.
- Bakkt remains SANDBOX; Quidax remains LIVE and is outside these test operations.

## Issues and fixes

1. Provider rejected `Lindenstraße 38` at applicant creation. Address-line validation now blocks unsupported characters in residential, mailing and business inputs, local draft saves, and provider submissions. Live browser confirmed the toast before saving.
2. Local profile lock prevented correcting an address even when applicant creation had failed. Address-only recovery now requires KYC_NEEDED plus an explicit provider 404 confirming no KYC applicant exists. Identity and financial declarations remain immutable. Provider errors/ambiguous responses fail closed.
3. Added Review address action before identity collection for KYC_NEEDED accounts.

## Verification

- 20 focused frontend tests passed; TypeScript passed.
- 16 isolated backend tests passed, including address rejection and recovery guards.
- Isolated runner: `gradlew.bat --no-configuration-cache -I scripts/onboarding-tests.gradle :modules:core:test --tests '*IdentityLifecycleIntegrationTest' --tests '*AddressCharactersTest'`.
- Full backend test compilation still has an unrelated outdated CorporateMemberService constructor in CorporateSamlSecurityIntegrationTest; the isolated runner does not claim full-suite coverage.

## Pending

Live address recovery succeeded. The provider applicant was created, admin set FULL_USER, and the customer completed personal setup with USDT/Polygon (wallet ending 7Ca0), an active EUR funding account and the supplied DE payout IBAN ending 3000.

Admin simulations reached customer Activity:

- Buy: 125 EUR, transaction `bb3d4e10-e142-46be-b4b2-509f3e0892f1`.
- Sell: 75 USDT on Polygon, transaction `768b6c4d-8d06-49b8-94e0-c279770e2c8b`.
- Both were Deposit received / payout pending at the last browser check. Final settlement is not yet verified.

Business onboarding remains pending. No real funds moved.
