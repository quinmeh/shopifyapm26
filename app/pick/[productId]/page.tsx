import { PickScreen } from "@/components/pick-screen";

export default async function PickPage({ params }: PageProps<"/pick/[productId]">) {
  const { productId } = await params;
  return <PickScreen productId={decodeURIComponent(productId)} />;
}
