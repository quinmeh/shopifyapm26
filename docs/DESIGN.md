# DESIGN.md: Twofold

> **Name.** Twofold: every gift is made by two people. The giver chooses the thought; the recipient finishes the details. "Fold" is also the wrapping paper. The mark is a bow: two loops, one knot.

> Visual reference: the "Gift Confirm — Prototype Mockups (Polaris)" canvas (9 screens; the product was renamed Twofold after the mockups).
> This file is the source of truth for tokens, components, copy and states. When the canvas and this
> file disagree, this file wins.

## 1. Principles

1. **The giver chooses the thought; the recipient finishes the details.** Every screen should make it obvious who owns the choice.
2. **Two moods, one system.** Giver screens are a decision tool (Polaris grey, neutral). Recipient screens are opening a present (warm paper, clay accent). Same type, spacing, components and ink buttons on both.
3. **Clarity first, then delight.** Flat surfaces. No gradients or drop shadows on UI; the only blur is behind the swap panel. Motion is the one expressive layer: it marks gift moments (opening, confirming, sharing) and gives every control a tactile response. See §2 Motion.
4. **Polaris-native, not Shopify-branded.** Follow Polaris patterns (ink primary buttons, green only for success). Never use the Shopify logo, Shop Pay button art, or Shop purple. Credit is plain text: "Built on Shopify Catalog + UCP".

## 2. Tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `ink` | `#303030` | Primary buttons, selected borders, giver body text |
| `ink-hover` | `#1A1A1A` | Primary button hover |
| `giver-bg` | `#F1F1F1` | Giver page background |
| `surface` | `#FFFFFF` | Cards, inputs |
| `giver-border` | `#E3E3E3` | Giver card borders, dividers |
| `giver-input-border` | `#CCCCCC` | Inputs, secondary button border |
| `giver-text-2` | `#616161` | Secondary text on giver screens (passes 4.5:1 on `#F1F1F1` and white) |
| `skeleton` | `#EBEBEB` | Loading blocks |
| `gift-bg` | `#FAF6F0` | Recipient page background |
| `gift-border` | `#EADFD3` | Recipient card borders |
| `gift-input-border` | `#D6C8B8` | Recipient inputs |
| `gift-text` | `#2B2522` | Recipient body text |
| `gift-text-2` | `#6B5E54` | Recipient secondary text |
| `clay` | `#8C3A22` | Gift accent text/icons (reveal icon, "Why Quynh picked this", "also liked" tag) |
| `clay-tint` | `#F6E3D8` | Clay backgrounds (reveal circle, tag) |
| `clay-wash` | `#FBF1EB` | Note card background inside item card |
| `success` | `#29845A` | Success icon fill |
| `success-text` | `#0C5132` | Success text, "Ships to" check |
| `success-tint` | `#CDFEE1` | Success banner, confirmed circle |
| `disabled-bg` | `#E3E3E3` | Disabled primary button |
| `soldout-bg` | `#F7F3EE` | Sold-out pill background (text `#8A7E74`, dashed border `#D6C8B8`) |
| `overlay` | `rgba(43,37,34,0.28)` | Swap panel backdrop, plus `backdrop-filter: blur(8px)` |

Rules:
- Clay is **only** for gift moments. Never on buttons.
- Green is **only** for success / confirmation / "ships to". Never decorative.
- Primary buttons are `ink` on both themes.

### Type

Fonts: **Inter** for UI and body (weights 400/500/600/700) and **Fraunces** (variable, SOFT + opsz axes) for the voice of the gift.

- `font-display` (Fraunces 600, SOFT 60): the wordmark, Display and H1 headlines, screen titles in headers.
- `font-note` (Fraunces italic, SOFT 100): the giver's note everywhere it appears (NoteQuote 19/28, WhyCard 15/21). The giver types the note in a normal Inter input; it becomes serif only where the recipient reads it., so it reads like a handwritten card.
- Everything else stays Inter, including item titles, labels, prices and buttons.

