import { Check, ChevronDown, ChevronRight, ExternalLink, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatDateTime,
  formatRate,
  summarizeItemBrokers,
  type BrokerSummary,
  type Enquiry,
  type ItemSummary,
} from "@/lib/enquiries";
import { cn } from "@/lib/utils";
import { Chip, TypeBadge } from "./TypeBadge";

export function ItemBoard({
  items,
  enquiries,
  brokers,
  onOpenItem,
  onOpenBroker,
  onDeleteEnquiry,
}: {
  items: ItemSummary[];
  enquiries: Enquiry[];
  brokers?: BrokerSummary[];
  onOpenItem?: (itemKey: string) => void;
  onOpenBroker?: (brokerKey: string) => void;
  onDeleteEnquiry?: (id: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"items" | "brokers">("items");
  const [expandedItem, setExpandedItem] = useState<string | null>(items[0]?.itemKey ?? null);

  const topItems = Math.max(1, ...items.map((i) => i.count));
  const topBrokers = Math.max(1, ...(brokers?.map((b) => b.count) ?? [1]));

  const toggleExpand = (itemKey: string) => {
    setExpandedItem((prev) => (prev === itemKey ? null : itemKey));
  };

  return (
    <section className="surface flex flex-col h-[580px] overflow-hidden">
      <header className="shrink-0 flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow text-muted-foreground">
            {viewMode === "items" ? "Item-wise deals" : "Broker-wise deals"}
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {viewMode === "items" ? "What deal was there on which item?" : "What deal was there on which item?"}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {brokers && brokers.length > 0 && (
            <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode("items")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  viewMode === "items"
                    ? "bg-paper font-semibold text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Item-wise
              </button>
              <button
                type="button"
                onClick={() => setViewMode("brokers")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  viewMode === "brokers"
                    ? "bg-paper font-semibold text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Broker-wise
              </button>
            </div>
          )}

          <span className="num text-sm text-muted-foreground">
            {viewMode === "items" ? `${items.length} items` : `${brokers?.length ?? 0} brokers`}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* ITEM-WISE VIEW (DEFAULT) */}
      {viewMode === "items" && (
        <>
          {items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Is filter me koi item nahi mila.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it, idx) => {
                const isExpanded = expandedItem === it.itemKey;
                return (
                  <li
                    key={it.itemKey}
                    className={cn("transition-colors", isExpanded && "bg-muted/20")}
                  >
                    {/* Main Item Row */}
                    <div className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/50">
                      <button
                        type="button"
                        onClick={() => toggleExpand(it.itemKey)}
                        className="group grid flex-1 grid-cols-[2.25rem_1fr] items-center gap-3.5 text-left"
                        aria-expanded={isExpanded}
                      >
                        <span className="num grid size-9 place-items-center rounded-lg bg-secondary text-xs font-bold tracking-wider text-secondary-foreground shadow-xs">
                          {itemInitials(it.item)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <p className="text-base font-bold text-foreground group-hover:text-primary">
                              {it.item}
                            </p>
                            {it.lastBroker && (
                              <p className="text-xs text-muted-foreground">
                                Last:{" "}
                                <span className="font-medium text-foreground">{it.lastBroker}</span>
                                {it.lastRate !== null && (
                                  <>
                                    {" "}
                                    @{" "}
                                    <span className="num font-semibold text-foreground">
                                      {formatRate(it.lastRate)}
                                    </span>
                                  </>
                                )}
                                {" "}· {formatDateTime(it.lastAt)}
                              </p>
                            )}
                          </div>

                          {/* Broker chips */}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="eyebrow text-[10px] text-muted-foreground">
                              Brokers:
                            </span>
                            {it.brokerNames.slice(0, 4).map((b) => (
                              <Chip key={b} className="text-[11px] font-medium">
                                {b}
                              </Chip>
                            ))}
                            {it.brokerNames.length > 4 && (
                              <Chip className="num text-[11px] text-muted-foreground">
                                +{it.brokerNames.length - 4} more
                              </Chip>
                            )}
                          </div>

                          {/* Volume progress bar */}
                          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-300"
                              style={{
                                width: `${(it.count / topItems) * 100}%`,
                                transitionDelay: `${idx * 40}ms`,
                              }}
                            />
                          </div>
                        </div>
                      </button>

                      {/* Right side stats & actions */}
                      <div className="flex items-center gap-3">
                        <div
                          className="cursor-pointer text-right"
                          onClick={() => toggleExpand(it.itemKey)}
                        >
                          <p className="num text-2xl font-bold leading-none text-foreground">
                            {it.count}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            avg{" "}
                            <span className="num font-semibold text-foreground">
                              {formatRate(it.avg)}
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {it.brokers} {it.brokers === 1 ? "broker" : "brokers"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {onOpenItem && (
                            <button
                              type="button"
                              onClick={() => onOpenItem(it.itemKey)}
                              title={`Open ${it.item} full ledger`}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <ExternalLink className="size-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleExpand(it.itemKey)}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={isExpanded ? "Collapse item" : "Expand item"}
                          >
                            <ChevronDown
                              className={cn(
                                "size-5 transition-transform duration-200",
                                isExpanded && "rotate-180 text-primary",
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Section: Sare Broker for this item */}
                    {isExpanded && (
                      <ExpandedBrokersSection
                        itemKey={it.itemKey}
                        itemSummary={it}
                        enquiries={enquiries}
                        {...(onOpenBroker ? { onOpenBroker } : {})}
                        {...(onOpenItem ? { onOpenItem } : {})}
                        {...(onDeleteEnquiry ? { onDeleteEnquiry } : {})}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* BROKER-WISE VIEW */}
      {viewMode === "brokers" && brokers && (
        <>
          {brokers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Is filter me koi broker nahi mila.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {brokers.map((b, i) => (
                <li key={b.brokerKey}>
                  <button
                    type="button"
                    onClick={() => onOpenBroker?.(b.brokerKey)}
                    className="group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className="num grid size-8 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                      {brokerInitials(b.broker)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="font-semibold text-foreground">{b.broker}</p>
                        <p className="text-xs text-muted-foreground">
                          Last: {b.lastItem} @{" "}
                          <span className="num">{formatRate(b.lastRate)}</span> ·{" "}
                          {formatDateTime(b.lastAt)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {b.items.slice(0, 4).map((item) => (
                          <Chip key={item}>{item}</Chip>
                        ))}
                        {b.items.length > 4 && <Chip>+{b.items.length - 4}</Chip>}
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${(b.count / topBrokers) * 100}%`,
                            transitionDelay: `${i * 40}ms`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="num text-2xl font-semibold leading-none">{b.count}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          avg <span className="num">{formatRate(b.avg)}</span>
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      </div>
    </section>
  );
}

function ExpandedBrokersSection({
  itemKey,
  itemSummary,
  enquiries,
  onOpenBroker,
  onOpenItem,
  onDeleteEnquiry,
}: {
  itemKey: string;
  itemSummary: ItemSummary;
  enquiries: Enquiry[];
  onOpenBroker?: (brokerKey: string) => void;
  onOpenItem?: (itemKey: string) => void;
  onDeleteEnquiry?: (id: string) => void;
}) {
  const [confirmDeleteBroker, setConfirmDeleteBroker] = useState<string | null>(null);
  const [confirmDeleteDealId, setConfirmDeleteDealId] = useState<string | null>(null);

  const brokers = useMemo(
    () => summarizeItemBrokers(enquiries, itemKey),
    [enquiries, itemKey],
  );

  return (
    <div className="border-t border-border/70 bg-card/60 px-5 py-4 animate-in fade-in-50 duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {itemSummary.item} ke saare brokers ({brokers.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Rates:{" "}
            {itemSummary.min !== null && itemSummary.max !== null ? (
              <>
                <span className="num font-semibold text-foreground">
                  {formatRate(itemSummary.min)}
                </span>
                {" – "}
                <span className="num font-semibold text-foreground">
                  {formatRate(itemSummary.max)}
                </span>
                {" (avg "}
                <span className="num font-semibold text-foreground">
                  {formatRate(itemSummary.avg)}
                </span>
                {")"}
              </>
            ) : (
              "Koi rate nahi hai"
            )}
          </p>
        </div>

        {onOpenItem && (
          <button
            type="button"
            onClick={() => onOpenItem(itemKey)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-paper px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Poora {itemSummary.item} Ledger
            <ExternalLink className="size-3.5" />
          </button>
        )}
      </div>

      {brokers.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Is item ke koi broker deals nahi hain.
        </p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {brokers.map((b) => (
            <div
              key={b.brokerKey}
              className="group relative flex flex-col justify-between rounded-lg border border-border/80 bg-paper p-3.5 shadow-2xs transition-all hover:border-primary/50 hover:shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                      {brokerInitials(b.broker)}
                    </span>
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenBroker?.(b.brokerKey)}
                        className="text-left font-bold text-foreground transition-colors hover:text-primary hover:underline"
                      >
                        {b.broker}
                      </button>
                      <p className="num text-[11px] text-muted-foreground">
                        {b.count} {b.count === 1 ? "deal" : "deals"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="num text-base font-bold text-foreground">
                      {formatRate(b.lastRate ?? b.avg)}
                    </p>
                    {b.min !== null && b.max !== null && b.min !== b.max && (
                      <p className="num text-[10px] text-muted-foreground">
                        {formatRate(b.min)} - {formatRate(b.max)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Deal details summary */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {b.purchase > 0 && <TypeBadge type="PURCHASE" label={`Buy ${b.purchase}`} />}
                  {b.sale > 0 && <TypeBadge type="SALE" label={`Sell ${b.sale}`} />}
                  {b.lastMode && (
                    <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                      {b.lastMode}
                    </span>
                  )}
                  {b.lastLocation && (
                    <span className="text-[11px] text-muted-foreground">
                      📍 {b.lastLocation}
                    </span>
                  )}
                </div>

                {b.lastRemarks && (
                  <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {b.lastRemarks}
                  </p>
                )}

                {/* If multiple deals, show individual deals with delete buttons */}
                {b.count > 1 && (
                  <div className="mt-2.5 space-y-1.5 border-t border-border/50 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Individual Deals ({b.count}):
                    </p>
                    {b.enquiries.map((deal) => (
                      <div
                        key={deal.id}
                        className="flex items-center justify-between rounded bg-muted/40 px-2 py-1 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-foreground">{formatRate(deal.rate)}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="truncate text-muted-foreground">
                            {deal.mode || "Delivery"}{deal.location ? ` @ ${deal.location}` : ""}
                          </span>
                        </div>
                        {onDeleteEnquiry && (
                          confirmDeleteDealId === deal.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteEnquiry(deal.id);
                                  setConfirmDeleteDealId(null);
                                }}
                                className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground hover:bg-destructive/90"
                              >
                                Haan
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteDealId(null)}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground hover:bg-muted/80"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDealId(deal.id)}
                              className="rounded p-0.5 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                              title="Sirf ye deal delete karein"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Confirm Delete OR Action buttons */}
              {confirmDeleteBroker === b.brokerKey ? (
                <div className="mt-3 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs">
                  <span className="font-semibold text-destructive">
                    {b.count > 1 ? `Saari ${b.count} deals delete karein?` : `Deal delete karein?`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        b.enquiries.forEach((e) => onDeleteEnquiry?.(e.id));
                        setConfirmDeleteBroker(null);
                      }}
                      className="inline-flex items-center gap-1 rounded bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground shadow-xs hover:bg-destructive/90"
                    >
                      <Check className="size-3" />
                      Haan
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteBroker(null)}
                      className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground hover:bg-muted"
                    >
                      <X className="size-3" />
                      Nahi
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <span>Last deal: {formatDateTime(b.lastAt)}</span>
                  <div className="flex items-center gap-2">
                    {onDeleteEnquiry && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteBroker(b.brokerKey)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title={b.count > 1 ? `Is broker ki sabhi ${b.count} deals delete karein` : "Is broker ki deal delete karein"}
                      >
                        <Trash2 className="size-3" />
                        <span>Delete</span>
                      </button>
                    )}
                    {onOpenBroker && (
                      <button
                        type="button"
                        onClick={() => onOpenBroker(b.brokerKey)}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Broker Ledger
                        <ChevronRight className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function itemInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function brokerInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}
