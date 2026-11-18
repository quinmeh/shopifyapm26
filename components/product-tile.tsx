// ProductTile + SkeletonTile (DESIGN.md §3).
import { formatCents } from "@/lib/catalog";
import type { ProductSnapshot } from "@/lib/types";
import { CheckIcon, stagger } from "./ui";

export function ProductTile({
  product,
  selected,
  onSelect,
  index = 0,
}: {
  product: ProductSnapshot;
  selected: boolean;
  onSelect: () => void;
  index?: number;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={stagger(Math.min(index, 8), 55)}
      className={`rise press group relative flex flex-col overflow-hidden rounded-card bg-surface text-left ${
        selected ? "border-2 border-ink" : "border border-giver-border hover:border-giver-input"
      }`}
    >
      <div className="h-[120px] w-full overflow-hidden bg-skeleton">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary merchant CDNs
          <img src={product.imageUrl} alt="" loading="lazy"
            className={`img-reveal h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] ${selected ? "scale-[1.04]" : ""}`} />
        )}
      </div>
      {selected && (
        <span className="pop absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white">
          <CheckIcon size={13} />
        </span>
      )}
      <div className="flex flex-col gap-0.5 p-2.5">
        {product.reason && (
          <span className="mb-0.5 flex min-w-0 items-center gap-1 text-[11px] font-medium leading-[14px] text-giver-text2" title={`Why it’s here: ${product.reason}`}>
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink/60" />
            <span className="truncate"><span className="sr-only">Why it’s here: </span>{product.reason}</span>
          </span>
        )}
        <span className="line-clamp-2 text-[13px] font-semibold leading-[17px]">{product.title}</span>
        <span className="truncate text-[12px] text-giver-text2">{product.sellerName ?? "Independent maker"}</span>
        <span className="tabular text-[13px] font-semibold">{formatCents(product.priceCents)}</span>
      </div>
    </button>
  );
}

export function SkeletonTile() {
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-giver-border bg-surface" aria-hidden="true">
      <div className="shimmer h-[120px] w-full" />
      <div className="flex flex-col gap-2 p-2.5">
        <div className="shimmer h-3 w-5/6 rounded" />
        <div className="h-3 w-1/2 rounded bg-giver-bg" />
        <div className="shimmer h-3 w-1/4 rounded" />
      </div>
    </div>
  );
}
