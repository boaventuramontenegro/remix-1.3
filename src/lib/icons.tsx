import {
  Bus, Car, GraduationCap, HeartPulse, Home, PartyPopper, Receipt, ShoppingCart, Tag,
  Utensils, Plane, Dog, Baby, Shirt, Smartphone, Gift, Dumbbell, Wrench, Zap, Coffee,
  type LucideIcon,
} from "lucide-react";

export const ICONES: Record<string, LucideIcon> = {
  receipt: Receipt, "shopping-cart": ShoppingCart, car: Car, home: Home, "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap, "party-popper": PartyPopper, bus: Bus, tag: Tag, utensils: Utensils,
  plane: Plane, dog: Dog, baby: Baby, shirt: Shirt, smartphone: Smartphone, gift: Gift,
  dumbbell: Dumbbell, wrench: Wrench, zap: Zap, coffee: Coffee,
};

export const CORES = ["#0ea5e9", "#22c55e", "#f97316", "#a16207", "#ef4444", "#6366f1", "#ec4899", "#14b8a6", "#64748b", "#eab308"];

export function CategoriaIcone({ icone, cor, size = 18, className = "" }: { icone?: string | null | undefined; cor?: string | null | undefined; size?: number; className?: string }) {
  const Icon = ICONES[icone ?? "tag"] ?? Tag;
  // Category colors are user data, applied inline.
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${className}`}
      style={{ backgroundColor: `${cor ?? "#64748b"}22`, color: cor ?? "#64748b", width: size + 18, height: size + 18 }}
    >
      <Icon size={size} />
    </span>
  );
}
