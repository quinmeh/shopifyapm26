// Occasion → gift themes. The occasion leads the search (BRIEF §3); the photo adds flavor.
// Each profile is a few catalog text queries that tested well (Nov 2026), a one-line read for
// the reading screen, and the suffix used when a photo cue is blended in ("seattle skyline"
// + "home decor" → prints and tiles, not tourist ornaments).

// `headline` is the recipient's reveal-screen display line (DESIGN §4 screen 3).
// `themes[i]` is the short, human label for `queries[i]`, shown on tiles as the match reason.
export type OccasionProfile = { key: string; label: string; read: string; headline: string; queries: string[]; themes: string[]; cueSuffix: string };

const PROFILES: (OccasionProfile & { test: RegExp })[] = [
  {
    key: "home",
    label: "New home",
    test: /apartment|new home|new place|house|housewarming|moving|moved|\bflat\b|condo|nest|studio/i,
    read: "A new place: something cozy, useful, or for the walls.",
    headline: "For your new place",
    queries: ["housewarming gift for a new apartment", "cozy candle housewarming gift", "small indoor plant gift new home", "soft throw blanket cozy home"],
    themes: ["Housewarming", "Cozy candle", "Indoor plant", "Throw blanket"],
    cueSuffix: "home decor",
  },
  {
    key: "couple",
    label: "Wedding",
    test: /wedding|married|marriage|engage|anniversary|newlywed/i,
    read: "For a couple: something for the home they share.",
    headline: "For the two of you",
    queries: ["wedding gift for couple", "anniversary gift for couple home", "personalized couple keepsake"],
    themes: ["Wedding gift", "For their home", "Couple keepsake"],
    cueSuffix: "home decor",
  },
  {
    key: "baby",
    label: "New baby",
    test: /baby|newborn|shower|pregnan|expecting/i,
    read: "A new baby: soft, safe, and actually useful.",
    headline: "For the new arrival",
    queries: ["new baby gift set", "newborn keepsake gift", "baby shower gift"],
    themes: ["Baby gift set", "Newborn keepsake", "Baby shower"],
    cueSuffix: "nursery decor",
  },
  {
    key: "birthday",
    label: "Birthday",
    test: /birthday|bday|turning \d/i,
    read: "A birthday: something personal they'd keep.",
    headline: "Happy birthday",
    queries: ["thoughtful birthday gift", "unique birthday keepsake gift", "birthday self care gift set"],
    themes: ["Birthday gift", "Keepsake", "Self-care"],
    cueSuffix: "gift",
  },
  {
    key: "thanks",
    label: "Thank you",
    test: /thank|grateful|appreciat/i,
    read: "A thank-you: small, warm, no fuss.",
    headline: "A thank-you",
    queries: ["thank you gift", "small appreciation gift box", "thoughtful thank you treat"],
    themes: ["Thank-you gift", "Small gift box", "A treat"],
    cueSuffix: "gift",
  },
  {
    key: "milestone",
    label: "Milestone",
    test: /graduat|\bgrad\b|diploma|promotion|new job|retire/i,
    read: "A milestone: something that marks it.",
    headline: "For the milestone",
    queries: ["graduation gift keepsake", "new job congratulations gift", "milestone celebration gift"],
    themes: ["Graduation keepsake", "New job", "Celebration"],
    cueSuffix: "gift",
  },
  {
    key: "comfort",
    label: "Just because",
    test: /just because|no reason|miss you|cheer|rough|get well|feel better|hard time|sick/i,
    read: "Just because: a small comfort.",
    headline: "A little something",
    queries: ["cozy self care gift box", "thoughtful small gift just because", "comfort care package"],
    themes: ["Self-care box", "Small gift", "Care package"],
    cueSuffix: "gift",
  },
];

export function occasionProfile(occasion: string): OccasionProfile {
  const text = occasion.trim();
  const hit = PROFILES.find((p) => p.test.test(text));
  if (hit) { const { test: _t, ...profile } = hit; void _t; return profile; }
  if (!text) return { key: "general", label: "Thoughtful", read: "No occasion: just something thoughtful.", headline: "A gift for you", queries: ["thoughtful gift", "unique handmade gift"], themes: ["Thoughtful gift", "Handmade"], cueSuffix: "gift" };
  const short = text.length > 24 ? `${text.slice(0, 23)}…` : text;
  return { key: "general", label: short, read: `For "${text}": something thoughtful.`, headline: "A gift for you", queries: [`${text} gift`, "thoughtful gift"], themes: [`For ${short.toLowerCase()}`, "Thoughtful gift"], cueSuffix: "gift" };
}
