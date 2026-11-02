import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDay, formatRate, type Enquiry, summarizeBrokers, summarizeItems } from "@/lib/enquiries";
import { EnquiryTable } from "./EnquiryTable";
import { Chip } from "./TypeBadge";

export function BrokerSheet({
  brokerKey,
  all,
  onClose,
  onUpdateEnquiry,
  onDeleteEnquiry,
}: {
  brokerKey: string | null;
  all: Enquiry[];
  onClose: () => void;
  onUpdateEnquiry?: (id: string, patch: Partial<Enquiry>) => void;
  onDeleteEnquiry?: (id: string) => void;
}) {
  const list = brokerKey ? all.filter((e) => e.brokerKey === brokerKey) : [];
  const summary = summarizeBrokers(list)[0];
  const items = summarizeItems(list);
  const first = list.at(-1)?.timestamp ?? "";

  return (
    <Sheet open={!!brokerKey} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-background p-0 sm:max-w-3xl">
        {summary && (
          <>
            <SheetHeader className="surface-ink m-4 space-y-1 p-6 text-left">
              <p className="eyebrow text-ink-muted">Broker ledger</p>
              <SheetTitle className="font-display text-3xl font-bold text-ink-foreground">
                {summary.broker}
              </SheetTitle>
              <SheetDescription className="text-ink-muted">
                {summary.count} enquiries · since {formatDay(first)}
              </SheetDescription>
              <div className="grid grid-cols-3 gap-3 pt-4">
                <Stat label="Avg rate" value={formatRate(summary.avg)} />
                <Stat label="Purchase" value={String(summary.purchase)} />
                <Stat label="Sale" value={String(summary.sale)} />
              </div>
            </SheetHeader>

            <div className="px-4">
              <p className="eyebrow mb-2 text-muted-foreground">Items traded</p>
              <div className="flex flex-wrap gap-2">
                {items.map((i) => (
                  <Chip key={i.itemKey} className="gap-2 px-2.5 py-1 text-sm">
                    <b>{i.item}</b>
                    <span className="num text-muted-foreground">
                      {i.count}× · {formatRate(i.avg)}
                    </span>
                  </Chip>
                ))}
              </div>
            </div>

            <div className="surface m-4 overflow-hidden">
              <EnquiryTable
                list={list}
                compact
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
      <p className="num mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
