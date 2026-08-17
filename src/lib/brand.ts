export type Brand = "lbstransformation" | "lbsworks";

export const BRANDS: Brand[] = ["lbstransformation", "lbsworks"];

export const BRAND_LABELS: Record<Brand, string> = {
  lbstransformation: "LBsTransformation",
  lbsworks: "LBsWorks",
};

export const BRAND_COOKIE = "brand";
export const DEFAULT_BRAND: Brand = "lbstransformation";

export function isBrand(value: string | undefined | null): value is Brand {
  return value === "lbstransformation" || value === "lbsworks";
}
