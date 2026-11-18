// Milestone 0 probe (BRIEF §8). Run: npm run probe
// 1) photo search on scripts/sample.jpg  2) text search  3) swap check on result #1
// 4) get_product on result #1. Prints titles, prices, sellers, option names, image URLs, timings.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getProduct,
  productImageUrl,
  productPriceCents,
  productSeller,
  searchCatalog,
  formatCents,
  type CatalogProduct,
  type SearchArgs,
} from "../lib/catalog";

const SHIPS_TO = { country: "US", region: "WA" };
const BUDGET = { min: 2500, max: 6000 }; // $25–$60 default
const CONTEXT = { address_country: "US", intent: "buying a gift" };

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now();
  const out = await fn();
  console.log(`⏱  ${label}: ${Date.now() - t}ms`);
  return out;
}

function printProducts(label: string, products: CatalogProduct[]) {
  const sellers = new Set(products.map((p) => productSeller(p)?.name).filter(Boolean));
  console.log(`\n=== ${label}: ${products.length} products · ${sellers.size} sellers named ===`);
  for (const p of products) {
    console.log(
      `- ${p.title}\n    ${formatCents(productPriceCents(p))}  seller=${productSeller(p)?.name ?? "(variant-level only)"}  rating=${p.rating?.value ?? "-"} (${p.rating?.count ?? 0})\n    id=${p.id}\n    image=${productImageUrl(p) ?? "-"}`,
    );
  }
}

async function main() {
  // 1. Photo search (hero path)
  const samplePath = resolve(__dirname, "sample.jpg");
  let photoProducts: CatalogProduct[] = [];
  if (existsSync(samplePath)) {
    const data = readFileSync(samplePath).toString("base64");
    const args: SearchArgs = {
      query: "Her first apartment in Seattle",
      like: [{ image: { content_type: "image/jpeg", data } }],
      context: CONTEXT,
      filters: { ships_to: SHIPS_TO, price: BUDGET, rating: { variant: { min: 4, min_count: 5 } } },
      pagination: { limit: 6 },
    };
    const photo = await timed("photo search", () => searchCatalog(args));
    photoProducts = photo.products;
    printProducts("Photo search (scripts/sample.jpg)", photoProducts);
    if (photo.messages?.length) console.log("messages:", JSON.stringify(photo.messages));
  } else {
    console.log("\n=== Photo search: SKIPPED — add scripts/sample.jpg and re-run ===");
  }

  // 2. Text search (fallback path)
  const text = await timed("text search", () =>
    searchCatalog({
      query: "Her first apartment in Seattle",
      context: CONTEXT,
      filters: { ships_to: SHIPS_TO, price: BUDGET, rating: { variant: { min: 4, min_count: 5 } } },
      pagination: { limit: 6 },
    }),
  );
  printProducts("Text search", text.products);
  if (text.messages?.length) console.log("messages:", JSON.stringify(text.messages));

  const pick = photoProducts[0] ?? text.products[0];
  if (!pick) throw new Error("No products returned — cannot continue probe");
  const base = productPriceCents(pick) ?? 4000;

  // 3. Swap check on result #1
  const swaps = await timed("swap check", () =>
    searchCatalog({
      like: [{ id: pick.id }],
      filters: { ships_to: SHIPS_TO, price: { min: Math.round(base * 0.85), max: Math.round(base * 1.15) } },
      pagination: { limit: 6 },
    }),
  );
  printProducts(
    `Swap check for "${pick.title}" (±15% of ${formatCents(base)}, pick removed)`,
    swaps.products.filter((p) => p.id !== pick.id),
  );

  // 4. get_product on result #1
  const full = await timed("get_product", () => getProduct({ id: pick.id }));
  console.log(`\n=== get_product: ${full?.title} ===`);
  console.log("option names:", (full?.options ?? []).map((o) => `${o.name} (${o.values?.length ?? 0} values)`));
  for (const o of full?.options ?? []) {
    console.log(
      `  ${o.name}:`,
      (o.values ?? []).map((v) => `${v.label}${v.available === false ? " [sold out]" : ""}${v.exists === false ? " [n/a]" : ""}`).join(", "),
    );
  }
  const v = full?.variants?.[0];
  console.log("resolved variant:", {
    id: v?.id,
    title: v?.title,
    price: formatCents(v?.price?.amount),
    available: v?.availability?.available,
    seller: v?.seller?.name,
    refundPolicy: v?.seller?.links?.find((l) => l.type === "refund_policy")?.url ?? "-",
    checkout_url: v?.checkout_url ? "present" : "MISSING",
  });
}

main().catch((e) => {
  console.error("\nPROBE FAILED:", e.message, e.detail ?? "");
  process.exit(1);
});
