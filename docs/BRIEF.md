# Build Brief: Gift Confirm (Shopify APM take-home prototype)

> Build one milestone at a time. Do not skip ahead or add features not listed here.

## 1. What we're building (one paragraph)

A mobile-first web app for gift buying. **Thesis: the giver chooses the thought; the recipient finishes the details.**
A giver with no idea uploads a photo of something the recipient loves → gets real, in-stock gift options from the
Shopify Global Catalog → commits to one pick and approves up to 3 "swap" alternatives (any merchant, ±15% price) →
sends a link with a personal note. The recipient opens the link on their phone, confirms size/color/address or swaps
to an approved alternative. The giver then completes checkout with the final item's merchant.
Differentiator: recipient confirm-or-swap **across every merchant in Shopify Catalog**, with no merchant setup.

## 2. Product decisions (OWNER: Quynh — fill in before pasting)

| Decision | Choice |
|---|---|
| Demo story: giver → recipient relationship | `TODO` (e.g., "me → my sister in Seattle, new apartment") |
| Recipient sees on open | `TODO`: item immediately **or** "You have a gift from ___" reveal screen first |
| Prices on recipient's swap screen | `TODO`: hidden **or** shown |
| "Why this fits" reasons | `TODO`: giver writes them **or** AI drafts, giver edits |
| Budget default | `TODO` (e.g., $20–$80) |

## 3. Scope

