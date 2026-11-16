import { notFound, redirect } from "next/navigation";
import { RevealScreen } from "@/components/reveal-screen";
import { toRecipientGift } from "@/lib/recipient";
import { getGift } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RevealPage({ params }: PageProps<"/g/[id]">) {
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (gift.confirmation) redirect(`/g/${id}/done`);
  return <RevealScreen gift={toRecipientGift(gift)} />;
}
