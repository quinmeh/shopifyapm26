import type { Address } from "./types";

export type AddressMatch = Pick<Address, "line1" | "city" | "region" | "postalCode">;
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function parseShippingAddress(input: unknown): Address | null {
  const a = object(input);
  const address: Address = { fullName: clean(a.fullName), line1: clean(a.line1), line2: clean(a.line2), city: clean(a.city), region: clean(a.region).toUpperCase(), postalCode: clean(a.postalCode), country: "US" };
  if (!address.fullName || address.fullName.length > 100 || !address.line1 || address.line1.length > 200 || (address.line2?.length ?? 0) > 120 || !address.city || address.city.length > 100 || !/^[A-Z]{2}$/.test(address.region) || !/^\d{5}(-\d{4})?$/.test(address.postalCode) || (a.country !== undefined && a.country !== "US")) return null;
  return address;
}

// Census matchedAddress includes the actual matched house number. fromAddress
// and toAddress are street-range endpoints and must never be used as a house number.
export function censusMatches(payload: unknown): AddressMatch[] {
  const matches = object(object(payload).result).addressMatches;
  if (!Array.isArray(matches)) return [];
  const output: AddressMatch[] = [];
  for (const item of matches) {
    const match = object(item), parts = object(match.addressComponents);
    const line1 = clean(match.matchedAddress).split(",")[0].trim();
    const city = clean(parts.city), region = clean(parts.state), postalCode = clean(parts.zip);
    if (!line1 || !city || !/^[A-Z]{2}$/.test(region) || !/^\d{5}$/.test(postalCode)) continue;
    const next = { line1, city, region, postalCode };
    if (!output.some(existing => JSON.stringify(existing) === JSON.stringify(next))) output.push(next);
    if (output.length === 5) break;
  }
  return output;
}
