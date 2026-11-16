// Cues without AI: the themes the catalog's visual search converged on.
// Counts meaningful words across the matched product titles (once per product);
// words shared by ≥2 products become tappable cues. Honest framing: these
// describe the matches, not the photo — see DESIGN.md §4 screen 1·4.

export type Cue = { label: string; query: string };

const STOP = new Set(
  `the a an and or for with of in on to from by your her his my our this that is it at as be
   gift gifts personalized personalised custom customized customised lover lovers mom dad mum
   men women womens mens him birthday christmas holiday anniversary wedding valentine valentines
   new home house idea ideas unique funny cute best perfect premium luxury handmade made usa
   inch cm oz pack size small large medium xl color colour black white pink blue red green brown
   grey gray edition original classic deluxe style design decor wall one two three flat kit bundle
   collection keepsake ornament present presents day mother mothers father fathers friend friends
   sister brother family couple couples first apartment housewarming warming moving`.split(/\s+/),
);
// Product-type words: only used if themes alone are too thin.
const TYPES = new Set(
  `print prints art poster posters mug mugs tee shirt tshirt sweatshirt hoodie candle candles
   tumbler sign plaque frame vase planter pillow blanket towel bag tote bed shelf toy card cards
   sticker stickers keychain magnet bowl plate glass socks hat cap`.split(/\s+/),
);

function singular(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function wordsOf(title: string): Set<string> {
  const out = new Set<string>();
  for (const raw of title.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)) {
    if (raw.length < 3) continue;
    const w = singular(raw);
    if (STOP.has(raw) || STOP.has(w)) continue;
    out.add(w);
  }
  return out;
}

// A theme must recur across ≥2 different makers — one seller's product line
// ("The Lookout Deluxe", "The Lookout Classic") is a name, not a theme.
export function cuesFromTitles(items: { title: string; seller?: string }[], max = 5): { read: string | null; cues: Cue[] } {
  const bySeller = new Map<string, Set<string>>(); // word → sellers that use it
  items.forEach((it, i) => {
    const seller = it.seller ?? `#${i}`;
    for (const w of wordsOf(it.title)) {
      if (!bySeller.has(w)) bySeller.set(w, new Set());
      bySeller.get(w)!.add(seller);
    }
  });
  const counts = new Map([...bySeller].map(([w, s]) => [w, s.size]));

  const ranked = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  let picks = ranked.filter(([w]) => !TYPES.has(w)).slice(0, max);
  if (picks.length < 2) picks = ranked.slice(0, max); // too thin: allow product types

  if (picks.length < 2) return { read: null, cues: [] };
  const labels = picks.map(([w]) => w);
  const list = labels.length === 2 ? labels.join(" and ") : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
  return {
    read: `The matches point to ${list}.`,
    cues: labels.map((w) => ({ label: w, query: `${w} themed gift` })),
  };
}
