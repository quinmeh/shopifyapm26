import { mkdir, writeFile } from "node:fs/promises";
import type { ProductSnapshot } from "../lib/types";

// Use the application's HTTP routes so ownership and storage behave exactly as
// normal creation does. No recipient address, email or purchase is involved.
async function main() {
  const base = new URL(process.env.DEMO_BASE_URL || "http://localhost:3000").origin;
  const post = (path: string, body: unknown) => fetch(base + path, { method: "POST", headers: { Origin: base, "content-type": "application/json" }, body: JSON.stringify(body) });
  const search = await post("/api/search", { occasion: "First apartment in Seattle", budget: { min: 2500, max: 6000 }, region: "WA" });
  if (!search.ok) throw new Error(`Catalog search failed (${search.status}).`);
  const { products } = await search.json() as { products: ProductSnapshot[] };
  if (!products.length) throw new Error("No live catalog items available for the demo.");
  let pick: ProductSnapshot | undefined;
  for (const product of products) {
    const lookup = await fetch(`${base}/api/product/${encodeURIComponent(product.id)}`);
    if (!lookup.ok) continue;
    const result = await lookup.json();
    if (result.variant?.id && result.variant.available && result.variant.checkoutUrl) { pick = result.product; break; }
  }
  if (!pick) throw new Error("No available item could be verified. Try again later.");
  const swaps = await post("/api/swaps", { id: pick.id, priceCents: pick.priceCents, sellerName: pick.sellerName, region: "WA" });
  const approvedSwaps = swaps.ok ? (await swaps.json()).swaps : [];
  const created = await post("/api/gifts", { pick, approvedSwaps, recipientLabel: "your demo recipient", occasion: "First apartment in Seattle", note: "For the little rituals that make your new place feel like home.", deliveryMethod: process.argv.includes("--in-person") ? "give_in_person" : "ship_to_recipient" });
  if (!created.ok) throw new Error(`Demo creation failed (${created.status}).`);
  const { id } = await created.json();
  await mkdir("artifacts", { recursive: true });
  // Browser access is a credential: keep it out of logs, Git and public reports.
  await writeFile("artifacts/demo-session.json", JSON.stringify({ id, base, cookie: created.headers.get("set-cookie")?.split(";")[0] }), { mode: 0o600 });
  await writeFile("artifacts/demo.json", JSON.stringify({ id, recipientURL: `${base}/g/${id}`, product: pick, approvedSwaps }, null, 2));
  console.log(`Demo gift created with a live catalog item: ${pick.title}\nRecipient preview: ${base}/g/${id}\nPrivate test session saved locally in artifacts/demo-session.json.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
