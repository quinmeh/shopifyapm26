"use client";
// Scratch-off cover for the recipient's first look at their gift (blind-box style).
// A clay foil sits over the photo and jiggles until touched. Scratching with a finger or mouse
// clears it; past ~45% the foil dissolves and onReveal fires. "Tap to reveal" is the
// keyboard / no-scratch path. All drawing is decorative; the image itself has empty alt.
import { useCallback, useEffect, useRef, useState } from "react";

const FOIL = "#F6E3D8", STRIPE = "#EFD5C5", INK = "#8C3A22";
const BOW = [
  "M12 11.5C10 8 5.2 5.6 3.6 7.6c-1.5 1.9.6 5.6 8.4 3.9z",
  "M12 11.5c2-3.5 6.8-5.9 8.4-3.9 1.5 1.9-.6 5.6-8.4 3.9z",
  "M11.2 12.4 8 19.5M12.8 12.4 16 19.5",
];
const BRUSH = 26; // px radius of the scratch
const CLEAR_AT = 0.45;

export function ScratchReveal({ imageUrl, onReveal, onStart }: { imageUrl?: string; onReveal: () => void; onStart?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const [touched, setTouched] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Paint the foil at device resolution.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = FOIL;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = STRIPE;
      ctx.lineWidth = 6;
      for (let x = -height; x < width + height; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, height); ctx.lineTo(x + height, 0); ctx.stroke();
      }
      // Scattered small bows.
      ctx.strokeStyle = "rgba(140, 58, 34, 0.18)"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 0; i < 14; i++) {
        const bx = ((i * 97) % Math.max(width - 30, 1)) + 6, by = ((i * 53) % Math.max(height - 30, 1)) + 6;
        ctx.save(); ctx.translate(bx, by); ctx.scale(0.9, 0.9); ctx.rotate(((i % 5) - 2) * 0.2);
        BOW.forEach((d) => ctx.stroke(new Path2D(d)));
        ctx.restore();
      }
      // Center label: big bow + "Scratch to reveal".
      ctx.save(); ctx.translate(width / 2 - 24, height / 2 - 52); ctx.scale(2, 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; BOW.forEach((d) => ctx.stroke(new Path2D(d)));
      ctx.restore();
      ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `600 16px ${getComputedStyle(document.body).fontFamily}`;
      ctx.fillText("Scratch to reveal", width / 2, height / 2 + 18);
    };
    paint();
  }, []);

  const finish = useCallback(() => {
    if (clearing) return;
    setClearing(true);
    onReveal();
  }, [clearing, onReveal]);

  // Fraction of foil already scratched, sampled on a coarse grid.
  const cleared = () => {
    const canvas = canvasRef.current!;
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0, total = 0;
    for (let i = 3; i < data.length; i += 4 * 24) { total++; if (data[i] === 0) clear++; }
    return total ? clear / total : 0;
  };

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || clearing) return;
    const rect = canvas.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const ctx = canvas.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000"; // must be opaque: destination-out erases by the stroke's alpha
    ctx.lineWidth = BRUSH * 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    const from = last.current ?? p;
    ctx.moveTo(from.x, from.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    last.current = p;
    if (++moves.current % 6 === 0 && cleared() >= CLEAR_AT) finish();
  };

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} aria-hidden="true"
        className={`absolute inset-0 h-full w-full cursor-grab touch-none transition-opacity duration-500 ease-out ${clearing ? "opacity-0" : ""}`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); if (!touched) { setTouched(true); onStart?.(); } last.current = null; scratch(e); }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") scratch(e); }}
        onPointerUp={() => { last.current = null; if (cleared() >= CLEAR_AT) finish(); }} />
      {!touched && <span aria-hidden="true" className="sheen pointer-events-none absolute inset-0" />}
      {/* Preload so the photo is ready underneath. */}
      {imageUrl && <link rel="preload" as="image" href={imageUrl} />}
      <button type="button" onClick={finish}
        className={`press absolute bottom-2.5 right-2.5 rounded-full bg-surface/95 px-3 py-1.5 text-[12px] font-semibold text-clay transition-opacity ${clearing ? "opacity-0" : ""}`}>
        Tap to reveal
      </button>
    </div>
  );
}
