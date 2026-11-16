// ProductTile + SkeletonTile (DESIGN.md §3).
import { formatCents } from "@/lib/catalog";
import type { ProductSnapshot } from "@/lib/types";
import { CheckIcon } from "./ui";

export function ProductTile({
  product,
  selected,
  onSelect,
}: {
  product: ProductSnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex flex-col overflow-hidden rounded-card bg-surface text-left ${
        selected ? "border-2 border-ink" : "border border-giver-border"
      }`}
    >
      <div className="h-[104px] w-full bg-skeleton">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary merchant CDNs
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white">
          <CheckIcon size={13} />
        </span>
      )}
      <div className="flex flex-col gap-0.5 p-2.5">
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
      <div className="h-[104px] w-full bg-skeleton" />
      <div className="flex flex-col gap-2 p-2.5">
        <div className="h-3 w-5/6 rounded bg-skeleton" />
        <div className="h-3 w-1/2 rounded bg-giver-bg" />
        <div className="h-3 w-1/4 rounded bg-skeleton" />
      </div>
    </div>
  );
}
