import { AppHeader, Screen } from "@/components/ui";
// Native POST forms need an Origin header. no-referrer makes it null in browsers;
// strict-origin preserves the origin without exposing the token-bearing URL.
export const metadata = { referrer: "strict-origin" as const, robots: { index: false, follow: false } };
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <Screen><AppHeader /><main className="flex flex-col gap-4 px-5"><h1 className="text-[24px] font-bold">Verify your email</h1>
    <p className="text-[14px]">Continue to save and privately track your gifts. You can return to your gift creation tab afterward.</p>
    <form method="POST" action="/api/auth/verify"><input type="hidden" name="token" value={token ?? ""} /><button className="h-12 w-full rounded-control bg-ink text-white" type="submit">Verify and continue</button></form>
  </main></Screen>;
}
