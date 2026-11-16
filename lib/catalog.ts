// Shopify Global Catalog client (UCP / MCP, JSON-RPC 2.0).
// Server-side only — never import this from a client component.
// See docs/BRIEF.md §5.

const ENDPOINT = "https://catalog.shopify.com/api/ucp/mcp";
const DEFAULT_PROFILE =
  "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json";

// ---- Response shapes (only the fields we read; everything else is optional/unknown) ----

export type CatalogMedia = { url?: string; alt?: string; type?: string };
export type CatalogSeller = {
  name?: string;
  url?: string;
  links?: { type?: string; name?: string; url?: string }[];
};
export type CatalogOption = {
  name: string;
  values?: { label: string; available?: boolean; exists?: boolean }[];
};
export type CatalogVariant = {
  id?: string;
  title?: string;
  price?: { amount?: number; currency?: string };
  url?: string;
  checkout_url?: string;
  availability?: { available?: boolean };
  options?: { name: string; label: string }[];
  seller?: CatalogSeller;
  media?: CatalogMedia[];
};
// NOTE (verified Nov 2026): `url`, `seller`, `checkout_url` and `availability`
// live on variants, not the product. Use productSeller()/productUrl() below.
export type CatalogProduct = {
  id: string;
  title?: string;
  description?: { plain?: string } | string;
  media?: CatalogMedia[];
  options?: CatalogOption[];
  price_range?: {
    min?: { amount?: number; currency?: string };
    max?: { amount?: number; currency?: string };
  };
  rating?: { value?: number; count?: number };
  variants?: CatalogVariant[]; // get_product returns only the resolved variant
  selected?: { name: string; label: string }[];
};
export type CatalogMessage = { code?: string; message?: string; id?: string };

export type SearchResult = {
  products: CatalogProduct[];
  messages?: CatalogMessage[];
  pagination?: unknown;
  raw: unknown;
};

// ---- Request shapes ----

export type LikeInput =
  | { id: string }
  | { image: { content_type: string; data: string } };

export type SearchArgs = {
  query?: string;
  like?: LikeInput[];
  context?: { address_country?: string; intent?: string };
  filters?: {
    ships_to?: { country: string; region?: string };
    price?: { min?: number; max?: number }; // minor units (cents)
    rating?: { variant?: { min?: number; min_count?: number } };
  };
  pagination?: { limit?: number; cursor?: string };
};

export type GetProductArgs = {
  id: string;
  selected?: { name: string; label: string }[];
};

export class CatalogError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

// ---- Transport ----

// Rate limit is 5 req/s shared across all tools. Serialize calls through one
// promise chain and space them ≥ 220ms apart.
let chain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;
const MIN_GAP_MS = 220;
let rpcId = 0;

function parseBody(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed);
  // SSE: take the last `data:` line that parses as JSON.
  let last: unknown = undefined;
  for (const line of trimmed.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    try {
      last = JSON.parse(payload);
    } catch {
      /* ignore partial lines */
    }
  }
  if (last === undefined) throw new CatalogError(`Unparseable catalog response: ${trimmed.slice(0, 200)}`);
  return last;
}

