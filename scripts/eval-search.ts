// Search test set: runs fixed occasions (and any photos in artifacts/eval-photos/) through
// /api/search and writes a scoring sheet to artifacts/search-eval.md. Score each tile
// "would you give this?" by replacing [ ] with [x], then count them.
//   npm run eval:search                         (against http://localhost:3000)
//   EVAL_BASE_URL=https://… npm run eval:search
// Read-only: no gifts are created. Photos should be JPEGs of about 1 MB or less.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

type Product = { title: string; sellerName?: string; priceCents: number; reason?: string };
type Case = { name: string; body: Record<string, unknown> };

const base = new URL(process.env.EVAL_BASE_URL || "http://localhost:3000").origin;
const budget = { min: 2500, max: 6000 };
const OCCASIONS = ["A birthday", "A new home", "A thank you", "A wedding", "A new baby", "Just because", "First apartment in Seattle", "A new job", ""];

const cases: Case[] = OCCASIONS.map((occasion) => ({
  name: occasion ? `Occasion: ${occasion}` : "No occasion",
  body: { mode: "occasion", occasion, budget, region: "WA" },
}));
const photoDir = "artifacts/eval-photos";
const photos = existsSync(photoDir) ? readdirSync(photoDir).filter((f) => /\.jpe?g$/i.test(f)).map((f) => `${photoDir}/${f}`) : [];
for (const f of [...photos, "scripts/sample.jpg"]) {
  cases.push({
    name: `Photo: ${f.split("/").pop()}`,
    body: { mode: "photo", photo: { contentType: "image/jpeg", data: readFileSync(f).toString("base64") }, occasion: "", budget, region: "WA" },
  });
}

async function main() {
  const lines = ["# Search test set", "", `${new Date().toISOString()} · ${base} · budget $25–$60 · ships to WA`, ""];
  let tiles = 0, empty = 0, failed = 0;
  for (const c of cases) {
    const started = Date.now();
    const res = await fetch(`${base}/api/search`, {
      method: "POST", headers: { Origin: base, "content-type": "application/json" }, body: JSON.stringify(c.body),
    }).catch(() => null);
    const ms = Date.now() - started;
    const j = res?.ok ? ((await res.json()) as { products: Product[]; makers: number; cues?: { label: string }[] }) : null;
    lines.push(`## ${c.name}`, "");
    if (!j) { failed++; lines.push(`Failed (${res?.status ?? "network"}) after ${ms}ms`, ""); console.log(`✗ ${c.name}`); continue; }
    if (!j.products.length) empty++;
    tiles += j.products.length;
    const cues = j.cues?.length ? ` · photo cues: ${j.cues.map((x) => x.label).join(", ")}` : "";
    lines.push(`${j.products.length} gifts · ${j.makers} makers · ${ms}ms${cues}`, "");
    lines.push("| Give? | Gift | Maker | Price | Why it's here |", "|---|---|---|---|---|");
    for (const p of j.products) {
      lines.push(`| [ ] | ${p.title.replace(/\|/g, "/").slice(0, 80)} | ${p.sellerName ?? ""} | $${(p.priceCents / 100).toFixed(2)} | ${p.reason ?? ""} |`);
    }
    lines.push("");
    console.log(`✓ ${c.name}: ${j.products.length} gifts in ${ms}ms`);
  }
  lines.splice(3, 0, `**${cases.length} cases · ${tiles} tiles · ${empty} empty · ${failed} failed.** Score: count [x] ÷ ${tiles} tiles.`, "");
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/search-eval.md", lines.join("\n"));
  console.log(`\nWrote artifacts/search-eval.md (${tiles} tiles to score).`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
