import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, Link2, Plus, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { BrokerSheet } from "@/components/dashboard/BrokerSheet";
import { EnquiryTable } from "@/components/dashboard/EnquiryTable";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ItemBoard } from "@/components/dashboard/ItemBoard";
import { ItemRateBoard } from "@/components/dashboard/ItemRateBoard";
import { ItemSheet } from "@/components/dashboard/ItemSheet";
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { NewEnquiryDialog } from "@/components/dashboard/NewEnquiryDialog";
import { SheetSetupDialog } from "@/components/dashboard/SheetSetupDialog";
import { Button } from "@/components/ui/button";
import {
  applyFilters,
  clearEnquiryOverrides,
  DEFAULT_FILTERS,
  formatDateTime,
  loadCreatedEnquiries,
  loadDeletedIds,
  loadEnquiryOverrides,
  loadWebhookUrl,
  periodStart,
  removeFromCreatedEnquiries,
  saveCreatedEnquiry,
  saveDeletedId,
  saveEnquiryOverride,
  summarizeBrokers,
  summarizeItems,
  updateEnquiry,
  type Enquiry,
  type Filters,
} from "@/lib/enquiries";
import { enquiriesQueryOptions } from "@/lib/enquiries.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Enquiry Desk — Broker Deal Dashboard" },
      {
        name: "description",
        content: "See every broker enquiry, item rate and deal from the Enquiry Capture sheet.",
      },
      { property: "og:title", content: "Enquiry Desk — Broker Deal Dashboard" },
      {
        property: "og:description",
        content: "Broker-wise deals, item rates and the full enquiry register in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(enquiriesQueryOptions()),
  component: Dashboard,
});

