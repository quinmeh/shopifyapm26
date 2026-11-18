# Twofold

A gift made by two: you choose the thought, they finish the details. (Formerly "Gift Confirm".)

Shopify APM take-home prototype. **The giver chooses the thought; the recipient finishes the details.**
Full spec: [docs/BRIEF.md](docs/BRIEF.md).

## Local dev

```bash
npm install
cp .env.example .env.local   # already done once; Upstash vars optional locally
npm run dev                  # http://localhost:3000
npm run probe                # M0: hits the real Shopify Global Catalog
```

Without Upstash env vars the gift store is an in-memory Map (resets on restart). `GET /api/health` reports which store is active.

## Deploy to Vercel

See [M5 checks and deployment handoff](docs/M5.md). Production needs a Vercel login/project, an HTTPS `APP_URL`, persistent Upstash Redis, and real email configuration. `/api/health` returns 503 in production when required configuration is missing; local development continues to support memory storage and preview email.

`npm run build` uses Next.js's supported Webpack builder and Tailwind's PostCSS processor. The local Turbopack production worker could not bind its internal port; the Webpack production build was verified successfully. Development still uses Turbopack.

All Shopify catalog calls run server-side in `app/api/*` via [lib/catalog.ts](lib/catalog.ts).

## Giver verification and notifications

Givers create and share immediately, with private tracking saved to their browser. After creation, optional email verification enables notifications and cross-device recovery at `/gifts`. Recipients remain account-free. See [docs/EMAIL.md](docs/EMAIL.md) for Resend credentials, required production Redis storage, scheduled notification retries, and local `/dev/mail` preview. Preview emails do not send real mail.

Verification: `node --import tsx --test scripts/email.test.ts scripts/checkout.test.ts`. With the local server running and email preview enabled, `node --import tsx scripts/email-smoke.ts` exercises verification, access control, confirmation notifications, and logout.

## M5 verification and demo

```bash
npm test                     # focused API/business-rule tests
npm run lint
npm run build
npm run dev                  # leave running in another terminal
npm run test:e2e              # Chrome, 390px; fixtures for third-party services
node --import tsx scripts/delivery-smoke.ts
node --import tsx scripts/email-smoke.ts  # local EMAIL_MODE=preview only
npm run demo:seed             # creates an unconfirmed gift from the live catalog
```

Browser checks use installed Google Chrome. Screenshots and traces live in ignored `artifacts/` and `test-results/`. The seed command prints a recipient URL and saves a private automation cookie to `artifacts/demo-session.json` (do not share it). The seeded giver session belongs to the script; create a gift in your browser to test your own private tracking. Local gifts disappear when the server restarts. Use `npm run demo:seed -- --in-person` to seed the other delivery path.

## Judging search quality

- `npm run eval:search` runs a fixed set of occasions (plus any JPEGs in `artifacts/eval-photos/` and the sample photo) through `/api/search` and writes `artifacts/search-eval.md`. Mark each tile you would actually give with `[x]`; the share of marked tiles is the quality score. Set `EVAL_BASE_URL` to test production. Read-only.
- Production logs tag quality signals with `[signal]`: which view and grid position each pick came from, how many chip/filter changes it took, and whether the recipient kept the pick or chose an alternative.