| Role | Size / line-height | Weight |
|---|---|---|
| Display (reveal, done) | Fraunces 34 / 40 | 600 |
| H1 (page title) | Fraunces 28 / 34 | 600 |
| Header screen title | Fraunces 19 | 600 |
| Section title | 14–16 / 20 | 650 (use 600 if variable font unavailable) |
| Item title | 15–17 / 19–22 | 650 |
| Body | 14 / 20 | 400 |
| Note quote | 16 / 25 | 400 |
| Small / meta | 12–13 / 17–18 | 400–500 |
| Minimum anywhere | 11px, and only for non-essential captions | |

Numbers in prices/totals: `font-variant-numeric: tabular-nums`.

### Motion

Defined in `app/globals.css`; components opt in by class. Stagger with `stagger(i)` from `components/ui.tsx` or the `stagger-children` container class.

| Class | Use |
|---|---|
| `rise` | Default entrance: 14px up + fade, 520ms ease-out, delay from `--d`. |
| `stagger-children` | Children rise one after another, 50ms apart (lists, form sections, sheet rows, cue chips). |
| `pop` | Spring scale-in for check badges, selection marks, tags, success circles. |
| `draw` / `DrawnCheck` | A check that draws its stroke in. |
| `shimmer` | Skeleton loading band (replaces static skeleton blocks). |
| `press` | Every button and selectable card: 0.975 scale on press, color transitions on hover. |
| `img-reveal` | Merchant images fade in. |
| `float`, `ring`, `lid-off`, `settle` | Reveal screen only: the closed gift floats, rings breathe out, the lid lifts on "Open your gift". |
| Intro splash | Before giver step 1 (`components/intro-splash.tsx`): the bow's two loops draw out from one knot, the knot pops, the tails fall and the bow gives a small tug, then "Twofold" and "A gift made by two." rise and the splash lifts away (~2.7s). Once per browser session; tap, Skip, Esc or Enter ends it; skipped entirely with reduced motion. |
| Scratch reveal | Screen 4 first visit (`components/scratch-reveal.tsx`): the item photo sits under a clay foil (stripes, small bows, "Scratch to reveal") that jiggles like a blind box with a sweeping sheen until touched. Scratching clears it; past ~45% the foil dissolves, confetti bursts and the title, seller and "Why {Giver} picked this" rise in, followed by options, address and the confirm button. Below the photo, "{Giver} picked something just for you · Scratch the card to see it." A "Tap to reveal" button is the keyboard and no-scratch path. Once per gift per session; never on the giver's "choose an alternative yourself" screen. |
| `Confetti` | Paper confetti in clay, ink and warm neutrals (never green). Only on gift moments: opening the gift, the scratch reveal, "You're all set", and "Your gift is ready to share". |

Rules: entrances ≤ 520ms, interactions ≤ 200ms, the reveal open sequence ~900ms before navigating. `prefers-reduced-motion` collapses every animation to its end state, hides confetti and rings, and the reveal navigates immediately.

### Spacing, radius, size

- Screen padding: 20px horizontal. Header: 18px top.
- Vertical gap between cards: 10px. Card padding: 12–14px.
- Radius: 8px controls (buttons, inputs, pills, thumbnails), 12px cards, 20px top corners on bottom sheet.
- Touch targets ≥ 44px tall (primary buttons 48–52px, pills 44px, inputs 40px with full-width tap area).
- Mobile-first: design at 390px wide; content max-width 480px centered on larger screens.

### Tailwind config

```js
// tailwind.config.ts → theme.extend
colors: {
  ink: { DEFAULT: '#303030', hover: '#1A1A1A' },
  giver: { bg: '#F1F1F1', border: '#E3E3E3', input: '#CCCCCC', text2: '#616161' },
  gift: { bg: '#FAF6F0', border: '#EADFD3', input: '#D6C8B8', text: '#2B2522', text2: '#6B5E54' },
  clay: { DEFAULT: '#8C3A22', tint: '#F6E3D8', wash: '#FBF1EB' },
  success: { DEFAULT: '#29845A', text: '#0C5132', tint: '#CDFEE1' },
  skeleton: '#EBEBEB',
},
fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
borderRadius: { control: '8px', card: '12px', sheet: '20px' },
```

Theme switch: wrap giver routes in `data-theme="giver"` and recipient routes in `data-theme="gift"`, or just use the token classes directly per route.

