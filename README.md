# IoT Data Access Checker

Technical readiness analysis for connected-product and IoT OpenAPI documentation. The application produces engineering findings, **not legal advice, certification, or proof of compliance**.

## Architecture

The project deliberately targets **Cloudflare Pages**, not another host:

- Next.js App Router + TypeScript + Tailwind CSS, exported statically to `out/`.
- OpenAPI JSON/YAML parsing and initial analysis run locally in the browser.
- Cloudflare Pages Functions under `functions/api/` provide authenticated server operations.
- Cloudflare D1 stores users, hashed sessions, report JSON, and processed Stripe event IDs.
- PDF generation currently runs in the browser from the analysis result. Persisted reports remain owner-scoped through Pages Functions.

This split is required because Next.js static export cannot run dynamic Next.js route handlers, cookies, Server Actions, or webhooks. Do not move these endpoints into `app/api/` while `output: "export"` is enabled.

## Local setup

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

`next dev` serves the static frontend only. Use Wrangler Pages development after creating the D1 database to exercise `functions/` locally.

## Cloudflare Pages configuration

- Framework preset: **Next.js (Static HTML Export)**
- Build command: `npm run build`
- Output directory: `out`
- Production branch: `main`

Copy `wrangler.toml.example` to `wrangler.toml` only after creating the Cloudflare resources. Replace placeholders; do not commit secrets.

Create a D1 database and apply the migration:

```bash
npx wrangler d1 create iot-data-access-checker
npx wrangler d1 migrations apply iot-data-access-checker --remote
```

Required non-secret variables:

- `APP_ORIGIN`: exact HTTPS origin of the Pages site.
- `STRIPE_PRICE_ID`: only after a Stripe product/price is approved and created.

Server-only secrets, configured in Cloudflare Pages settings (never `NEXT_PUBLIC_*`):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Security boundaries

- Input is limited to JSON/YAML OpenAPI files of 2 MB.
- The analyzer never resolves or fetches external `$ref` URLs, avoiding SSRF and unintended network access.
- Passwords use PBKDF2-SHA-256 with per-user salt and 310,000 iterations.
- Session tokens are random, stored only as SHA-256 hashes, and sent via `HttpOnly; Secure; SameSite=Lax` cookies.
- Report reads and writes require a valid session and always filter by owner ID.
- Stripe signatures are verified against the raw request body with a five-minute tolerance.
- Processed Stripe event IDs are stored before fulfillment to make webhook retries idempotent.
- Checkout is disabled with HTTP 503 until all approved Stripe settings exist.

Production hardening still required before launch: rate limiting/Turnstile on authentication, email verification and password reset, CSRF protection for state-changing authenticated endpoints, account deletion, retention policy, Stripe test-mode integration tests, and a professional legal review of product wording.

## Current MVP scope

Implemented analyzer checks include OpenAPI 3.x structure, declared security schemes, explicit unauthenticated overrides, response documentation, operation descriptions, schema/path/operation counts, and external reference detection. More EU Data Act-specific technical questions should be added as documented, versioned heuristics—not represented as a legal compliance determination.
