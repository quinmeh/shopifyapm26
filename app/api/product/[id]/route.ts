// get_product passthrough: snapshot + option groups + the resolved variant.
// `?for=recipient` strips every price (BRIEF §7).
// `?selected=<JSON [{name,label}]>` resolves a variant (JSON so labels may contain commas/colons).
import { getProduct, shopifyCheckoutUrl } from "@/lib/catalog";
import { stripPrice, toSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/product/[id]">) {
  const { id } = await ctx.params;
  if (!id.startsWith("gid://shopify/")) return Response.json({ error: "Invalid product id" }, { status: 400 });

  const url = new URL(req.url);
  const forRecipient = url.searchParams.get("for") === "recipient";
  let selected: { name: string; label: string }[] = [];
  try {
    const raw = url.searchParams.get("selected");
    if (raw) selected = (JSON.parse(raw) as { name?: unknown; label?: unknown }[])
      .filter((s) => typeof s.name === "string" && typeof s.label === "string")
      .map((s) => ({ name: s.name as string, label: s.label as string }));
  } catch {
    return Response.json({ error: "selected must be JSON" }, { status: 400 });
  }

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
          ...(forRecipient ? {} : { priceCents: v.price?.amount, checkoutUrl: shopifyCheckoutUrl(v) }),
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
