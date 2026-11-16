# DESIGN.md: Gift Confirm

> Visual reference: the "Gift Confirm — Prototype Mockups (Polaris)" canvas (9 screens).
> This file is the source of truth for tokens, components, copy and states. When the canvas and this
> file disagree, this file wins.

## 1. Principles

1. **The giver chooses the thought; the recipient finishes the details.** Every screen should make it obvious who owns the choice.
2. **Two moods, one system.** Giver screens are a decision tool (Polaris grey, neutral). Recipient screens are opening a present (warm paper, clay accent). Same type, spacing, components and ink buttons on both.
3. **Clarity over effects.** Flat surfaces. No gradients, no shadows. The only blur in the app is behind the swap panel.
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

Font: **Inter** (Google Fonts, weights 400/500/600/700).

| Role | Size / line-height | Weight |
|---|---|---|
| Display (reveal, done) | 28–30 / 34–36, letter-spacing −0.4px | 700 |
| H1 (giver page title) | 24 / 30, letter-spacing −0.4px | 700 |
| Section title | 14–16 / 20 | 650 (use 600 if variable font unavailable) |
| Item title | 15–17 / 19–22 | 650 |
| Body | 14 / 20 | 400 |
| Note quote | 16 / 25 | 400 |
| Small / meta | 12–13 / 17–18 | 400–500 |
| Minimum anywhere | 11px, and only for non-essential captions | |

Numbers in prices/totals: `font-variant-numeric: tabular-nums`.

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
| **AppHeader** | 28×28 ink square (radius 8) with white gift-box stroke icon + "Gift Confirm" (15/650). Right side varies: "Prototype" chip (giver), "No account needed" (recipient), "New gift" link (status). |
| **BackButton** | 36×36, white, 1px border, radius 8, chevron-left icon, `aria-label="Back"`. |
| **PrimaryButton** | Full width, 48–52px, ink bg, white 15–16/600, radius 8. Disabled: `disabled-bg`, text `giver-text-2`. Rendered as `<button>` or `<a>`. |
| **SecondaryButton** | White, 1px `giver-input-border`, ink text, 44–48px. |
| **TextLinkButton** | No bg/border, underline, offset 3px, 13–14px, ≥40px tall hit area. |
| **Card** | White, 1px border (theme), radius 12. |
| **Input / Select** | 40px, 1px input border, radius 8, 14px, always with a visible `<label>` (or `aria-label` where the design has none). |
| **PhotoInputCard** | Card with 64×64 thumbnail, title (14/600) + source line (12), "Change" secondary button (36px). While searching: 2px ink border + spinner (`role="img" aria-label="Searching"`). |
| **ProductTile** | Card: image area 104px tall (bg from product or neutral), then title (13/600), seller (12, text2), price (13/600). Selected: 2px ink border + 24px ink check badge top-right. Whole tile is a `<button>`. |
| **SkeletonTile** | Same box as ProductTile, blocks in `skeleton` / `#F1F1F1`. No shimmer animation needed. |
| **SwapMiniCard** | 3-column grid. Image 70px, title 11/600, seller 11. 26px round ✕ button top-right (`aria-label="Remove this alternative"`). Removed state: dashed border placeholder "Removed · Undo" (button). |
| **NoteField** | Label "What made you think of her?" (14/650), 3-row textarea, helper "She reads this first. It stays with the gift even if she swaps." |
| **NoteQuote** (recipient) | `<figure>` card, 18×20 padding, quote 16/25, `<figcaption>` "— Quynh" in clay 13/550. |
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

- **1·1 Photo.** H1 "Start from something they love"; body "A photo of their taste finds real gifts from independent makers. Their windowsill, their mug, their bookshelf." Full-height dashed upload card (gift icon, "Add a photo", "From your camera roll or a screenshot"); once chosen it fills with the photo (2px ink border) and a "{title} · Change" caption. Footer: Primary "Continue" (disabled until a photo) + TextLink "Skip — describe them in words instead".
- **1·2 Occasion.** H1 "What's the occasion?"; body "Optional. It shapes the note they read first, and the matches if there's no photo." 48px input (default "First apartment in Seattle") + idea chips ("First apartment in Seattle", "A birthday", "Just because"). Footer: Primary "Continue".
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
6. 2-column grid of ProductTiles — **the only region that scrolls**. The screen is locked to the viewport; 1–5 and the footer stay fixed.
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
3. Card: title "If it's not quite them, they can choose one of these" + helper "Similar, within ${min}–${max}, other makers first. Remove any you wouldn't give." (the swap check prefers other makers but falls back to the same maker when short) + up to 3 SwapMiniCards (loading: spinner line "Checking the catalog for look-alikes…"). All removed / none returned → note "One of a kind. They can confirm details and address, but there's nothing to swap to."
4. "Who's it for?" input (placeholder "your sister, a close friend, your dad…") — fills `recipientLabel`, which Screen 6 renders ("Your sister chose…"). Required.
5. NoteField: label "What made you think of them?", helper "They read this first. It stays with the gift even if they choose another." Required.
6. Sticky footer: row [Secondary "Preview" (1/3)] [Primary "Create gift link" (2/3)] + caption "Nothing is charged until they confirm." Both disabled until who + note are filled and the swap check has settled. Preview creates the gift (once) and opens `/g/[id]` in a new tab.

