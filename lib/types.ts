// Data model — see docs/BRIEF.md §6.

export type ProductSnapshot = {
  id: string; // gid://shopify/p/...
  title: string;
  imageUrl?: string;
  priceCents: number;
  sellerName?: string;
  sellerUrl?: string;
  refundPolicyUrl?: string;
  url?: string;
};

export type Address = {
  name: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: "US";
};

export type GiftStatus = "sent" | "confirmed" | "completed";

export type Gift = {
  id: string; // short nanoid, used in /g/[id]
  createdAt: string;
  giverName: string;
  recipientName: string;
  note: string;
  reasons?: string; // "why this fits"
  pick: ProductSnapshot;
  approvedSwaps: ProductSnapshot[]; // 0–3
  oneOfAKind: boolean; // true when approvedSwaps is empty
  status: GiftStatus;
  confirmation?: {
    chosenProductId: string; // pick or a swap
    variantId: string;
    variantTitle: string;
    address: Address;
    confirmedAt: string;
  };
};
