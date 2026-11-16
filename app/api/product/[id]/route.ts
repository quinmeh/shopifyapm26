// get_product passthrough: snapshot + option groups + the resolved variant.
// `?for=recipient` strips every price (BRIEF §7). `?selected=Size:M,Color:Black` resolves a variant.
import { getProduct } from "@/lib/catalog";
import { stripPrice, toSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/product/[id]">) {
  const { id } = await ctx.params;
  if (!id.startsWith("gid://shopify/")) return Response.json({ error: "Invalid product id" }, { status: 400 });

  const url = new URL(req.url);
  const forRecipient = url.searchParams.get("for") === "recipient";
  const selected = (url.searchParams.get("selected") ?? "")
    .split(",")
    .filter(Boolean)
    .map((pair) => {
      const [name, label] = pair.split(":");
      return { name, label };
    })
    .filter((s) => s.name && s.label);

  try {
    const p = await getProduct(selected.length ? { id, selected } : { id });
    if (!p) return Response.json({ error: "Not found" }, { status: 404 });

    const snapshot = toSnapshot(p);
    const v = p.variants?.[0];
    const variant = v
      ? {
          id: v.id,
          title: v.title,
          available: v.availability?.available ?? true,
          options: v.options ?? [],
          ...(forRecipient ? {} : { priceCents: v.price?.amount, checkoutUrl: v.checkout_url }),
        }
      : null;

    return Response.json({
      product: forRecipient ? stripPrice(snapshot) : snapshot,
      options: p.options ?? [],
      variant,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[api/product] failed:", (e as Error).message);
    return Response.json({ error: "Product lookup failed." }, { status: 502 });
  }
}
