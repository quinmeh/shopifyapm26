# Gift Confirm

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

1. Push to GitHub, then `vercel link` (or import the repo at vercel.com/new).
2. Storage → Add **Upstash Redis** from the Marketplace → connect to this project. It injects `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
3. Add `UCP_PROFILE_URL` under Settings → Environment Variables (value in `.env.example`).
4. `vercel --prod`. Verify `https://<app>.vercel.app/api/health` returns `"storage": "upstash"`.

All Shopify catalog calls run server-side in `app/api/*` via [lib/catalog.ts](lib/catalog.ts).

## Giver verification and notifications

Givers create and share immediately, with private tracking saved to their browser. After creation, optional email verification enables notifications and cross-device recovery at `/gifts`. Recipients remain account-free. See [docs/EMAIL.md](docs/EMAIL.md) for Resend credentials, required production Redis storage, scheduled notification retries, and local `/dev/mail` preview. Preview emails do not send real mail.

Verification: `node --import tsx --test scripts/email.test.ts scripts/checkout.test.ts`. With the local server running and email preview enabled, `node --import tsx scripts/email-smoke.ts` exercises verification, access control, confirmation notifications, and logout.
