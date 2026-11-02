import { useEffect, useState } from "react";

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
import { type Enquiry, type EnquiryType, formatDateTime } from "@/lib/enquiries";

export function EditDealDialog({
  enquiry,
  open,
  onOpenChange,
  onSave,
}: {
  enquiry: Enquiry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: Partial<Enquiry>) => void;
}) {
  const [rate, setRate] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [mode, setMode] = useState<string>("Delivery");
  const [billType, setBillType] = useState<string>("Bill");
  const [cd, setCd] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [enquiryFor, setEnquiryFor] = useState<EnquiryType>("PURCHASE");
  const [item, setItem] = useState<string>("");
  const [party, setParty] = useState<string>("");

  useEffect(() => {
    if (enquiry) {
      setRate(enquiry.rate !== null ? String(enquiry.rate) : "");
      setLocation(enquiry.location || "");
      setMode(enquiry.mode || "Delivery");
      setBillType(enquiry.billType || "Bill");
      setCd(enquiry.cd || "");
      setRemarks([enquiry.otherCondition, enquiry.remarks].filter(Boolean).join(" · ") || "");
      setEnquiryFor(enquiry.enquiryFor || "PURCHASE");
      setItem(enquiry.item || "");
      setParty(enquiry.party || "");
    }
  }, [enquiry]);

  if (!enquiry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(enquiry.id, {
      rate: rate.trim() === "" ? null : Number(rate.replace(/[₹,\s]/g, "")),
      location: location.trim(),
      mode: mode.trim(),
      billType: billType.trim(),
      cd: cd.trim(),
      remarks: remarks.trim(),
      otherCondition: "", // merged into remarks
      enquiryFor,
      item: item.trim() || enquiry.item,
      party: party.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden sm:rounded-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <span className="eyebrow text-xs text-primary">Edit Deal Data</span>
              <span className="text-xs text-muted-foreground">· Row {enquiry.id}</span>
            </div>
            <DialogTitle className="text-xl font-bold">
              {enquiry.broker} — {enquiry.item}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Deals table ke editable columns ko yahan se update karein. Time:{" "}
              {formatDateTime(enquiry.timestamp, enquiry.timestampLabel)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 text-sm">
            {/* Rate & Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-rate" className="text-xs font-semibold">
                  Rate (₹) <span className="text-primary">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="edit-rate"
                    type="number"
                    step="any"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g. 2440"
                    className="pl-6 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-mode" className="text-xs font-semibold">
                  Delivery Mode
                </Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="edit-mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Delivery">Delivery</SelectItem>
                    <SelectItem value="Motorcut">Motorcut</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bill/K & CD */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-billType" className="text-xs font-semibold">
                  Bill / K Type
                </Label>
                <Select value={billType} onValueChange={setBillType}>
                  <SelectTrigger id="edit-billType">
                    <SelectValue placeholder="Bill or K" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bill">Bill</SelectItem>
                    <SelectItem value="K">K</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cd" className="text-xs font-semibold">
                  CD Condition
                </Label>
                <Input
                  id="edit-cd"
                  value={cd}
                  onChange={(e) => setCd(e.target.value)}
                  placeholder="e.g. 1.50% or 0"
                />
              </div>
            </div>

            {/* Location & For */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-location" className="text-xs font-semibold">
                  Location (Pickup / Delivery)
                </Label>
                <Input
                  id="edit-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kharora, Pithora"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-enquiryFor" className="text-xs font-semibold">
                  Deal For (Type)
                </Label>
                <Select
                  value={enquiryFor}
                  onValueChange={(v) => setEnquiryFor(v as EnquiryType)}
                >
                  <SelectTrigger id="edit-enquiryFor">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASE">Purchase (Buy)</SelectItem>
                    <SelectItem value="SALE">Sale (Sell)</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Item & Party */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-item" className="text-xs font-semibold">
                  Item
                </Label>
                <Input
                  id="edit-item"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="e.g. Sarna, Old Mota"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-party" className="text-xs font-semibold">
                  Party Name
                </Label>
                <Input
                  id="edit-party"
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  placeholder="Party Name"
                />
              </div>
            </div>

            {/* Conditions & Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-remarks" className="text-xs font-semibold">
                Conditions / Remarks
              </Label>
              <Input
                id="edit-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. 5000 bags, 10 days payment"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-primary text-primary-foreground">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

