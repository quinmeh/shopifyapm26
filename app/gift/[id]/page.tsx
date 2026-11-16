import { notFound } from "next/navigation";
import { getGift } from "@/lib/store";
import { GiftStatusScreen } from "@/components/gift-status-screen";

export const dynamic = "force-dynamic";
export default async function GiftStatusPage({ params }: PageProps<"/gift/[id]">) {
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) notFound();
  return <GiftStatusScreen initialGift={gift} />;
}
