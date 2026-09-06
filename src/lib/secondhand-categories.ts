import {
  Package,
  Car,
  Smartphone,
  Armchair,
  Shirt,
  Dumbbell,
  CookingPot,
  Home,
  Tag,
  type LucideIcon,
} from "lucide-react";

export interface SecondHandCategory {
  /** The Hebrew name stored on each item */
  name: string;
  /** Stable key used for the admin picture setting */
  slug: string;
  icon: LucideIcon;
  /** Hue of the faint tint behind the fallback tile */
  hue: number;
}

export const SECONDHAND_CATEGORIES: SecondHandCategory[] = [
  { name: "כללי", slug: "general", icon: Package, hue: 43 },
  { name: "רכב", slug: "vehicles", icon: Car, hue: 20 },
  { name: "אלקטרוניקה", slug: "electronics", icon: Smartphone, hue: 215 },
  { name: "ריהוט", slug: "furniture", icon: Armchair, hue: 28 },
  { name: "ביגוד / אופנה", slug: "fashion", icon: Shirt, hue: 330 },
  { name: "ספורט ופנאי", slug: "sports", icon: Dumbbell, hue: 150 },
  { name: "כלי בית", slug: "home", icon: CookingPot, hue: 60 },
  { name: "נדל״ן", slug: "realestate", icon: Home, hue: 5 },
  { name: "אחר", slug: "other", icon: Tag, hue: 270 },
];

export const CATEGORY_NAMES = SECONDHAND_CATEGORIES.map((c) => c.name);

/** Unknown or missing names fall back to the general category. */
export const findCategory = (name?: string | null): SecondHandCategory =>
  SECONDHAND_CATEGORIES.find((c) => c.name === name) ?? SECONDHAND_CATEGORIES[0];

export const CATEGORY_IMAGE_PREFIX = "category_image_secondhand_";
export const categoryImageKey = (slug: string) => `${CATEGORY_IMAGE_PREFIX}${slug}`;