## 3. Components

| Component | Spec |
|---|---|
| **AppHeader** | 28×28 ink square (radius 8) with the white bow mark (`BowMark`) + "Twofold" in Fraunces 19/600. Right side varies: "Prototype" chip (giver), "No account needed" (recipient), "New gift" link (status). |
| **BackButton** | 36×36, white, 1px border, radius 8, chevron-left icon, `aria-label="Back"`. |
| **PrimaryButton** | Full width, 48–52px, ink bg, white 15–16/600, radius 8. Disabled: `disabled-bg`, text `giver-text-2`. Rendered as `<button>` or `<a>`. |
| **SecondaryButton** | White, 1px `giver-input-border`, ink text, 44–48px. |
| **TextLinkButton** | No bg/border, underline, offset 3px, 13–14px, ≥40px tall hit area. |
| **Card** | White, 1px border (theme), radius 12. |
| **Input / Select** | 40px, 1px input border, radius 8, 14px, always with a visible `<label>` (or `aria-label` where the design has none). |
| **PhotoInputCard** | Card with 64×64 thumbnail, title (14/600) + source line (12), "Change" secondary button (36px). While searching: 2px ink border + spinner (`role="img" aria-label="Searching"`). |
| **ProductTile** | Card: image area 120px tall (bg from product or neutral), then a one-line reason it appeared (11/500 text2, small ink dot, e.g. "Cozy candle", "Looks like your photo", "Inspired by {cue}"), title (13/600), seller (12, text2), price (13/600). Selected: 2px ink border + 24px ink check badge top-right. Whole tile is a `<button>`. |
| **SkeletonTile** | Same box as ProductTile, blocks use `shimmer`. |
| **SwapMiniCard** | 3-column grid. Image 70px, title 11/600, seller 11. 26px round ✕ button top-right (`aria-label="Remove this alternative"`). Removed state: dashed border placeholder "Removed · Undo" (button). |
| **NoteField** | Label "What made you think of her?" (15/650, same as every question label on screen 2), 3-row textarea, helper "She reads this first. It stays with the gift even if she swaps." |
| **NoteQuote** (recipient) | `<figure>` letter card: 32px clay quote-mark badge overlapping the top-left edge, note in `font-note` 19/28, `<figcaption>` short clay rule + giver name in clay 13/550. |
| **WhyCard** | Inside item card: `clay-wash` bg, radius 8, label "Why Quynh picked this" (12/650 clay), note 13/19. |
| **AlsoLikedTag** | Top-left on item image: clay text on clay-tint, 12/600, pill radius 12. |
| **SizePill** | 44px tall, min 64px, radius 8. Default white + gift-input border; selected ink bg white text; sold out: soldout-bg, dashed border, line-through, `disabled`. |
| **SuccessBanner** | success-tint bg, radius 12, 28px green circle with white check, title 15/650 + body 13/18, both success-text. |
| **SummaryRows** | Label (text2) left, value right; total row 650 with top divider; "Prototype estimate" chip on delivery date. |
| **BottomSheet** | Overlay absolute/fixed full screen: `overlay` color + `backdrop-filter: blur(8px)`. Sheet: white, top radius 20, handle 40×5, title 18/700, subtitle 13 gift-text-2, close 36px round button. `role="dialog"`, focus trapped, Esc and backdrop tap close. |
| **OptionRow** | In sheet: 60×60 thumb, title 14/600, seller 12; current row has 2px ink border and right label "Her pick" / "Selected" in clay. Whole row is a `<button>`. **No prices.** |
| **CreditFooter** | "Built on Shopify Catalog + UCP", 11–12px text2, centered. Giver screens only. |

Icons: inline stroke SVG (gift box, check, chevron, ✕, search, lock, refresh, external-arrow). No emoji, no icon fonts required.

## 4. Screens

### 1 · Giver — Guided setup (`/`, three full-screen steps)
Each step: header row (AppHeader brand on step 1, BackButton after) with **ProgressDots** (3) on the right; one H1 + body; one task; sticky footer with Primary "Continue".

