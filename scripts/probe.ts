// Milestone 0 probe. Run: npm run probe
// Exercises text search, photo search (scripts/sample.jpg, optional), swap check,
// get_product, and lookup_catalog against the real Shopify Global Catalog.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getProduct,
  lookupCatalog,
  productPriceCents,
  productSeller,
  productUrl,
  searchCatalog,
  formatCents,
  type CatalogProduct,
} from "../lib/catalog";

const US = { ships_to: { country: "US" } };

function printProducts(label: string, products: CatalogProduct[]) {
  console.log(`\n=== ${label}: ${products.length} products ===`);
  for (const p of products) {
    console.log(
      `- ${p.title}\n    ${formatCents(productPriceCents(p))}  seller=${productSeller(p)?.name ?? "?"}  rating=${p.rating?.value ?? "-"}(${p.rating?.count ?? 0})\n    id=${p.id}\n    url=${productUrl(p) ?? "-"}`,
    );
  }
}

async function main() {
  // 1. Text search
  const text = await searchCatalog({
    query: "housewarming gift for a new apartment",
    context: { address_country: "US", intent: "buying a gift" },
    filters: { ...US, price: { min: 2000, max: 8000 }, rating: { variant: { min: 4, min_count: 5 } } },
    pagination: { limit: 6 },
  });
  printProducts("Text search", text.products);
  if (text.messages?.length) console.log("messages:", JSON.stringify(text.messages));

  // 2. Photo search (optional — needs scripts/sample.jpg)
  const samplePath = resolve(__dirname, "sample.jpg");
  let photoProducts: CatalogProduct[] = [];
  if (existsSync(samplePath)) {
    const data = readFileSync(samplePath).toString("base64");
    const photo = await searchCatalog({
      query: "gift",
      like: [{ image: { content_type: "image/jpeg", data } }],
      context: { address_country: "US", intent: "buying a gift" },
      filters: { ...US, price: { min: 2000, max: 8000 } },
      pagination: { limit: 6 },
    });
    photoProducts = photo.products;
    printProducts("Photo search (scripts/sample.jpg)", photoProducts);
    if (photo.messages?.length) console.log("messages:", JSON.stringify(photo.messages));
  } else {
    console.log("\n=== Photo search: SKIPPED (add scripts/sample.jpg to test) ===");
  }

  const pick = photoProducts[0] ?? text.products[0];
  if (!pick) throw new Error("No products returned — cannot continue probe");
  const base = productPriceCents(pick) ?? 5000;

  // 3. Swap check
  const swaps = await searchCatalog({
    like: [{ id: pick.id }],
    filters: { ...US, price: { min: Math.round(base * 0.85), max: Math.round(base * 1.15) } },
    pagination: { limit: 5 },
  });
  printProducts(`Swap check for "${pick.title}" (±15% of ${formatCents(base)})`, swaps.products.filter((p) => p.id !== pick.id));

  // 4. get_product (variants/options for the recipient page)
  const full = await getProduct({ id: pick.id });
  console.log(`\n=== get_product: ${full?.title} ===`);
  console.log("options:", JSON.stringify(full?.options ?? [], null, 1));
  console.log(
    "variants:",
    (full?.variants ?? []).slice(0, 5).map((v) => ({
      id: v.id,
      title: v.title,
      price: v.price?.amount,
      available: v.availability?.available,
      seller: v.seller?.name,
      checkout_url: v.checkout_url ? "yes" : "no",
    })),
  );

  // 5. lookup_catalog on the pick's URL (search results carry no variants, so
  // the URL comes from get_product's resolved variant)
  const pickUrl = full ? productUrl(full) : undefined;
  if (pickUrl) {
    const looked = await lookupCatalog([pickUrl.split("?")[0]]);
    printProducts(`lookup_catalog(${pickUrl.split("?")[0]})`, looked.products);
    if (looked.messages?.length) console.log("messages:", JSON.stringify(looked.messages));
  }

  // Dump one raw product so we can see the real field shapes.
  console.log("\n=== RAW first product (truncated) ===");
  console.log(JSON.stringify(text.products[0], null, 1).slice(0, 3000));
}

main().catch((e) => {
  console.error("\nPROBE FAILED:", e.message, e.detail ?? "");
  process.exit(1);
});
