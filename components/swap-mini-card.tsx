// SwapMiniCard (DESIGN.md §3): 70px image, title 11/600, seller 11, 26px ✕ to remove.
// Removed state: dashed placeholder with "Removed · Undo".
import type { ProductSnapshot } from "@/lib/types";
import { XIcon } from "./ui";

export function SwapMiniCard({ product, removed, onRemove, onUndo }: {
  product: ProductSnapshot; removed: boolean; onRemove: () => void; onUndo: () => void;
}) {
  if (removed) {
    return (
      <button type="button" onClick={onUndo}
        className="press fade-in flex min-h-[118px] flex-col items-center justify-center gap-0.5 rounded-control border border-dashed border-giver-input px-2 text-center text-[11px] text-giver-text2 hover:border-ink">
        <span>Removed</span>
        <span className="font-semibold text-ink underline underline-offset-[3px]">Undo</span>
      </button>
    );
  }
  return (
    <div className="fade-in relative flex flex-col gap-1 rounded-control border border-giver-border p-1.5">
      <div className="h-[70px] w-full overflow-hidden rounded-control bg-skeleton">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- merchant CDN
          <img src={product.imageUrl} alt="" className="img-reveal h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <button type="button" onClick={onRemove} aria-label="Remove this alternative"
        className="press absolute right-0.5 top-0.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border border-giver-border bg-surface text-ink hover:border-ink">
        <XIcon size={12} />
      </button>
      <span className="line-clamp-2 text-[11px] font-semibold leading-[14px]">{product.title}</span>
      <span className="truncate text-[11px] text-giver-text2">{product.sellerName ?? "Independent maker"}</span>
    </div>
  );
}
