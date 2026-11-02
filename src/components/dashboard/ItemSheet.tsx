import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  formatDay,
  formatRate,
  summarizeItemBrokers,
  summarizeItems,
  type Enquiry,
} from "@/lib/enquiries";
import { EnquiryTable } from "./EnquiryTable";
import { Chip, TypeBadge } from "./TypeBadge";

export function ItemSheet({
  itemKey,
  all,
  onClose,
  onOpenBroker,
  onUpdateEnquiry,
  onDeleteEnquiry,
}: {
  itemKey: string | null;
  all: Enquiry[];
  onClose: () => void;
  onOpenBroker?: (brokerKey: string) => void;
  onUpdateEnquiry?: (id: string, patch: Partial<Enquiry>) => void;
  onDeleteEnquiry?: (id: string) => void;
}) {
  const list = itemKey ? all.filter((e) => e.itemKey === itemKey) : [];
  const summary = summarizeItems(list)[0];
  const brokers = itemKey ? summarizeItemBrokers(all, itemKey) : [];
  const first = list.at(-1)?.timestamp ?? "";

  return (
    <Sheet open={!!itemKey} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-background p-0 sm:max-w-3xl">
        {summary && (
          <>
            <SheetHeader className="surface-ink m-4 space-y-1 p-6 text-left">
              <p className="eyebrow text-ink-muted">Item ledger</p>
              <SheetTitle className="font-display text-3xl font-bold text-ink-foreground">
                {summary.item}
              </SheetTitle>
              <SheetDescription className="text-ink-muted">
                {summary.count} enquiries · {brokers.length} brokers · since {formatDay(first)}
              </SheetDescription>
              <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-4">
                <Stat label="Avg rate" value={formatRate(summary.avg)} />
                <Stat
                  label="Rate range"
                  value={
                    summary.min !== null && summary.max !== null
                      ? `${formatRate(summary.min)} - ${formatRate(summary.max)}`
                      : "—"
                  }
                />
                <Stat label="Purchase" value={String(summary.purchase)} />
                <Stat label="Sale" value={String(summary.sale)} />
              </div>
            </SheetHeader>

            <div className="px-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="eyebrow text-muted-foreground">Is item ke saare brokers ({brokers.length})</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {brokers.map((b) => (
                  <div
                    key={b.brokerKey}
                    className="flex flex-col justify-between rounded-lg border border-border bg-card p-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            onClick={() => {
                              onClose();
                              onOpenBroker?.(b.brokerKey);
                            }}
                            className="text-left font-bold text-foreground hover:text-primary hover:underline"
                          >
                            {b.broker}
                          </button>
                          <p className="num text-xs text-muted-foreground">
                            {b.count} {b.count === 1 ? "deal" : "deals"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="num font-bold text-foreground">{formatRate(b.lastRate ?? b.avg)}</p>
                          <p className="text-[10px] text-muted-foreground">avg {formatRate(b.avg)}</p>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1 text-xs">
                        {b.purchase > 0 && <TypeBadge type="PURCHASE" label={`Buy ${b.purchase}`} />}
                        {b.sale > 0 && <TypeBadge type="SALE" label={`Sell ${b.sale}`} />}
                        {b.lastLocation && <Chip>📍 {b.lastLocation}</Chip>}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      <span>Last: {formatDay(b.lastAt)}</span>
                      {onOpenBroker && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenBroker(b.brokerKey);
                          }}
                          className="font-semibold text-primary hover:underline"
                        >
                          View Ledger →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface m-4 overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <p className="eyebrow text-muted-foreground">Deals Register</p>
                <h4 className="text-base font-bold text-foreground">{summary.item} Deals</h4>
              </div>
              <EnquiryTable
                list={list}
                compact
                onBroker={(brokerKey) => {
                  onClose();
                  onOpenBroker?.(brokerKey);
                }}
                {...(onUpdateEnquiry ? { onUpdate: onUpdateEnquiry } : {})}
                {...(onDeleteEnquiry ? { onDelete: onDeleteEnquiry } : {})}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-muted/20 p-3">
      <p className="eyebrow text-ink-muted">{label}</p>
      <p className="num mt-1 text-lg font-semibold sm:text-xl">{value}</p>
    </div>
  );
}