After create: the footer becomes a card "Your gift link" with the URL in a read-only input, a Copy button ("Copied" for ~2s), platform actions for Text, Gmail, Instagram, and More, and a Track link (→ `/gift/[id]`). Text/Gmail open compose surfaces; Instagram copies the link and opens the DM inbox. Nothing sends automatically. Who/note lock.

### 3 · Recipient — Reveal (`/g/[id]`)
Gift theme. AppHeader ("No account needed"). Centered: 112px clay-tint circle with clay gift icon; "Quynh sent you something" (14/550 text2); Display "For your new place"; NoteQuote. Footer: Primary "Open your gift" + caption "You'll confirm a few details. About 30 seconds."

The headline uses the occasion if given ("For your new place"); fallback "A gift for you".

### 4 · Recipient — Love it or swap (`/g/[id]/open`)
1. BackButton + "Your gift from Quynh"
2. Item card: image 168px (AlsoLikedTag "{Giver} also liked" if swapped); title 17/650; "From {seller}" (not "Handmade by" — the catalog can't verify that); WhyCard "Why {Giver} picked this"
3. One card per option group from `get_product` (hidden if the product has none), e.g. "Size", "Color": SizePills; values with `exists: false` are not rendered, `available: false` renders sold out (disabled). Picking a value re-resolves the variant with `selected`; a spinner shows in the card header while stock is checked. Before options load: "Checking what's in stock…"
4. Card "Where should it go?": street; row city / state / ZIP; lock icon + "Your address goes only to the shop."
5. Footer: Primary "Love it — send it to me" → confirm; TextLinkButton "Not quite right? See {n} others {Giver} picked" (hidden if one-of-a-kind)

Validation: address required (inline error under field, 13px, clay). Variant required if options exist ("Pick one of each option."); a sold-out combination blocks with "That combination is sold out — try another."

### 4a · Recipient — Swap panel open
BottomSheet over screen 4 (blurred). Title "{Giver} also liked these", subtitle "Pick whichever feels most like you. The note comes with it." OptionRows: the original pick first (labelled "{Giver}'s pick"), then approved alternatives; the current row is labelled "Selected". Selecting a row closes the sheet, swaps the item, resets variant selection, keeps address.

### 5 · Recipient — All set (`/g/[id]/done`)
Centered: 88px success-tint circle with green check; Display "You're all set"; body "Quynh will finish sending it. You'll get the tracking link from the shop." Summary card (thumb, "{title} · {variant}", seller, "To {street}, {city}"). Clay pill "Quynh's note travels with your gift". Footer caption "You can close this page."

### 6 · Giver — She chose (`/gift/[id]`)
1. AppHeader with "New gift" link
2. SuccessBanner: "Your sister chose the {short} version" (or "Your sister loved your pick") + "She picked size {M} and added her address {time} ago. Your note goes with it."
3. Card: thumb + title·variant, seller·city, rating + "Refund policy" link (from `seller.links` if present), "Your original pick: {pick}" (only if swapped). SummaryRows: Item, Shipping to {city}, Arrives {range} + "Prototype estimate" chip, Total.
4. Info card (refresh icon): "Price and stock re-checked just now. You'll pay on {merchant}'s own checkout. Nothing was charged before this step."
5. "How it got here" — 3-step mini timeline (2 green dots done, 1 ink ring next)
6. Footer: Primary "Complete purchase at {merchant}" + external-arrow icon; caption "Merchant checkout · Shop Pay available · Built on Shopify Catalog + UCP"

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
- Respect `prefers-reduced-motion` for any transition (sheet slide ≤ 200ms).
