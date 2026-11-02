import { FileSpreadsheet, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEnquiryFromInput,
  formatSheetTimestamp,
  loadWebhookUrl,
  type Enquiry,
  type EnquiryType,
  type NewEnquiryInput,
} from "@/lib/enquiries";
import { addEnquiry } from "@/lib/enquiries.functions";

export function NewEnquiryDialog({
  open,
  onOpenChange,
  existingBrokers = [],
  existingItems = [],
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingBrokers?: string[];
  existingItems?: string[];
  onCreated?: (enquiry: Enquiry) => void;
}) {
  const [broker, setBroker] = useState("");
  const [party, setParty] = useState("");
  const [item, setItem] = useState("");
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState("Delivery");
  const [rate, setRate] = useState("");
  const [billType, setBillType] = useState("Bill");
  const [cd, setCd] = useState("");
  const [otherCondition, setOtherCondition] = useState("");
  const [remarks, setRemarks] = useState("");
  const [enquiryFor, setEnquiryFor] = useState<EnquiryType>("PURCHASE");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setBroker("");
    setParty("");
    setItem("");
    setLocation("");
    setMode("Delivery");
    setRate("");
    setBillType("Bill");
    setCd("");
    setOtherCondition("");
    setRemarks("");
    setEnquiryFor("PURCHASE");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!broker.trim()) {
      toast.error("Kripya Broker ka naam daalein.");
      return;
    }
    if (!item.trim()) {
      toast.error("Kripya Item ka naam daalein.");
      return;
    }

    setIsSubmitting(true);

    const timestamp = formatSheetTimestamp();
    const payload: NewEnquiryInput = {
      timestamp,
      broker: broker.trim(),
      party: party.trim(),
      item: item.trim(),
      location: location.trim(),
      mode: mode.trim(),
      rate: rate.trim() ? Number(rate.replace(/[₹,\s]/g, "")) : null,
      billType: billType.trim(),
      cd: cd.trim(),
      otherCondition: otherCondition.trim(),
      remarks: remarks.trim(),
      enquiryFor,
    };

    try {
      // 1. Post to Google Sheet via server function (A1:L)
      const webhookUrl = loadWebhookUrl();
      const enquiryPayload: { enquiry: NewEnquiryInput; webhookUrl?: string } = {
        enquiry: payload,
      };
      if (webhookUrl) enquiryPayload.webhookUrl = webhookUrl;
      const res = await addEnquiry({ data: enquiryPayload });

      // 2. Create local Enquiry object to immediately show in dashboard
      const newEnquiry = createEnquiryFromInput(payload);
      onCreated?.(newEnquiry);

      if (res.liveSaved) {
        toast.success(`Deal form Google Sheet me post ho gaya! (Row: ${broker} - ${item})`);
      } else {
        toast.success(
          `Deal dashboard me jud gaya! (Note: Live sheet connect hone par Google Sheet me sync ho jayega).`,
        );
      }

      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to post enquiry", err);
      // Still allow local creation so owner work is never blocked
      const fallbackEnquiry = createEnquiryFromInput(payload);
      onCreated?.(fallbackEnquiry);
      toast.success("Deal dashboard me add ho gaya (saved locally).");
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:rounded-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <span className="eyebrow flex items-center gap-1.5 text-xs text-primary font-bold">
                <FileSpreadsheet className="size-3.5" />
                Google Sheet A1:L Entry Form
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                Live Post
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold">
              Naya Deal / Enquiry Form
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Form submit karne par data seedhe &ldquo;Enquiry Capture (Responses)&rdquo; sheet ke A1:L columns me post hoga.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 text-sm">
            {/* Timestamp Notice (Col A) */}
            <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-3.5 py-2 text-xs">
              <span className="text-muted-foreground">
                <b>Col A (Timestamp):</b> Current India Time (IST) apne aap record hoga.
              </span>
              <span className="num font-mono text-[11px] font-semibold text-foreground">
                {formatSheetTimestamp()}
              </span>
            </div>

            {/* Row 1: Broker (Col B) & Party Name (Col C) */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="form-broker" className="text-xs font-semibold">
                  Broker Name (Col B) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="form-broker"
                  list="broker-list"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  placeholder="e.g. Milan Desai, Ramakant Agrawal"
                  required
                />
                <datalist id="broker-list">
                  {existingBrokers.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-party" className="text-xs font-semibold">
                  Party Name (Col C)
                </Label>
                <Input
                  id="form-party"
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  placeholder="e.g. Raipur Mill, Khandelwal Traders"
                />
              </div>
            </div>

            {/* Row 2: Item (Col D) & Deal Type (Col L) */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="form-item" className="text-xs font-semibold">
                  Item (Col D) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="form-item"
                  list="item-list"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="e.g. Sarna, Old Mota, IR Paddy New"
                  required
                />
                <datalist id="item-list">
                  {existingItems.map((it) => (
                    <option key={it} value={it} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-for" className="text-xs font-semibold">
                  ENQUIRY FOR (Col L)
                </Label>
                <Select
                  value={enquiryFor}
                  onValueChange={(val) => setEnquiryFor(val as EnquiryType)}
                >
                  <SelectTrigger id="form-for">
                    <SelectValue placeholder="Deal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASE">PURCHASE (Kharid)</SelectItem>
                    <SelectItem value="SALE">SALE (Bikri)</SelectItem>
                    <SelectItem value="OTHER">OTHER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Rate (Col G) & Delivery / Motorcut (Col F) */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="form-rate" className="text-xs font-semibold">
                  Rate (Col G)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="form-rate"
                    type="number"
                    step="any"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g. 2440"
                    className="pl-7 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-mode" className="text-xs font-semibold">
                  Delivery / Motorcut (Col F)
                </Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="form-mode">
                    <SelectValue placeholder="Delivery mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Delivery">Delivery</SelectItem>
                    <SelectItem value="Motorcut">Motorcut</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Location (Col E) & Bill / K (Col H) */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="form-location" className="text-xs font-semibold">
                  Delivery / Pickup Location (Col E)
                </Label>
                <Input
                  id="form-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kharora, Pithora, Bemetara, Basna"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-bill" className="text-xs font-semibold">
                  Bill / K (Col H)
                </Label>
                <Select value={billType} onValueChange={setBillType}>
                  <SelectTrigger id="form-bill">
                    <SelectValue placeholder="Bill or K" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bill">Bill</SelectItem>
                    <SelectItem value="K">K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 5: CD Condition (Col I) & Other Condition (Col J) */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="form-cd" className="text-xs font-semibold">
                  CD Condition (Col I)
                </Label>
                <Input
                  id="form-cd"
                  value={cd}
                  onChange={(e) => setCd(e.target.value)}
                  placeholder="e.g. 1.50%, 1.00%, 0"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-other" className="text-xs font-semibold">
                  Other Condition (Col J)
                </Label>
                <Input
                  id="form-other"
                  value={otherCondition}
                  onChange={(e) => setOtherCondition(e.target.value)}
                  placeholder="e.g. 5000 bags, 10 DAYS"
                />
              </div>
            </div>

            {/* Row 6: Remarks (Col K) */}
            <div className="space-y-1.5">
              <Label htmlFor="form-remarks" className="text-xs font-semibold">
                Remarks (Col K)
              </Label>
              <Input
                id="form-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. RRC Fresh Milling, Quality good, etc."
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-2 bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sheet me Post ho raha hai...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Submit to Google Sheet
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

