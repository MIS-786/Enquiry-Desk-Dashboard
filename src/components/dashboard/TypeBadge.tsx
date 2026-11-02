import { cva } from "class-variance-authority";

import type { EnquiryType } from "@/lib/enquiries";
import { cn } from "@/lib/utils";

const typeBadge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 eyebrow font-medium whitespace-nowrap",
  {
    variants: {
      type: {
        PURCHASE: "bg-purchase-soft text-purchase",
        SALE: "bg-sale-soft text-sale",
        OTHER: "bg-muted text-muted-foreground",
      },
    },
  },
);

export function TypeBadge({
  type,
  label,
  className,
}: {
  type: EnquiryType;
  label?: string;
  className?: string;
}) {
  const text = type === "OTHER" ? (label && label !== "Not set" ? label : "Not set") : type;
  return (
    <span className={cn(typeBadge({ type }), className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {text === "PURCHASE" ? "Purchase" : text === "SALE" ? "Sale" : text}
    </span>
  );
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-paper px-1.5 py-0.5 text-xs text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
