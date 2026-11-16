# Build Brief: Gift Confirm (Shopify APM take-home prototype)

## How to use this file (for Quynh)

1. In the empty repo, create `docs/BRIEF.md` (this file) and `docs/DESIGN.md`.
2. Add a real photo of something your sister loves as `scripts/sample.jpg`.
3. Open Claude Code in the repo and paste:

> Read docs/BRIEF.md and docs/DESIGN.md in full. Follow Section 9 "Rules for Claude Code". Execute Milestone 0 only, then stop and show me the output.

4. After each milestone, review, then say "Go to Milestone N". Export the Claude Code transcript at the end for the submission.

---

## 1. Product in one paragraph

A mobile-first web app for gift buying. **Thesis: the giver chooses the thought; the recipient finishes the details.**
A giver with no idea uploads a photo of something the recipient loves and gets real, in-stock gifts from independent
makers via the Shopify Global Catalog. She commits to one pick, approves up to 3 alternatives (any merchant, ±15% price),
writes a one-line note, and sends a link. The recipient opens it on her phone, confirms size and address, or chooses one of
the approved alternatives. The giver then completes checkout on the final item's merchant checkout.
Differentiator: recipient confirm-or-choose **across every merchant in Shopify Catalog**, with no merchant setup.

## 2. Product decisions (locked)

| Decision | Choice |
|---|---|
| Demo story | Quynh → her sister, who just moved into her first apartment in Seattle |
| Hero entry | Photo of something she loves (visual / multimodal search). Text search is the fallback. Paste-a-link is out of scope unless time allows. |
| Recipient sees on open | Reveal screen first (note, then "Open your gift") |
| Prices on recipient screens | Hidden everywhere on recipient side |
| "Why this fits" | Written by the giver. No AI drafting. |
| Budget default | $25–$60 |
| Swap range | Up to 3 giver-approved alternatives, ±15% of pick price, any merchant |
| One-of-a-kind | If 0 alternatives: warn, never filter the item out |
| Payment timing | Giver pays only after recipient confirms, on the merchant's own checkout |
| Address copy | "Your address goes only to the shop." |
| Branding | DESIGN.md direction B. No Shopify logo. Plain-text credit "Built on Shopify Catalog + UCP". |

## 3. Scope

**Build with real API calls**
- Photo read → Claude vision (`POST /api/analyze`): 3–5 detected cues + one-line taste read. Cues are tappable themed searches. The only AI call in the app; degrades to "Photo read is off" without `ANTHROPIC_API_KEY`.
- Photo search (+ text fallback) → `search_catalog`. Verified: any `query` sent with an image overrides the visual signal, so photo search is pure visual; cues and the no-photo path are text searches.
- Swap check on the pick → `search_catalog` with `like: [{id}]`
- Recipient variant options → `get_product`
- Re-check before checkout → `get_product`, then open variant `checkout_url`

**Fake, and label in UI**
- Delivery estimate ("Prototype estimate" chip)
- Gift "completed" status (set manually when the giver clicks through)

**Do not build**
Accounts/auth, payments, email/SMS sending (copy-link only), multiple recipients, reminders, auto-ship fallback,
thank-you reply, wishlists, real UCP `create_checkout` (needs signed/token tier; anonymous profiles get no checkout tools).

## 4. Stack

- Next.js (App Router) + TypeScript + Tailwind. Deploy on Vercel.
- Inter via `next/font/google`.
- All Shopify calls **server-side** (route handlers). Never call the catalog from the browser.
- Storage: Upstash Redis (`@upstash/redis`) via Vercel Marketplace; in-memory `Map` fallback when env vars are missing.
- No component library. Tailwind + the tokens in DESIGN.md §2.

## 5. Shopify Global Catalog client (verified against shopify.dev, Nov 2026)

- Endpoint: `POST https://catalog.shopify.com/api/ucp/mcp` (JSON-RPC 2.0, `"method": "tools/call"`). No API key for anonymous use.
- Every call includes the agent profile at `params.arguments.meta["ucp-agent"].profile = process.env.UCP_PROFILE_URL`.
- Tool arguments go in `params.arguments.catalog`. Response: `result.structuredContent` (also handle SSE `data:` lines).
- Rate limit: 5 req/s shared across `search_catalog`, `get_product`, `lookup_catalog`. Call sequentially; on 429 respect `Retry-After`.
- Prices are minor units (cents). Treat price/availability as stale after 10 minutes.

```jsonc
// Photo search (multimodal). Drop "query" for pure visual search.
{ "query": "Her first apartment in Seattle",
  "like": [{ "image": { "content_type": "image/jpeg", "data": "<base64>" } }],
  "context": { "address_country": "US", "intent": "buying a gift" },
  "filters": { "ships_to": { "country": "US", "region": "WA" },
               "price": { "min": 2500, "max": 6000 },
               "rating": { "variant": { "min": 4, "min_count": 5 } } },
  "pagination": { "limit": 6 } }

// Swap check: products similar to the pick
{ "like": [{ "id": "gid://shopify/p/..." }],
  "filters": { "ships_to": { "country": "US", "region": "WA" },
               "price": { "min": <round(base*0.85)>, "max": <round(base*1.15)> } },
  "pagination": { "limit": 6 } }   // remove the pick itself; keep 3; prefer distinct sellers

// Variant options for recipient
{ "id": "gid://shopify/p/...", "selected": [{ "name": "Size", "label": "M" }] }
```