- **1·1 Photos.** H1 "Start from something they love"; body "Show us a little of their world, and we'll match it to gifts from small shops." Empty: full-height dashed card (bow icon, "Add up to 3 photos", "Their shelf, their mug, a trip you took together"); the file picker allows multiple. With photos: 2-column grid of square thumbnails, each with a ✕ remove button and a "Photo of us" toggle pill (aria-pressed), plus an "Add another" tile until there are 3. Helper: "More photos, better read… Mark any photo of the two of you as 'Photo of us' and we'll use only the setting and what you're doing, never anyone's face or looks. Photos are read by AI to suggest gift ideas and aren't saved." Footer: Primary "Continue" (disabled until a photo) + TextLink "Skip — describe them in words instead". All photos go to the AI read in one request, which looks for the common thread; "Photo of us" photos contribute only setting, activity and objects. The look-alike catalog search uses the first photo not marked "Photo of us"; if every photo is marked, "Looks like the photo" is hidden. On matches, the photo card shows a fanned stack ("3 photos · Includes a photo of you two") and "Edit" returns to this step.
- **1·2 Occasion.** H1 "What's the occasion?"; body "Optional. It shapes the note they read first, and the matches if there's no photo." 48px input (empty by default, placeholder "A birthday, a new job, a first apartment…") + idea chips ("A birthday", "A new home", "A thank you", "A wedding", "A new baby", "Just because"; each matches an occasion profile). Footer: Primary "Continue". Below the chips: optional 2-row textarea "What do they love? · optional", placeholder "Matcha, hiking with their dog, that trip to Kyoto…", helper "Favorites, hobbies or a memory you share. It only helps find gifts and is never shown to them." It goes to the AI read with any photos (or alone) and comes back as theme chips; memories become giftable themes, not literal searches. Without an AI key, each comma-separated item becomes a chip. On screen 2 it is offered once as "Start from what you told us: '…'" to prefill an empty note; it never reaches the recipient otherwise.
- **1·3 Budget & ships-to.** H1 "Budget, and where it ships"; body "Only in-stock gifts that ship there will show." Budget as three 56px option rows ($15–$30 "A small something"; $25–$60 "Most gifts land here", default; $60–$120 "A proper present") with ink border + check when selected; LocationPicker. Footer: Primary "Find gifts from the photo" (no photo: "Find gifts") + caption "Nothing is bought until they confirm."

No search runs during setup. "Find gifts" starts the photo read and the visual search in parallel and shows 1·4.

### 1·4 · Giver — Reading the photo (`/`, transitional)
Centered: 96px photo thumbnail; H1 "Finding gifts" → "Got it" when done. Then a list of **ReadStep** rows (white card, 24px status circle: spinner while working, green check when done, grey dash on failure), appearing one after another (180ms stagger):
1. (if occasion) "Thinking about the occasion" → the profile's read, e.g. "A new place: something cozy, useful, or for the walls."
2. (if photo) "Looking at the photo" → "The photo points to space needle and seattle skyline" (or "The photo didn't point to a clear theme")
3. One row per cue: "Found: space needle"
4. "Searching independent makers" → "6 gifts from 5 makers" (or "No in-stock matches yet" / "Couldn't reach the catalog")
Caption "About ten seconds." Auto-advances to 1c ~1s after the photo read and the grid search settle. No buttons.

### 1c · Giver — Her matches (`/`)
1. BackButton (→ 1·3) + "Matches" + Prototype chip
2. PhotoInputCard (Change re-reads and re-searches in place)
3. **AnalysisCard** (photo only): title "From the photo"; one line (text2) "The photo points to space needle and seattle skyline." (with Claude: its taste read); CueChips row: **"For the occasion"** (selected by default when an occasion was given) · **"Looks like the photo"** · one chip per cue. Loading: title "Reading the photo…" + skeleton line + three skeleton chips. No clear theme: "The photo didn't point to a clear theme, so the occasion leads." — the two fixed chips still show.
4. Budget | Ships to row (changes re-search the current view immediately)
5. Section row: "Matches the occasion" / "Looks like the photo" / "Gifts for the {cue}" + right "6 gifts · 5 makers". Loading: "Finding gifts for the occasion…" etc.
6. 2-column grid of ProductTiles. The whole page scrolls (1–5 scroll away so the grid gets the full phone screen); only the footer is pinned. Locking the screen and scrolling just the grid left too small a window on phones.
7. Footer: PrimaryButton "Choose {short name}" (or disabled "Choose a gift") + CreditFooter

