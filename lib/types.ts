// Data model — see docs/BRIEF.md §6.

export type ProductSnapshot = {
  id: string; // gid://shopify/p/...
  title: string;
  shortName: string; // "the stoneware planter" — used in button copy
  imageUrl?: string;
  priceCents: number;
  sellerName?: string;
  sellerUrl?: string;
  refundPolicyUrl?: string;
  rating?: { value: number; count: number };
};

export type Address = {
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: "US";
};

export type GiftStatus = "sent" | "confirmed" | "completed";

export type Gift = {
  id: string; // nanoid(8)
  createdAt: string;
  giverName: string; // "Quynh"
  recipientLabel: string; // "your sister" (giver-side copy)
  occasion?: string; // drives "For your new place"
  note: string;
  pick: ProductSnapshot;
  approvedSwaps: ProductSnapshot[]; // 0–3
  status: GiftStatus;
  confirmation?: {
    chosenProductId: string;
    variantId: string;
    selected?: { name: string; label: string }[];
    variantTitle: string;
    address: Address;
    confirmedAt: string;
  };
};

// Recipient-facing view: same shape minus every price (BRIEF §7).
export type RecipientProduct = Omit<ProductSnapshot, "priceCents">;
export type RecipientGift = Omit<Gift, "pick" | "approvedSwaps"> & {
  pick: RecipientProduct;
  approvedSwaps: RecipientProduct[];
  headline: string; // reveal-screen display line from the occasion ("For your new place")
};

// What the recipient needs from get_product to pick a variant (no price, no checkout url).
export type OptionGroup = { name: string; values?: { label: string; available?: boolean; exists?: boolean }[] };
export type RecipientVariant = { id?: string; title?: string; available: boolean; options: { name: string; label: string }[] };
