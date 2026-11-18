import { notFound, redirect } from "next/navigation";
import { OpenScreen } from "@/components/open-screen";
import { toRecipientGift } from "@/lib/recipient";
import { CancelledScreen } from "@/components/cancelled-screen";
import { getGift } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OpenPage({ params }: PageProps<"/g/[id]/open">) {
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (gift.status === "cancelled") return <CancelledScreen giverName={gift.giverName} />;
  if (gift.confirmation) redirect(`/g/${id}/done`);
  return <OpenScreen gift={toRecipientGift(gift)} />;
}
