import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Variable font so the 650/550 weights in DESIGN.md §2 render as specified.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Soft serif for the wordmark, headlines and the giver's note: the "handwritten card" voice.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", style: ["normal", "italic"], axes: ["SOFT", "opsz"] });

export const metadata: Metadata = {
  title: "Twofold",
  description: "A gift made by two. You choose the thought. They finish the details.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
