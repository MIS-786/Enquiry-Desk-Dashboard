import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_FILTERS, type Filters, type Period } from "@/lib/enquiries";
import { cn } from "@/lib/utils";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

interface Option {
  value: string;
  label: string;
}

export function FilterBar({
  filters,
  onChange,
  brokers,
  items,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  brokers: Option[];
  items: Option[];
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });
  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <section className="surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
      <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            role="tab"
            aria-selected={filters.period === p.value}
            onClick={() => set("period", p.value)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors lg:flex-none",
              filters.period === p.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search broker, party, item, location…"
          className="bg-paper pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
        <FilterSelect
          label="Broker"
          value={filters.broker}
          onChange={(v) => set("broker", v)}
          options={brokers}
        />
        <FilterSelect
          label="Item"
          value={filters.item}
          onChange={(v) => set("item", v)}
          options={items}
        />
        <FilterSelect
          label="Type"
          value={filters.type}
          onChange={(v) => set("type", v as Filters["type"])}
          options={[
            { value: "PURCHASE", label: "Purchase" },
            { value: "SALE", label: "Sale" },
            { value: "OTHER", label: "Not set" },
          ]}
        />
        <FilterSelect
          label="Delivery"
          allLabel="Delivery + Motorcut"
          value={filters.mode}
          onChange={(v) => set("mode", v)}
          options={[
            { value: "Delivery", label: "Delivery" },
            { value: "Motorcut", label: "Motorcut" },
          ]}
        />
      </div>

      {dirty && (
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_FILTERS)}>
          <RotateCcw /> Reset
        </Button>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  allLabel?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="min-w-[8.5rem] bg-paper" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel ?? `All ${label.toLowerCase()}s`}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
