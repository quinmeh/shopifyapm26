import { notFound, redirect } from "next/navigation";
import { ownsGift } from "@/lib/giver-auth";
import { getGift } from "@/lib/store";
import { GiftStatusScreen } from "@/components/gift-status-screen";

export const dynamic = "force-dynamic";
export default async function GiftStatusPage({ params }: PageProps<"/gift/[id]">) {
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (!await ownsGift(gift)) redirect(`/giver?returnTo=${encodeURIComponent(`/gift/${id}`)}`);
  return <GiftStatusScreen initialGift={gift} />;
}
