# German onboarding dry run — September 9, 2026

## Scope and limits

The user declined switching provider modes and requested a pretend/dry run with realistic fictional details. No new account, compliance decision, wallet change or bank account was submitted. Existing authorized test-account login and email session authentication were used solely to inspect protected forms. Quidax remained LIVE; provider settings were not changed.

## Verified in the running browser

- Registration: German residence and realistic-format fictional phone entry; email left unsubmitted. Avoid sequential dummy values.
- Fixed international phone input: full +49 entry no longer becomes a duplicated +49 prefix. After refreshing, the actual form showed the national-format number correctly. Country-specific national entry, international paste and autofill covered by four tests.
- Existing company setup reaches its completed state. This existing company is not a newly onboarded German business, so it is not evidence of the requested new DE KYB journey.
- Existing account session code arrived at the authorized Yopmail inbox from the sandbox provider, not Mailpit. Confirmed the code normally; did not bypass verification.
- Payout editor: supplied checksum-valid German IBAN ending 3000 retained with display spaces. No Save action. The supplied IBAN ending 1502 has an invalid checksum and was not substituted or silently corrected.
- Wallet editor: Ethereum/USDC form displayed the first supplied wallet ending 7Ca0 as an unsaved value. Previously confirmed session was reused without another OTP prompt. This is form behavior, not proof of wallet ownership or provider acceptance.

## Implemented safeguards

- Shared international phone field accepts international and national values, preserves residence, and updates phone-country selection for international pastes.
- Payout IBAN preflight accepts formatting spaces/lowercase, verifies checksum (plus DE length), and canonicalizes transport values. Spaced pastes are not prematurely truncated by schema maxLength. Validation runs before session/provider submission; ownership/existence still requires provider checks.
- Ten targeted phone/IBAN tests passed; final TypeScript check also passed after the maxLength adjustment. No end-to-end financial submission was tested.

## Still unverified

New personal/business registration, their email verification, new DE KYC/KYB and submitted first-time account setup are not completed. Dry-run inspection of an existing account cannot prove those outcomes. Continue only within the user's latest no-submission scope unless they provide new authorization.