Behavior: "For the occasion" = the occasion profile's themed searches interleaved (the default grid). "Looks like the photo" = pure visual search (no text — text overrides the image signal; cached from the reading step). A cue chip = `"{cue} {occasion cue suffix}"`, e.g. "seattle skyline home decor". Selecting a tile updates the button label. See 1a/1b for reload and empty.

**CueChip**: 36px tall pill, 13/500. Default white + `giver-input-border`; selected ink bg, white text, leading check icon. `aria-pressed`.

### 1a · Giver — Matches reloading
Same layout. PhotoInputCard shows new photo with 2px ink border, subtitle "New photo · searching", spinner. Section title "Finding gifts that match the photo…". Grid = 4 SkeletonTiles. Footer button disabled "Choose a gift", caption "Previous selection cleared · new photo, new matches".

Triggers: new photo → immediately; budget/ships-to change → immediately; occasion text → 600ms debounce. Drop responses from stale requests.

### 1b · Giver — No matches
Filters shown as read-only chips under the photo card. Centered empty state: 64px white circle with search icon, title "Nothing matched this photo" (17/650), body "Photos of objects they own or like work best. Landscapes and people are hard to match to gifts." Actions stacked: Primary "Try a different photo", Secondary "Widen budget to $15 – $80", TextLink "Describe them in words instead" (returns to step 1 without the photo). With a cue selected: title "Nothing for the {cue} in this budget", Primary "Back to everything in the photo". CreditFooter at bottom.

