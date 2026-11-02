import { ArrowDownUp, Check, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDateTime,
  formatRate,
  type Enquiry,
  type EnquiryType,
} from "@/lib/enquiries";
import { cn } from "@/lib/utils";
import { EditDealDialog } from "./EditDealDialog";
import { TypeBadge } from "./TypeBadge";

type SortKey = "time" | "rate";

interface RowDraft {
  rate: string;
  location: string;
  mode: string;
  billType: string;
  cd: string;
  remarks: string;
  enquiryFor: EnquiryType;
  item: string;
  party: string;
}

export function EnquiryTable({
  list,
  onBroker,
  onItem,
  onUpdate,
  onDelete,
  onOpenNewForm,
  title = "All enquiries",
  compact = false,
}: {
  list: Enquiry[];
  onBroker?: (brokerKey: string) => void;
  onItem?: (itemKey: string) => void;
  onUpdate?: (id: string, patch: Partial<Enquiry>) => void;
  onDelete?: (id: string) => void;
  onOpenNewForm?: () => void;
  title?: string;
  compact?: boolean;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "time", dir: -1 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RowDraft | null>(null);
  const [dialogEnquiry, setDialogEnquiry] = useState<Enquiry | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const copy = [...list];
    copy.sort((a, b) => {
      if (sort.key === "rate") return ((a.rate ?? -1) - (b.rate ?? -1)) * sort.dir;
      return a.timestamp.localeCompare(b.timestamp) * sort.dir;
    });
    return copy;
  }, [list, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));

  const startEdit = (e: Enquiry) => {
    if (!onUpdate) return;
    setEditingId(e.id);
    setDraft({
      rate: e.rate !== null ? String(e.rate) : "",
      location: e.location || "",
      mode: e.mode || "Delivery",
      billType: e.billType || "Bill",
      cd: e.cd || "",
      remarks: [e.otherCondition, e.remarks].filter(Boolean).join(" · "),
      enquiryFor: e.enquiryFor || "PURCHASE",
      item: e.item || "",
      party: e.party || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = (id: string) => {
    if (!draft || !onUpdate) return;
    const numRate = draft.rate.trim() === "" ? null : Number(draft.rate.replace(/[₹,\s]/g, ""));
    onUpdate(id, {
      rate: Number.isFinite(numRate) ? numRate : null,
      location: draft.location.trim(),
      mode: draft.mode.trim(),
      billType: draft.billType.trim(),
      cd: draft.cd.trim(),
      remarks: draft.remarks.trim(),
      otherCondition: "",
      enquiryFor: draft.enquiryFor,
      item: draft.item.trim(),
      party: draft.party.trim(),
    });
    setEditingId(null);
    setDraft(null);
  };

  const handleKeyDown = (ev: React.KeyboardEvent, id: string) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      saveEdit(id);
    } else if (ev.key === "Escape") {
      cancelEdit();
    }
  };

  return (
    <section className={cn(!compact && "surface overflow-hidden")}>
      {!compact && (
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow text-muted-foreground">Deal register</p>
              {onUpdate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Pencil className="size-3" /> Inline Editable
                </span>
              )}
            </div>
            <h2 className="mt-1 text-xl font-bold">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Tip: Click <Pencil className="inline size-3 text-primary" /> to edit columns directly
            </span>
            <span className="num text-sm text-muted-foreground">{rows.length} rows</span>
            {onOpenNewForm && (
              <Button
                size="sm"
                onClick={onOpenNewForm}
                className="h-8 gap-1.5 bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                <Plus className="size-3.5" />
                <span>+ New Enquiry</span>
              </Button>
            )}
          </div>
        </header>
      )}

      {compact && onUpdate && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/40 px-4 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Pencil className="size-3 text-primary" />
            <span>Kisi bhi row ko edit karne ke liye <b>Edit (✎)</b> button par click karein</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            Columns: Item, Location, Delivery, Rate, Bill/Kachhe, CD, Remarks, For
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/60">
            <tr className="eyebrow text-muted-foreground">
              {!compact && (
                <Th>
                  <SortBtn active={sort.key === "time"} onClick={() => toggle("time")}>
                    Time
                  </SortBtn>
                </Th>
              )}
              {!compact && <Th>Broker</Th>}
              {!compact && <Th>Party ✎</Th>}
              <Th>Item ✎</Th>
              <Th>Location ✎</Th>
              <Th>Delivery ✎</Th>
              <Th className="text-right">
                <SortBtn active={sort.key === "rate"} onClick={() => toggle("rate")}>
                  Rate ✎
                </SortBtn>
              </Th>
              <Th>Bill/K ✎</Th>
              <Th>CD ✎</Th>
              <Th>Conditions / Remarks ✎</Th>
              <Th>For ✎</Th>
              {(onUpdate || onDelete) && <Th className="text-right">Action</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((e) => {
              const isEditing = editingId === e.id && draft !== null;

              if (isEditing && draft) {
                return (
                  <tr
                    key={e.id}
                    className="bg-primary/5 align-middle ring-1 ring-inset ring-primary/30"
                    onKeyDown={(ev) => handleKeyDown(ev, e.id)}
                  >
                    {/* Timestamp */}
                    {!compact && (
                      <Td className="num whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(e.timestamp, e.timestampLabel)}
                      </Td>
                    )}

                    {/* Broker */}
                    {!compact && (
                      <Td className="font-semibold text-foreground">
                        {e.broker}
                      </Td>
                    )}

                    {/* Party */}
                    {!compact && (
                      <Td>
                        <Input
                          value={draft.party}
                          onChange={(ev) =>
                            setDraft({ ...draft, party: ev.target.value })
                          }
                          placeholder="Party"
                          className="h-8 w-28 bg-background text-xs"
                        />
                      </Td>
                    )}

                    {/* Item */}
                    <Td>
                      <Input
                        value={draft.item}
                        onChange={(ev) =>
                          setDraft({ ...draft, item: ev.target.value })
                        }
                        placeholder="Item"
                        className="h-8 w-28 bg-background text-xs font-semibold"
                        autoFocus
                      />
                    </Td>

                    {/* Location */}
                    <Td>
                      <Input
                        value={draft.location}
                        onChange={(ev) =>
                          setDraft({ ...draft, location: ev.target.value })
                        }
                        placeholder="Location"
                        className="h-8 w-28 bg-background text-xs"
                      />
                    </Td>

                    {/* Delivery Mode */}
                    <Td>
                      <select
                        value={draft.mode}
                        onChange={(ev) =>
                          setDraft({ ...draft, mode: ev.target.value })
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Delivery">Delivery</option>
                        <option value="Motorcut">Motorcut</option>
                      </select>
                    </Td>

                    {/* Rate */}
                    <Td className="text-right">
                      <div className="relative inline-flex items-center">
                        <span className="absolute left-2 text-xs font-bold text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="any"
                          value={draft.rate}
                          onChange={(ev) =>
                            setDraft({ ...draft, rate: ev.target.value })
                          }
                          placeholder="Rate"
                          className="h-8 w-24 bg-background pl-5 text-right text-xs font-bold"
                        />
                      </div>
                    </Td>

                    {/* Bill/K */}
                    <Td>
                      <select
                        value={draft.billType}
                        onChange={(ev) =>
                          setDraft({ ...draft, billType: ev.target.value })
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Bill">Bill</option>
                        <option value="Kachhe">Kache</option>
                      </select>
                    </Td>

                    {/* CD */}
                    <Td>
                      <Input
                        value={draft.cd}
                        onChange={(ev) =>
                          setDraft({ ...draft, cd: ev.target.value })
                        }
                        placeholder="CD %"
                        className="h-8 w-20 bg-background text-xs"
                      />
                    </Td>

                    {/* Conditions / Remarks */}
                    <Td>
                      <Input
                        value={draft.remarks}
                        onChange={(ev) =>
                          setDraft({ ...draft, remarks: ev.target.value })
                        }
                        placeholder="Remarks / 5000 bags"
                        className="h-8 min-w-[12rem] bg-background text-xs"
                      />
                    </Td>

                    {/* For */}
                    <Td>
                      <select
                        value={draft.enquiryFor}
                        onChange={(ev) =>
                          setDraft({
                            ...draft,
                            enquiryFor: ev.target.value as EnquiryType,
                          })
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="PURCHASE">Purchase</option>
                        <option value="SALE">Sale</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </Td>

                    {/* Action buttons */}
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          onClick={() => saveEdit(e.id)}
                          className="h-8 gap-1 bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                          title="Save changes (Enter)"
                        >
                          <Check className="size-3.5" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                          className="h-8 px-2 text-xs"
                          title="Cancel (Esc)"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              }

              return (
                <tr
                  key={e.id}
                  onDoubleClick={() => onUpdate && startEdit(e)}
                  className="group align-top transition-colors hover:bg-muted/40"
                >
                  {!compact && (
                    <Td className="num whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(e.timestamp, e.timestampLabel)}
                    </Td>
                  )}
                  {!compact && (
                    <Td>
                      <button
                        onClick={() => onBroker?.(e.brokerKey)}
                        className="whitespace-nowrap text-left font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {e.broker}
                      </button>
                    </Td>
                  )}
                  {!compact && (
                    <Td className="text-muted-foreground">{e.party || "—"}</Td>
                  )}
                  <Td className="font-medium">
                    {onItem ? (
                      <button
                        onClick={() => onItem(e.itemKey)}
                        className="text-left font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {e.item}
                      </button>
                    ) : (
                      e.item
                    )}
                  </Td>
                  <Td>{e.location || "—"}</Td>
                  <Td>
                    {e.mode ? (
                      <span className="inline-flex rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">
                        {e.mode}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="num text-right font-semibold text-foreground">
                    {formatRate(e.rate)}
                  </Td>
                  <Td>
                    {e.billType ? (
                      <span className="font-medium">{e.billType}</span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="num">{e.cd || "—"}</Td>
                  <Td className="max-w-[16rem] text-muted-foreground">
                    {[e.otherCondition, e.remarks].filter(Boolean).join(" · ") || "—"}
                  </Td>
                  <Td>
                    <TypeBadge type={e.enquiryFor} label={e.enquiryForLabel} />
                  </Td>

                  {/* Actions Column */}
                  {(onUpdate || onDelete) && (
                    <Td className="text-right">
                      {confirmDeleteId === e.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[11px] font-medium text-destructive pr-1">
                            Delete?
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              onDelete?.(e.id);
                              setConfirmDeleteId(null);
                            }}
                            className="h-7 gap-1 px-2 text-xs font-semibold"
                            title="Haan, delete karo"
                          >
                            <Check className="size-3" />
                            Haan
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-7 px-2 text-xs"
                            title="Nahin, cancel"
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1 opacity-75 transition-opacity group-hover:opacity-100">
                          {onUpdate && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(e)}
                                className="h-7 gap-1 px-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary"
                                title="Quick inline edit"
                              >
                                <Pencil className="size-3" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDialogEnquiry(e)}
                                className="h-7 px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="Open full edit form dialog"
                              >
                                <ExternalLink className="size-3" />
                              </Button>
                            </>
                          )}
                          {onDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDeleteId(e.id)}
                              className="h-7 px-1.5 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                              title="Is entry ko delete karo"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </Td>
                  )}
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={compact ? (onUpdate || onDelete ? 9 : 8) : (onUpdate || onDelete ? 12 : 11)}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
                  Is filter me koi enquiry nahi mili.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Form Modal Dialog */}
      <EditDealDialog
        enquiry={dialogEnquiry}
        open={!!dialogEnquiry}
        onOpenChange={(o) => !o && setDialogEnquiry(null)}
        onSave={(id, patch) => {
          onUpdate?.(id, patch);
          setDialogEnquiry(null);
        }}
      />
    </section>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-2.5 text-left font-medium", className)}>{children}</th>;
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}

function SortBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 uppercase hover:text-foreground",
        active && "text-foreground",
      )}
    >
      {children}
      <ArrowDownUp className="size-3" />
    </button>
  );
}
