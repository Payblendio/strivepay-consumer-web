# StrivePay Consumer Web

Customer-facing Next.js application for authentication, onboarding, bank and crypto conversion, transaction tracking, company access and notification preferences.

## Local development

The Java API must be available at `http://127.0.0.1:18080`.

```powershell
Copy-Item .env.example .env.local
pnpm api:types
pnpm dev
```

Open `http://127.0.0.1:18081`.

## Verification

```powershell
pnpm typecheck
pnpm lint
pnpm build
```

Authentication is proxied through same-origin Next.js route handlers. Access and refresh tokens use `HttpOnly` cookies and are never returned to browser JavaScript. The refresh cookie is restricted to `/api/auth`.

## API contract

Regenerate the Java API contract first, then update the TypeScript definitions:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:18080/v3/api-docs" -OutFile "../consumer-api/docs/openapi.json"
pnpm api:types
```
