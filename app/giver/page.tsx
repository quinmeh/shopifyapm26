import { GiverEmail } from "@/components/giver-email";
import { AppHeader, Screen } from "@/components/ui";
import { safeReturn } from "@/lib/giver-auth";
export default async function GiverPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; expired?: string }> }) {
  const params = await searchParams;
  return <Screen><AppHeader /><main className="flex flex-col gap-3 px-5"><h1 className="text-[24px] font-bold">Your private gift tracking</h1>
    <p className="text-[14px] text-giver-text2">Use the email you verified when creating your gift.</p>
    {params.expired && <p role="alert">That link expired or was already used. Request a new one.</p>}
    <GiverEmail returnTo={safeReturn(params.returnTo)} /><a href="/gifts" className="text-[14px] underline">Open my gifts</a>
  </main></Screen>;
}
