// Cues without AI: the themes the catalog's visual search converged on.
// Counts meaningful words and adjacent pairs across matched product titles, once per
// seller; anything shared by ≥2 makers becomes a tappable cue. Pairs beat their parts
// ("space needle" over "space" + "needle"). Honest framing: these describe the matches,
// not the photo — see DESIGN.md §4 screen 1·4.

export type Cue = { label: string; query: string };

const STOP = new Set(
  `the a an and or for with of in on to from by your her his my our this that is it at as be
   gift gifts personalized personalised custom customized customised lover lovers mom dad mum
   men women womens mens him birthday christmas holiday anniversary wedding valentine valentines
   new home house idea ideas unique funny cute best perfect premium luxury handmade made usa
   inch cm oz pack size small large medium xl color colour black white pink blue red green brown
   grey gray edition original classic deluxe style design decor wall one two three flat kit bundle
   collection keepsake ornament present presents day mother mothers father fathers friend friends
   sister brother family couple couples first apartment housewarming warming moving view`.split(/\s+/),
);
// Product-type words: only used if themes alone are too thin.
const TYPES = new Set(
  `print prints art poster posters mug mugs tee shirt tshirt sweatshirt hoodie candle candles
   tumbler sign plaque frame vase planter pillow blanket towel bag tote bed shelf toy card cards
   sticker stickers keychain magnet bowl plate glass socks hat cap decal canvas`.split(/\s+/),
);

function singular(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

// Ordered, filtered tokens; a `null` marks a dropped word so pairs don't bridge across it.
function tokens(title: string): (string | null)[] {
  return title.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).map((raw) => {
    const w = singular(raw);
    return raw.length < 3 || STOP.has(raw) || STOP.has(w) ? null : w;
  });
}

function termsOf(title: string): Set<string> {
  const t = tokens(title);
  const out = new Set<string>();
  t.forEach((w, i) => {
    if (!w) return;
    out.add(w);
    const next = t[i + 1];
    if (next) out.add(`${w} ${next}`);
  });
  return out;
}

const isType = (term: string) => term.split(" ").some((w) => TYPES.has(w));

export function cuesFromTitles(items: { title: string; seller?: string }[], max = 5): { read: string | null; cues: Cue[] } {
  const sellers = new Map<string, Set<string>>(); // term → sellers that use it
  items.forEach((it, i) => {
    const seller = it.seller ?? `#${i}`;
    for (const term of termsOf(it.title)) {
      if (!sellers.has(term)) sellers.set(term, new Set());
      sellers.get(term)!.add(seller);
    }
  });

  const shared = [...sellers].map(([term, s]) => ({ term, n: s.size })).filter((x) => x.n >= 2);
  const pick = (allowTypes: boolean) => {
    const pool = shared.filter((x) => allowTypes || !isType(x.term)).sort((a, b) => b.n - a.n || a.term.localeCompare(b.term));
    const pairs = pool.filter((x) => x.term.includes(" "));
    const covered = new Set(pairs.flatMap((p) => p.term.split(" ")));
    const singles = pool.filter((x) => !x.term.includes(" ") && !covered.has(x.term));
    // Drop near-duplicates ("panorama" vs "panoramic"): same first six letters as an earlier pick.
    const out: string[] = [];
    for (const { term } of [...pairs, ...singles].sort((a, b) => b.n - a.n)) {
      const stem = term.slice(0, 6);
      if (out.some((o) => o.slice(0, 6) === stem || o.split(" ").some((w) => w.slice(0, 6) === stem))) continue;
      out.push(term);
      if (out.length === max) break;
    }
    return out;
  };

  let labels = pick(false);
  if (labels.length < 2) labels = pick(true); // too thin: allow product types
  if (labels.length < 2) return { read: null, cues: [] };

  const list = labels.length === 2 ? labels.join(" and ") : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
  return {
    read: `The matches point to ${list}.`,
    // "{label} gift" tested best: keeps proper nouns intact ("space needle gift" → souvenirs)
    // and turns common nouns into gifts for the person ("cat gift" → cat-lover mug, not a cat bed).
    cues: labels.map((label) => ({ label, query: `${label} gift` })),
  };
}