async function rawCall(tool: string, args: Record<string, unknown>, attempt = 0): Promise<unknown> {
  const wait = Math.max(0, lastCallAt + MIN_GAP_MS - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();

  const body = {
    jsonrpc: "2.0",
    id: ++rpcId,
    method: "tools/call",
    params: {
      name: tool,
      arguments: {
        catalog: args,
        meta: { "ucp-agent": { profile: process.env.UCP_PROFILE_URL || DEFAULT_PROFILE } },
      },
    },
  };

  const started = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (res.status === 429 && attempt < 3) {
    const retryAfter = Number(res.headers.get("retry-after")) || 1;
    console.warn(`[catalog] ${tool} 429 — retrying in ${retryAfter}s`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return rawCall(tool, args, attempt + 1);
  }

  const text = await res.text();
  if (!res.ok) throw new CatalogError(`${tool} HTTP ${res.status}`, res.status, text.slice(0, 500));

  const json = parseBody(text) as {
    result?: { structuredContent?: unknown; isError?: boolean; content?: unknown };
    error?: { code?: number; message?: string; data?: unknown };
  };
  if (json.error) throw new CatalogError(`${tool} RPC error: ${json.error.message}`, res.status, json.error);
  if (json.result?.isError) {
    throw new CatalogError(`${tool} tool error`, res.status, json.result.content ?? json.result);
  }
  console.log(`[catalog] ${tool} ok in ${Date.now() - started}ms`);
  return json.result?.structuredContent ?? json.result;
}

function call(tool: string, args: Record<string, unknown>): Promise<unknown> {
  const p = chain.then(() => rawCall(tool, args));
  chain = p.catch(() => {}); // keep the chain alive after failures
  return p;
}

// ---- Logging helper (brief §9: log every request/response summary) ----

function summarizeArgs(args: Record<string, unknown>): string {
  return JSON.stringify(args, (k, v) =>
    k === "data" && typeof v === "string" ? `<base64 ${v.length} chars>` : v,
  );
}

function summarizeProducts(ps: CatalogProduct[]): string {
  return ps
    .slice(0, 6)
    .map((p) => `${p.title ?? "?"} (${productPriceCents(p) ?? "?"}¢, ${productSeller(p)?.name ?? "?"})`)
    .join(" | ");
}

// ---- Public tools ----

function toSearchResult(raw: unknown): SearchResult {
  const r = (raw ?? {}) as { products?: CatalogProduct[]; messages?: CatalogMessage[]; pagination?: unknown };
  return { products: r.products ?? [], messages: r.messages, pagination: r.pagination, raw };
}

export async function searchCatalog(args: SearchArgs): Promise<SearchResult> {
  console.log(`[catalog] search_catalog → ${summarizeArgs(args)}`);
  let raw: unknown;
  try {
    raw = await call("search_catalog", args);
  } catch (e) {
    // Brief §5: if the rating filter shape is rejected, drop it and continue.
    if (args.filters?.rating) {
      console.warn("[catalog] search_catalog failed with rating filter; retrying without it:", (e as Error).message);
      const { rating: _drop, ...rest } = args.filters;
      void _drop;
      raw = await call("search_catalog", { ...args, filters: rest });
    } else {
      throw e;
    }
  }
  const out = toSearchResult(raw);
  console.log(`[catalog] search_catalog ← ${out.products.length} products: ${summarizeProducts(out.products)}`);
  return out;
}

export async function getProduct(args: GetProductArgs): Promise<CatalogProduct | null> {
  console.log(`[catalog] get_product → ${summarizeArgs(args)}`);
  const raw = (await call("get_product", args)) as
    | { product?: CatalogProduct; products?: CatalogProduct[]; messages?: CatalogMessage[] }
    | CatalogProduct;
  let product: CatalogProduct | null = null;
  if (raw && typeof raw === "object") {
    if ("product" in raw && raw.product) product = raw.product;
    else if ("products" in raw && raw.products?.length) product = raw.products[0];
    else if ("id" in raw) product = raw as CatalogProduct;
  }
  console.log(
    `[catalog] get_product ← ${product ? `${product.title} / ${product.variants?.length ?? 0} variants / ${product.options?.length ?? 0} options` : "null"}`,
  );
  return product;
}

export async function lookupCatalog(ids: string[]): Promise<SearchResult> {
  console.log(`[catalog] lookup_catalog → ${JSON.stringify(ids)}`);
  const out = toSearchResult(await call("lookup_catalog", { ids }));
  console.log(
    `[catalog] lookup_catalog ← ${out.products.length} products; messages=${JSON.stringify(out.messages ?? [])}`,
  );
  return out;
}

// ---- Helpers ----

export function productPriceCents(p: CatalogProduct): number | undefined {
  return p.price_range?.min?.amount ?? p.variants?.[0]?.price?.amount;
}

export function productImageUrl(p: CatalogProduct): string | undefined {
  return p.media?.find((m) => m.url)?.url ?? p.variants?.[0]?.media?.find((m) => m.url)?.url;
}

export function productSeller(p: CatalogProduct): CatalogSeller | undefined {
  return p.variants?.find((v) => v.seller)?.seller;
}

export function productUrl(p: CatalogProduct): string | undefined {
  return p.variants?.find((v) => v.url)?.url;
}

export function refundPolicyUrl(seller?: CatalogSeller): string | undefined {
  return seller?.links?.find((l) => /refund|return/i.test(`${l.type ?? ""} ${l.name ?? ""}`))?.url;
}

export function formatCents(cents: number | undefined, currency = "USD"): string {
  if (cents === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
