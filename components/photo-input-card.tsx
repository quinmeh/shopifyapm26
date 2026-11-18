// PhotoInputCard (DESIGN.md §3): thumbnail + title/source + Change; searching state.
import { SecondaryButton, Spinner } from "./ui";

export type Photo = { previewUrl: string; title: string; data: string; contentType: string };

export function PhotoInputCard({
  photo,
  searching,
  onChange,
}: {
  photo: Photo | null;
  searching: boolean;
  onChange: () => void;
}) {
  const border = searching && photo ? "border-2 border-ink" : "border border-giver-border";
  return (
    <div className={`flex items-center gap-3 rounded-card bg-surface p-3 ${border}`}>
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-control bg-skeleton">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL
          <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{photo ? photo.title : "Add a photo of something they love"}</p>
        <p className="flex items-center gap-1.5 text-[12px] text-giver-text2">
          {photo ? (searching ? "New photo · searching" : "From your photos") : "Their windowsill, mug or bookshelf"}
          {searching && photo && <Spinner />}
        </p>
      </div>
      <SecondaryButton onClick={onChange} className="!h-9 !w-auto shrink-0 px-3 text-[13px]">
        {photo ? "Change" : "Choose photo"}
      </SecondaryButton>
    </div>
  );
}

// Client-side resize to ≤1024px JPEG so the request body stays well under 1 MB.
// createImageBitmap is fast but rejects some formats (e.g. HEIC on some iOS versions);
// an <img> decode handles anything the browser can display. Orientation follows EXIF.
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch (e) { URL.revokeObjectURL(url); throw e; }
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  }
}

export async function fileToPhoto(file: File): Promise<Photo> {
  const image = await decode(file);
  if (!image.width || !image.height) { image.done(); throw new Error("Empty image"); }
  const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image.source, 0, 0, canvas.width, canvas.height);
  image.done();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return {
    previewUrl: dataUrl,
    title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") || "Their photo",
    data: dataUrl.split(",")[1],
    contentType: "image/jpeg",
  };
}