**Build (real API):**
- G1 Photo path (hero): upload photo + optional text hint → `search_catalog` with `catalog.like` image (+ `query` for multimodal). Text-only search as fallback when no photo.
- G2 Pick one → swap check: one `search_catalog` with `like: [{id}]`, ±15% price, ships_to US. Giver sees up to 3 alternatives and can remove any. If 0 alternatives → show "One-of-a-kind: they can confirm details but can't swap." Never filter the item out.
- G3 Personal note + recipient name → create gift → shareable link `/g/[id]`.
- R1 Recipient page: giver's note, the pick, variant selection from `get_product` options (respect `available`/`exists` flags), shipping address form, OR choose one approved swap. Submit → gift status `confirmed`.
- G4 Giver status page `/gift/[id]`: shows recipient's final choice. "Complete purchase" re-fetches the variant with `get_product` (price/stock freshness < 10 min), shows a price-change notice if different, then opens the variant's `checkout_url` (merchant's own checkout).

**Fake, and label in UI with a small "prototype" tag:**
- Delivery date estimate after address entry (catalog has no delivery data).
- Seller trust line: seller name + link to refund policy if present in `seller.links`.

**Do NOT build:** accounts/auth, payments, email/SMS sending (just show a copy-link button), multiple recipients,
reminders, auto-ship fallback, wishlists, real UCP `create_checkout` (requires signed/token tier — anonymous profiles get no checkout tools).

## 4. Stack

- Next.js (App Router) + TypeScript + Tailwind. Deploy on Vercel.
- All Shopify calls happen **server-side** in route handlers (`app/api/...`). Never call the catalog from the browser.
- Storage: Upstash Redis via Vercel Marketplace (`@upstash/redis`), with an in-memory Map fallback when env vars are absent (local dev).
- No AI SDK unless decision "AI drafts reasons" is chosen; if so, keep it to one server route.

## 5. Shopify Global Catalog client (verified against shopify.dev docs, Nov 2026)

- Endpoint: `POST https://catalog.shopify.com/api/ucp/mcp` (JSON-RPC 2.0, `method: "tools/call"`). No API key for anonymous use.
- Every call includes the agent profile:
  `params.arguments.meta["ucp-agent"].profile = process.env.UCP_PROFILE_URL`
  Default for dev: `https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json`
- Tool args go in `params.arguments.catalog`. Response is in `result.structuredContent` (handle SSE `data:` lines too).
- Rate limit: 5 req/s shared across tools. Call sequentially; respect `Retry-After` on 429.
- Prices are minor units (cents).

```jsonc
// search_catalog — photo (multimodal)
{ "query": "for her new apartment",
  "like": [{ "image": { "content_type": "image/jpeg", "data": "<base64>" } }],
  "context": { "address_country": "US", "intent": "buying a gift" },
  "filters": { "ships_to": { "country": "US" }, "price": { "min": 2000, "max": 8000 },
               "rating": { "variant": { "min": 4, "min_count": 5 } } },
  "pagination": { "limit": 6 } }

// search_catalog — swap check
{ "like": [{ "id": "gid://shopify/p/..." }],
  "filters": { "ships_to": { "country": "US" }, "price": { "min": <base*0.85>, "max": <base*1.15> } },
  "pagination": { "limit": 5 } }   // drop the pick itself from results

// get_product — variants for recipient
{ "id": "gid://shopify/p/...", "selected": [{ "name": "Size", "label": "M" }] }

// lookup_catalog — paste-a-link (secondary, only if time allows)
{ "ids": ["https://some-shop.myshopify.com/products/..."] }  // unresolved → messages[].code "not_found"
```

Useful response fields: product `id, title, url, media, options, price_range, rating`; variant `id, title, price,
checkout_url, availability.status, options, seller{name,url,links}`.

If the `rating` filter shape above is rejected, remove it and continue (log the error).

## 6. Data model

```ts
type Gift = {
  id: string;                 // short nanoid, used in /g/[id]
  createdAt: string;
  giverName: string;
  recipientName: string;
  note: string;
  reasons?: string;           // "why this fits"
  pick: ProductSnapshot;
  approvedSwaps: ProductSnapshot[];   // 0–3
  oneOfAKind: boolean;        // true when approvedSwaps is empty
  status: "sent" | "confirmed" | "completed";
  confirmation?: {
    chosenProductId: string;  // pick or a swap
    variantId: string;
    variantTitle: string;
    address: { name: string; line1: string; city: string; region: string; postalCode: string; country: "US" };
    confirmedAt: string;
  };
};
type ProductSnapshot = { id: string; title: string; imageUrl?: string; priceCents: number;
  sellerName?: string; sellerUrl?: string; refundPolicyUrl?: string; url?: string };
```

## 7. Routes

| Route | Purpose |
|---|---|
| `/` | Giver: upload photo (client-side resize to ≤ 1024px JPEG before base64, keeps body < 1 MB) + hint + budget → results grid |
| `/pick/[productId]` | Giver: pick detail, swap check, remove swaps, note, recipient name → create gift |
| `/gift/[id]` | Giver: share link, status, then "Complete purchase" after confirmation |
| `/g/[id]` | Recipient (mobile-first): note, pick, variants, address, swap option, confirm |
| `POST /api/search` | photo/text search |
| `POST /api/swaps` | swap check for a product |
| `GET /api/product/[id]` | get_product passthrough (variants/options) |
| `POST /api/gifts`, `GET /api/gifts/[id]`, `POST /api/gifts/[id]/confirm` | gift store |
| `POST /api/gifts/[id]/checkout` | re-fetch variant, return `{checkoutUrl, priceChanged, oldPrice, newPrice}` |

## 8. Milestones (stop after each and show me the result)

- **M0 – Probe (15 min):** scaffold Next.js app; add `lib/catalog.ts` client; add `scripts/probe.ts` that runs a text search, a photo search on `scripts/sample.jpg`, a swap check, and `lookup_catalog` on one product URL. Print titles, prices, sellers, counts. **Acceptance:** real products print. If photo search fails or results are poor, stop and tell me — the hero path may change.
- **M1 – Giver search (30 min):** `/` with photo upload + hint + results grid using real data.
- **M2 – Pick + swaps + create gift (30 min):** `/pick/[productId]`, swap check, remove-swap, one-of-a-kind state, note, create gift → link.
- **M3 – Recipient page (30 min):** `/g/[id]` mobile layout, variant picker from options, address form, swap choice, confirm.
- **M4 – Giver completion (15 min):** `/gift/[id]` status + re-fetch + price-change notice + open `checkout_url`.
- **M5 – Fakes + polish + deploy (20 min):** delivery estimate + seller trust line (labeled "prototype"), seed a demo gift, deploy to Vercel, test recipient link on a real phone.

## 9. Rules for Claude Code

- Keep it small and readable. No component libraries beyond Tailwind. No tests beyond the probe script.
- Don't invent API fields. If a field is missing in real responses, handle it gracefully and tell me.
- Don't add features outside Section 3. If something seems needed, ask first.
- Log every catalog request/response summary to the server console (useful for the demo).
- After each milestone, give me a 3-line summary: what works, what's faked, what broke.

## 10. Env vars

```
UCP_PROFILE_URL=https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json
UPSTASH_REDIS_REST_URL=        # optional locally
UPSTASH_REDIS_REST_TOKEN=      # optional locally
```