### 2 · Giver — Safety net + note (`/pick/[productId]`)
1. BackButton + "Your pick"
2. Pick card, horizontal: 116px image left; right: title, "{seller}" (the catalog has no seller city — don't invent one), "{rating} ★ ({count}) · {price}", green check "Ships to {location}" / "Ships anywhere in the US"
3. Card: title "If it's not quite them, they can choose one of these" + helper "Similar, within ${min}–${max}, other makers first. Remove any you wouldn't give." (the swap check prefers other makers but falls back to the same maker when short) + up to 3 SwapMiniCards (loading: spinner line "Checking the catalog for look-alikes…"). All removed / none returned → note "One of a kind. They can confirm their gift details, but there's nothing to swap to."
4. "Who's it for?" input (placeholder "your sister, a close friend, your dad…") — fills `recipientLabel`, which Screen 6 renders ("Your sister chose…"). Required.
5. NoteField: label "What made you think of them?", helper "They read this first. It stays with the gift even if they choose another." Required.
6. "How would you like to give it?" radio cards: "Ship directly to them" (default; recipient supplies name/address) and "Give it in person" (giver enters their own address at merchant checkout). Save `deliveryMethod` when creating the gift and keep it fixed afterward, including when reopening the recipient's choice. The search location should be the recipient's city for direct shipping or the giver's city for in-person delivery; show helper copy beside that filter.
7. **Notify card**, on by default: checkbox "Email me when they choose" (checked). If this browser already has a verified email, show "We'll email {address}". Otherwise show "Your email" with "We'll send a one-tap link to confirm it's you, then only email you about this gift." Creating the link sends that verification email automatically; the giver taps it once and the confirmation email is armed. Unchecking opts out: no email is requested, and the gift is not linked to a verified session's email. Notifications can still be turned on later from the status page.
8. Sticky footer: Primary "Create gift link" + caption "Nothing is charged until they confirm." Disabled until who + note are filled, the swap check has settled, and (unless opted out) an email is entered. No sign-in requirement.
9. After creation: replace the setup form with "Your gift is ready to share", the saved delivery method, link and sharing actions, then the notify card: "One tap to turn on notifications" (link sent to {email}, Resend link, Use a different email) → "You'll be notified when they choose" once verified. Private tracking is immediately available through the creating browser's cookie. Verification is only needed for email notifications and cross-device recovery. Sharing stays usable while verification is pending; the giver can skip contact entirely. Optional contact is also available on the private status page.

After create: the footer becomes a card "Your gift link" with the URL in a read-only input, a Copy button ("Copied" for ~2s), platform actions for Text, Gmail, Instagram, and More, and a Track link (→ `/gift/[id]`). Text/Gmail open compose surfaces; Instagram copies the link and opens the DM inbox. Nothing sends automatically. Who/note lock.

### 3 · Recipient — Reveal (`/g/[id]`)
Gift theme. AppHeader ("No account needed"). Centered: 112px clay-tint circle with clay gift icon; "Quynh sent you something" (14/550 text2); Display "For your new place"; NoteQuote. Footer: Primary "Open your gift" + caption "You'll confirm a few details. About 30 seconds."

The headline uses the occasion if given ("For your new place"); fallback "A gift for you".

### 4 · Recipient — Love it or swap (`/g/[id]/open`)
1. BackButton + "Your gift from Quynh"
2. Item card: image 168px (AlsoLikedTag "{Giver} also liked" if swapped); title 17/650; "From {seller}" (not "Handmade by" — the catalog can't verify that); WhyCard "Why {Giver} picked this"
3. One card per option group from `get_product` (hidden if the product has none), e.g. "Size", "Color": SizePills; values with `exists: false` are not rendered, `available: false` renders sold out (disabled). Picking a value re-resolves the variant with `selected`; a spinner shows in the card header while stock is checked. Before options load: "Checking what's in stock…"
4. Direct shipping: card "Where should we send your gift?", required recipient full name; one street-address field with suggestions beneath it as the recipient types (no separate search field or button); optional apartment/suite/unit; row city / state / ZIP; lock icon + "Your address is saved for this gift and shared with the giver to finish checkout." Selecting a match fills street, city, state and ZIP while preserving name and unit. Support arrow keys, Enter to select and Escape to dismiss. Keep manual entry available during lookup failures and no-match results. In-person delivery: replace the entire address card with "{Giver} will give this to you in person." and "Just confirm your gift and options. No delivery address needed." Use the warm recipient tokens throughout.
5. Footer: Primary "Confirm gift and delivery" for direct shipping or "Confirm my gift" for in-person delivery → confirm; TextLinkButton "Not quite right? See {n} others {Giver} picked" (hidden if one-of-a-kind).

Delivery validation: only direct shipping requires name/address. The API uses the stored gift's delivery method, ignores recipient attempts to change it, and omits unsolicited addresses for in-person gifts. Missing delivery method on legacy gifts means direct shipping. Both paths require a chosen approved product and variant; both remain account-free.

Validation: full name and address required (inline error under field, 13px, clay), also enforced by the confirmation API. Accept single-word names. Search uses the keyless US Census geocoder after a 650ms typing pause and at least eight characters, throttled to respect the server limit. Cancel stale requests on edits, selection and blur. Census needs enough street and locality information to match; include existing city/state/ZIP when available and suggest including city or ZIP in the street query. This is debounced address matching, not a predictive partial-street provider. Its street-range matches are suggestions, not postal-deliverability verification. Recipients review the result and add unit details. Name and unit are not sent by the lookup component. Save both with the confirmation and show them in recipient and giver summaries. Existing saved gifts without a name remain readable. Variant required if options exist ("Pick one of each option."); a sold-out combination blocks with "That combination is sold out — try another."

### 4a · Recipient — Swap panel open
BottomSheet over screen 4 (blurred). Title "{Giver} also liked these", subtitle "Pick whichever feels most like you. The note comes with it." OptionRows: the original pick first (labelled "{Giver}'s pick"), then approved alternatives; the current row is labelled "Selected". Selecting a row closes the sheet, swaps the item, resets variant selection, keeps address.

### 5 · Recipient — All set (`/g/[id]/done`)
Centered: 88px success-tint circle with green check; Display "You're all set". Direct-shipping body: "Your choice and delivery details are saved. {Giver} can now finish the purchase." In-person body: "Your choice is saved. {Giver} will take it from here." Summary card (thumb, "{title} · {variant}", seller) includes recipient name/address for direct shipping or "{Giver} will give this to you in person." Clay pill "Quynh's note travels with your gift". Footer caption "You can close this page."

### 6 · Giver — She chose (`/gift/[id]`)
Both waiting and confirmed states show the saved delivery method. Direct shipping shows recipient name/address, "Copy delivery details", and explains the address must be entered at merchant checkout because it is not transferred automatically. In-person delivery shows "Ship to yourself. Enter your own shipping address at merchant checkout, then give the gift to them in person." Never ask for the giver's address in the app. Confirmation emails use the corresponding delivery instructions without including addresses. Both paths retain exactly one merchant checkout button and distinguish recipient confirmation from payment or delivery completion.

M4 implementation notes: waiting status refreshes every 10 seconds while visible. Checkout re-fetches the exact variant using saved option selections, checks USD price and explicit availability, and repeats the check on click-through. A changed price requires a fresh acceptance. Missing stock, price, variant, or HTTPS checkout URL blocks checkout with a retry. Shipping/tax and final total are calculated by the merchant; only the item subtotal is shown here. Delivery is labelled “5–8 business days · Prototype estimate”. “Completed” means merchant checkout was opened, explicitly labelled as a prototype status with payment unverified. Reopening clears the confirmation and reuses the same recipient link; choosing an alternative yourself reuses the option form and preserves the address in the current session. No message is sent automatically. Shop Pay availability is not claimed without merchant evidence.

1. AppHeader with "New gift" link
2. SuccessBanner: "Your sister chose the {short} version" (or "Your sister loved your pick") + "She picked size {M} and added her address {time} ago. Your note goes with it."
3. Card: thumb + title·variant, seller·city, rating + "Refund policy" link (from `seller.links` if present), "Your original pick: {pick}" (only if swapped). SummaryRows: Item, Shipping to {city}, Arrives {range} + "Prototype estimate" chip, Total.
4. Info card (refresh icon): "Price and stock re-checked just now. You'll pay on {merchant}'s own checkout. Nothing was charged before this step."
5. "How it got here" — 3-step mini timeline (2 green dots done, 1 ink ring next)
6. Footer: one Primary "Complete purchase at {merchant}" + external-arrow icon; merchant checkout opens in a new tab after the price/stock re-check, keeping the gift status page open. After opening, the same button becomes "Open {merchant} checkout again" and repeats the checks. Never render a second return-to-checkout button. Caption "Merchant checkout opens in a new tab." + "Built on Shopify Catalog + UCP".

Other states:
- **Waiting** (not confirmed yet): neutral card "Waiting for your sister to open the link" + Copy link again.
- **Price changed**: replace info card with warning-style card (ink text on `#FFF4E5`, border `#F0D3A6`): "Price changed from $44 to $47." Buttons: "Continue at $47" / "Ask her to choose again".
- **Sold out**: "This one sold out." Buttons: "Ask her to choose again" / "Choose an alternative yourself".

## 5. Copy voice

- Warm, short, second person. The giver is "you". On giver screens the recipient is "they/them" — never "she/her" — so the product reads right for any recipient; the demo's "sister" story lives in the occasion text and the note, not in UI chrome. On recipient screens the giver is named ("Quynh"). Screen 6 copy that says "your sister" is giver-written context, rendered from `recipientLabel`, not hardcoded.
- Swapping is never framed as rejection: "choose", "also liked", "chose the ribbed version". Never "swapped", "returned", "didn't like".
- Never show prices on recipient screens.
- Label anything faked: "Prototype estimate".

## 6. Accessibility

- Real `<button>`, `<a>`, `<input>`, `<label>`; icon-only buttons have `aria-label`.
- Text contrast ≥ 4.5:1 (tokens above are chosen to pass; don't introduce lighter greys like `#8A8A8A` for text).
- Selection never by color alone: selected tiles get border + check badge; selected pills invert.
- Bottom sheet: `role="dialog"`, `aria-modal="true"`, focus moves into the sheet and returns to the trigger on close.
- Respect `prefers-reduced-motion` for any transition (sheet slide ≤ 200ms). Decorative motion (confetti, rings) is `aria-hidden` and removed under reduced motion; state changes are never conveyed by motion alone.
