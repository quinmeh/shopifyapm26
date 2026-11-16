// Occasion → gift themes. The occasion leads the search (BRIEF §3); the photo adds flavor.
// Each profile is a few catalog text queries that tested well (Nov 2026), a one-line read for
// the reading screen, and the suffix used when a photo cue is blended in ("seattle skyline"
// + "home decor" → prints and tiles, not tourist ornaments).

export type OccasionProfile = { key: string; read: string; queries: string[]; cueSuffix: string };

const PROFILES: (Omit<OccasionProfile, "read"> & { test: RegExp; read: string })[] = [
  {
    key: "home",
    test: /apartment|new home|new place|house|housewarming|moving|moved|\bflat\b|condo|nest|studio/i,
    read: "A new place: something cozy, useful, or for the walls.",
    queries: ["housewarming gift for a new apartment", "cozy candle housewarming gift", "small indoor plant gift new home", "soft throw blanket cozy home"],
    cueSuffix: "home decor",
  },
  {
    key: "couple",
    test: /wedding|married|marriage|engage|anniversary|newlywed/i,
    read: "For a couple: something for the home they share.",
    queries: ["wedding gift for couple", "anniversary gift for couple home", "personalized couple keepsake"],
    cueSuffix: "home decor",
  },
  {
    key: "baby",
    test: /baby|newborn|shower|pregnan|expecting/i,
    read: "A new baby: soft, safe, and actually useful.",
    queries: ["new baby gift set", "newborn keepsake gift", "baby shower gift"],
    cueSuffix: "nursery decor",
  },
  {
    key: "birthday",
    test: /birthday|bday|turning \d/i,
    read: "A birthday: something personal they'd keep.",
    queries: ["thoughtful birthday gift", "unique birthday keepsake gift", "birthday self care gift set"],
    cueSuffix: "gift",
  },
  {
    key: "thanks",
    test: /thank|grateful|appreciat/i,
    read: "A thank-you: small, warm, no fuss.",
    queries: ["thank you gift", "small appreciation gift box", "thoughtful thank you treat"],
    cueSuffix: "gift",
  },
  {
    key: "milestone",
    test: /graduat|\bgrad\b|diploma|promotion|new job|retire/i,
    read: "A milestone: something that marks it.",
    queries: ["graduation gift keepsake", "new job congratulations gift", "milestone celebration gift"],
    cueSuffix: "gift",
  },
  {
    key: "comfort",
    test: /just because|no reason|miss you|cheer|rough|get well|feel better|hard time|sick/i,
    read: "Just because: a small comfort.",
    queries: ["cozy self care gift box", "thoughtful small gift just because", "comfort care package"],
    cueSuffix: "gift",
  },
];

export function occasionProfile(occasion: string): OccasionProfile {
  const text = occasion.trim();
  const hit = PROFILES.find((p) => p.test.test(text));
  if (hit) return { key: hit.key, read: hit.read, queries: hit.queries, cueSuffix: hit.cueSuffix };
  if (!text) return { key: "general", read: "No occasion: just something thoughtful.", queries: ["thoughtful gift", "unique handmade gift"], cueSuffix: "gift" };
  return { key: "general", read: `For "${text}": something thoughtful.`, queries: [`${text} gift`, "thoughtful gift"], cueSuffix: "gift" };
}
