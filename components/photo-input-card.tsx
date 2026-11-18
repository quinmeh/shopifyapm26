// PhotoInputCard (DESIGN.md §3): the giver's photos on the matches screen, with Edit.
import { SecondaryButton, Spinner } from "./ui";

// `people`: the giver marked it "Photo of us". It guides the AI read (setting, activity,
// objects) but never the look-alike catalog search.
export type Photo = { previewUrl: string; title: string; data: string; contentType: string; people?: boolean };
export const MAX_PHOTOS = 3;

export function PhotoInputCard({
  photos,
  searching,
  onChange,
}: {
  photos: Photo[];
  searching: boolean;
  onChange: () => void;
}) {
  const border = searching && photos.length ? "border-2 border-ink" : "border border-giver-border";
  const title = photos.length === 0 ? "Add photos of what they love" : photos.length === 1 ? photos[0].title : `${photos.length} photos`;
  const people = photos.filter((p) => p.people).length;
  return (
    <div className={`flex items-center gap-3 rounded-card bg-surface p-3 ${border}`}>
      <div className="relative h-16 w-16 shrink-0">
        {photos.length === 0 && <div className="h-16 w-16 rounded-control bg-skeleton" />}
        {photos.slice(0, MAX_PHOTOS).map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img key={p.previewUrl} src={p.previewUrl} alt=""
            className="absolute h-14 w-14 rounded-control border-2 border-surface object-cover"
            style={{ left: i * 4, top: i * 4, zIndex: MAX_PHOTOS - i, transform: `rotate(${(i - 1) * 4}deg)` }} />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{title}</p>
        <p className="flex items-center gap-1.5 text-[12px] text-giver-text2">
          {photos.length ? (searching ? "New photos · searching" : people ? `Includes ${people === 1 ? "a photo" : "photos"} of you two` : "From your photos") : "Their windowsill, mug or bookshelf"}
          {searching && photos.length > 0 && <Spinner />}
        </p>
      </div>
      <SecondaryButton onClick={onChange} className="!h-9 !w-auto shrink-0 px-3 text-[13px]">
        {photos.length ? "Edit" : "Add photos"}
      </SecondaryButton>
    </div>
  );
}

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
