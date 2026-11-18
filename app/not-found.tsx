import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-3 px-5 text-center">
      <h1 className="font-display text-[28px] font-semibold leading-[34px]">That link doesn’t go anywhere</h1>
      <p className="text-[14px] text-giver-text2">The gift may have expired, or the link was copied incompletely.</p>
      <Link href="/" className="text-[14px] underline underline-offset-[3px]">Start a gift</Link>
    </main>
  );
}
