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
  reason?: string; // why search returned it, e.g. "Cozy candle" or "Looks like your photo" (giver tiles only)
};

export type Address = {
  fullName?: string; // Required on new confirmations; optional for existing saved gifts.
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: "US";
};

export type GiftStatus = "sent" | "confirmed" | "completed" | "cancelled";
export type DeliveryMethod = "ship_to_recipient" | "give_in_person";

export type Gift = {
  hasPhoto?: boolean; // the giver added a "photo of us" (stored under gift-photo:{id})
  cancelledAt?: string; // set with status "cancelled": the recipient link stops working
  ownerEmail?: string; // server-side ownership; never sent to recipient views
  ownerBrowserId?: string; // hash of a separate browser credential, never the recipient link
  id: string; // nanoid(8)
  createdAt: string;
  giverName: string; // "Quynh"
  recipientLabel: string; // "your sister" (giver-side copy)
  occasion?: string; // drives "For your new place"
  note: string;
  deliveryMethod?: DeliveryMethod; // Missing on older gifts means ship_to_recipient. Fixed at creation.
  pick: ProductSnapshot;
  approvedSwaps: ProductSnapshot[]; // 0–3
  status: GiftStatus;
  confirmation?: {
    chosenProductId: string;
    variantId: string;
    selected?: { name: string; label: string }[];
    variantTitle: string;
    address?: Address; // Required only when shipping directly to the recipient.
    confirmedAt: string;
  };
};

// Recipient-facing view: same shape minus every price (BRIEF §7).
export type RecipientProduct = Omit<ProductSnapshot, "priceCents">;
export type RecipientGift = Omit<Gift, "pick" | "approvedSwaps" | "ownerEmail" | "ownerBrowserId"> & {
  pick: RecipientProduct;
  approvedSwaps: RecipientProduct[];
  headline: string; // reveal-screen display line from the occasion ("For your new place")
};

// What the recipient needs from get_product to pick a variant (no price, no checkout url).
export type OptionGroup = { name: string; values?: { label: string; available?: boolean; exists?: boolean }[] };
export type RecipientVariant = { id?: string; title?: string; available: boolean; options: { name: string; label: string }[] };
