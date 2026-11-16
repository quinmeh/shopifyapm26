import { notFound, redirect } from "next/navigation";
import { DoneScreen } from "@/components/done-screen";
import { toRecipientGift } from "@/lib/recipient";
import { getGift } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DonePage({ params }: PageProps<"/g/[id]/done">) {
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (!gift.confirmation) redirect(`/g/${id}`);
  return <DoneScreen gift={toRecipientGift(gift)} />;
}