Fields used: product `id, title, url, media[0].url, options[].values[].{label,available,exists}, price_range, rating{value,count}`;
variant `id, title, price, checkout_url, availability.status, options, seller{name,url,links}`.

If a filter shape is rejected (e.g. `rating`), log it, drop that filter, and continue. Don't invent fields.

## 6. Data model

```ts
type ProductSnapshot = {
  id: string; title: string; shortName: string;          // shortName: "the stoneware planter"
  imageUrl?: string; priceCents: number;
  sellerName?: string; sellerUrl?: string; refundPolicyUrl?: string;
  rating?: { value: number; count: number };
};

type Gift = {
  id: string;                     // nanoid(8)
  createdAt: string;
  giverName: string;              // "Quynh"
  recipientLabel: string;         // "your sister" (giver-side copy)
  occasion?: string;              // drives "For your new place"
  note: string;
  pick: ProductSnapshot;
  approvedSwaps: ProductSnapshot[];       // 0–3
  status: "sent" | "confirmed" | "completed";
  confirmation?: {
    chosenProductId: string;
    variantId: string; variantTitle: string;
    address: { line1: string; city: string; region: string; postalCode: string; country: "US" };
    confirmedAt: string;
  };
};
```

## 7. Routes ↔ screens (DESIGN.md §4)

| Route | Screen |
|---|---|
| `/` | 1 · Start from a photo (+ states 1a loading, 1b no matches) |
| `/pick/[productId]` | 2 · Safety net + note → creates gift → shows link + Copy |
| `/g/[id]` | 3 · Reveal |
| `/g/[id]/open` | 4 · Love it or choose another (4a sheet is a state here) |
| `/g/[id]/done` | 5 · All set |
| `/gift/[id]` | 6 · She chose (+ waiting, price-changed, sold-out states) |

| API route | Does |
|---|---|
| `POST /api/search` | photo/text search → products |
| `POST /api/swaps` | swap check for a product id + price |
| `GET /api/product/[id]` | `get_product` passthrough (options, variants) |
| `POST /api/gifts` | create gift |
| `GET /api/gifts/[id]` | read gift (recipient view strips prices) |
| `POST /api/gifts/[id]/confirm` | save recipient choice; idempotent |
| `POST /api/gifts/[id]/checkout` | re-fetch final variant → `{ checkoutUrl, priceChanged, oldCents, newCents, soldOut }` |

Recipient-facing responses must not include prices.

## 8. Milestones (stop after each; show a 3-line summary: works / faked / broke)

- **M0 · Probe (15 min).** Scaffold Next.js + Tailwind with DESIGN.md tokens. Add `lib/catalog.ts`. Add `scripts/probe.ts`: photo search on `scripts/sample.jpg`, text search, swap check on result #1, `get_product` on result #1. Print titles, prices, sellers, option names, image URLs, timings. **Stop.** If photo results look poor, say so plainly — the hero path may change.
- **M1 · Screen 1 + states (35 min).** Photo upload (client resize to ≤1024px JPEG), occasion (600ms debounce), budget, ships-to, results grid, selection, 1a loading, 1b empty, stale-response guard.
- **M2 · Screen 2 (30 min).** Pick card, swap check, remove/undo, one-of-a-kind, note, create gift, share link + Copy.
- **M3 · Screens 3, 4, 4a, 5 (40 min).** Reveal, item + WhyCard, option pills from `get_product` (sold out disabled), address with validation, bottom sheet with blurred backdrop, confirm, done.
- **M4 · Screen 6 (20 min).** Status, waiting state, re-check, price-changed and sold-out states, open `checkout_url`.
- **M5 · Polish + deploy (20 min).** Seed one demo gift, verify mobile layout at 390px, deploy to Vercel, open the recipient link on a real phone.

## 9. Rules for Claude Code

- Read DESIGN.md before building any UI. Use its tokens, components, copy and states exactly; don't restyle.
- Build one milestone at a time. Don't start the next until told.
- Don't add features outside §3. If something seems necessary, ask first.
- Don't invent API fields. If a field is missing in real responses, handle it gracefully and tell me.
- No Shopify logo, no Shop Pay button art, no Shop purple. Plain-text credit only.
- Accessibility per DESIGN.md §6. Real buttons/links/labels.
- Log each catalog call (tool, ms, result count) to the server console.
- Keep code small and readable. Components in `components/`, catalog client in `lib/catalog.ts`, store in `lib/store.ts`.
- Commit at the end of each milestone with a clear message.

## 10. Env

```
UCP_PROFILE_URL=https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_GIVER_NAME=Quynh
ANTHROPIC_API_KEY=            # photo read (Screen 1c); optional — step degrades gracefully without it
```

## 11. Reflection notes (for the demo's last 45 seconds, not for building)

- Weakest part: photo-search quality is unverified at scale; delivery estimate is faked; checkout is a permalink, not full UCP checkout.
- With more time: signed/token profile → real UCP `create_checkout` so the recipient's address never touches the giver's device; Sign in with Shop for one-tap recipient address; auto-ship fallback if the link isn't opened; ship as a Shop Mini.