function Dashboard() {
  const [webhookUrl, setWebhookUrl] = useState<string>(() => loadWebhookUrl());

  const { data, refetch, isFetching } = useSuspenseQuery(
    enquiriesQueryOptions(webhookUrl || undefined),
  );

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [openBroker, setOpenBroker] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [openNewEnquiry, setOpenNewEnquiry] = useState(false);
  const [openSheetSetup, setOpenSheetSetup] = useState(false);

  const [createdList, setCreatedList] = useState<Enquiry[]>(() => loadCreatedEnquiries());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => loadDeletedIds());
  const [overrides, setOverrides] = useState<Record<string, Partial<Enquiry>>>(
    () => loadEnquiryOverrides(),
  );

  const handleUpdateEnquiry = useCallback((id: string, patch: Partial<Enquiry>) => {
    saveEnquiryOverride(id, patch);
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch },
    }));
    toast.success("Deal data update ho gaya!");
  }, []);

  const handleResetOverrides = useCallback(() => {
    clearEnquiryOverrides();
    setOverrides({});
    toast.info("Saare manual edits reset ho gaye.");
  }, []);

  const handleEnquiryCreated = useCallback(
    (newEnquiry: Enquiry) => {
      saveCreatedEnquiry(newEnquiry);
      setCreatedList((prev) => [newEnquiry, ...prev]);
      refetch();
    },
    [refetch],
  );

  const handleDeleteEnquiry = useCallback((id: string) => {
    // 1. If created locally -> remove from localStorage list
    removeFromCreatedEnquiries(id);
    setCreatedList((prev) => prev.filter((e) => e.id !== id));
    // 2. Mark ID as deleted in state & storage (filters it out immediately)
    saveDeletedId(id);
    setDeletedIds((prev) => new Set([...prev, id]));
    toast.success("Entry delete ho gayi.");
  }, []);

  const all = useMemo(() => {
    // Combine locally created enquiries (at top) with loaded sheet enquiries, then exclude deleted IDs
    const base = [...createdList, ...data.enquiries];
    return base
      .filter((e) => !deletedIds.has(e.id))
      .map((e) => {
        const override = overrides[e.id];
        return override ? updateEnquiry(e, override) : e;
      });
  }, [data.enquiries, createdList, deletedIds, overrides]);

  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);
  const brokers = useMemo(() => summarizeBrokers(filtered), [filtered]);
  const items = useMemo(() => summarizeItems(filtered), [filtered]);

  const todayStart = periodStart("today") ?? 0;
  const todayCount = all.filter(
    (e) => e.timestamp && new Date(e.timestamp).getTime() >= todayStart,
  ).length;

  const brokerOptions = useMemo(
    () => summarizeBrokers(all).map((b) => ({ value: b.brokerKey, label: b.broker })),
    [all],
  );
  const itemOptions = useMemo(
    () => summarizeItems(all).map((i) => ({ value: i.itemKey, label: i.item })),
    [all],
  );

  const brokerNames = useMemo(() => summarizeBrokers(all).map((b) => b.broker), [all]);
  const itemNames = useMemo(() => summarizeItems(all).map((i) => i.item), [all]);

  const live = data.source === "live";

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2 text-muted-foreground">
            <FileSpreadsheet className="size-3.5" />
            {data.sheetTitle}
          </p>
          <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">
            Enquiry <span className="text-primary">Desk</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Owner view — broker, item, rate aur har deal ek jagah.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <p
              className={cn(
                "eyebrow inline-flex items-center gap-1.5",
                live ? "text-primary" : "text-sale",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  live ? "animate-pulse bg-primary" : "bg-sale",
                )}
              />
              {live ? "Live from sheet" : "Saved copy"}
            </p>
            <p className="num mt-0.5 text-muted-foreground">
              Updated {formatDateTime(data.fetchedAt)}
            </p>
          </div>
          {Object.keys(overrides).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetOverrides}
              className="gap-1.5 border-dashed text-xs text-muted-foreground hover:text-foreground"
              title="Reset all manual edits back to original sheet values"
            >
              <RotateCcw className="size-3" />
              Reset {Object.keys(overrides).length} edits
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setOpenNewEnquiry(true)}
            className="h-8 gap-1.5 bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            <span>+ New Enquiry</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenSheetSetup(true)}
            className={cn(
              "gap-1.5",
              webhookUrl
                ? "border-green-600/40 text-green-700 hover:text-green-800"
                : "border-dashed text-muted-foreground hover:text-foreground",
            )}
            title="Google Sheet se connect karein"
          >
            <Link2 className="size-3.5" />
            {webhookUrl ? "Sheet Connected" : "Sheet Setup"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        <KpiStrip list={filtered} todayCount={todayCount} />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          brokers={brokerOptions}
          items={itemOptions}
        />
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <ItemBoard
            items={items}
            enquiries={filtered}
            brokers={brokers}
            onOpenItem={setOpenItem}
            onOpenBroker={setOpenBroker}
            onDeleteEnquiry={handleDeleteEnquiry}
          />
          <ItemRateBoard items={items} onOpenItem={setOpenItem} />
        </div>
        <EnquiryTable
          list={filtered}
          onBroker={setOpenBroker}
          onItem={setOpenItem}
          onUpdate={handleUpdateEnquiry}
          onDelete={handleDeleteEnquiry}
          onOpenNewForm={() => setOpenNewEnquiry(true)}
        />
      </div>

      <BrokerSheet
        brokerKey={openBroker}
        all={all}
        onClose={() => setOpenBroker(null)}
        onUpdateEnquiry={handleUpdateEnquiry}
        onDeleteEnquiry={handleDeleteEnquiry}
      />
      <ItemSheet
        itemKey={openItem}
        all={all}
        onClose={() => setOpenItem(null)}
        onOpenBroker={setOpenBroker}
        onUpdateEnquiry={handleUpdateEnquiry}
        onDeleteEnquiry={handleDeleteEnquiry}
      />
      <NewEnquiryDialog
        open={openNewEnquiry}
        onOpenChange={setOpenNewEnquiry}
        existingBrokers={brokerNames}
        existingItems={itemNames}
        onCreated={handleEnquiryCreated}
      />
      <SheetSetupDialog
        open={openSheetSetup}
        onOpenChange={setOpenSheetSetup}
        onConnected={(connectedUrl: string) => {
          setWebhookUrl(connectedUrl);
          refetch();
        }}
      />
    </div>
  );
}
