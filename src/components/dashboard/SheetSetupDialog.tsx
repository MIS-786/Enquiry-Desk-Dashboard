import { CheckCircle2, ExternalLink, Loader2, Settings2, XCircle } from "lucide-react";
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
import { loadWebhookUrl, saveWebhookUrl } from "@/lib/enquiries";
import { initWorksheet } from "@/lib/enquiries.functions";

const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/13CRg_4u7HSeMELiBYF2q5UuVhkNf_DEJPViOaAPwIrk/edit";

export function SheetSetupDialog({
  open,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: (url: string) => void;
}) {
  const [url, setUrl] = useState(() => loadWebhookUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  const handleTest = async () => {
    if (!url.trim()) {
      toast.error("Pehle Apps Script Web App URL paste karein.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await initWorksheet({ data: { webhookUrl: url.trim() } });
      if (res.success) {
        setTestResult("ok");
        toast.success(res.message);
      } else {
        setTestResult("fail");
        toast.error(res.error ?? "Connection test failed.");
      }
    } catch (err) {
      console.error(err);
      setTestResult("fail");
      toast.error("Network error — kripya URL check karein.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = url.trim();
    saveWebhookUrl(trimmed);
    if (trimmed) {
      toast.success("Google Apps Script URL save ho gaya! Ab form data sheet me jayega.");
      onConnected?.(trimmed);
    } else {
      toast.info("URL hata diya gaya. Dashboard snapshot mode me aa jayega.");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto sm:rounded-xl">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-primary" />
            <span className="eyebrow text-xs font-bold text-primary">Sheet Connection Setup</span>
          </div>
          <DialogTitle className="text-xl font-bold">Google Sheet se Connect Karein</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Google Apps Script deploy karein, phir URL yahan paste karein. Iske baad form ka data
            seedhe sheet me jayega.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 text-sm">
          {/* Step 1 */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="font-bold text-xs eyebrow text-primary">STEP 1 — Google Sheet kholen</p>
            <a
              href={SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              Enquiry Capture (Responses) Sheet Kholen
            </a>
            <p className="text-xs text-muted-foreground">
              Phir: <b>Extensions → Apps Script → Code.gs</b> me purana code hatao, naya paste karo.
            </p>
          </div>

          {/* Step 2 — Code */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="font-bold text-xs eyebrow text-primary">STEP 2 — Ye Code Paste Karein</p>
            <pre className="mt-1 rounded bg-muted px-3 py-2 text-[10px] leading-relaxed overflow-x-auto select-all border border-border/60">
{`const SHEET_NAME = "Form responses 1";
function doPost(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = JSON.parse(e.postData.contents);
  const now = new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"});
  sheet.appendRow([data.timestamp||now, data.broker||"",
    data.party||"", data.item||"", data.location||"",
    data.mode||"Delivery", data.rate||"", data.billType||"Bill",
    data.cd||"", data.otherCondition||"", data.remarks||"",
    (data.enquiryFor||"PURCHASE").toUpperCase()]);
  return ContentService.createTextOutput(JSON.stringify({success:true}))
    .setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({success:true,values:values}))
    .setMimeType(ContentService.MimeType.JSON);
}`}
            </pre>
            <p className="text-xs text-muted-foreground">
              Save (Ctrl+S) → <b>Deploy → New deployment → Web app</b> → Execute as: Me → Access:
              Anyone → Deploy → Allow → <b>Copy Web app URL</b>
            </p>
          </div>

          {/* Step 3 — URL input */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url" className="text-xs font-bold">
              STEP 3 — Web App URL Yahan Paste Karein
            </Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing || !url.trim()}
                className="shrink-0"
              >
                {testing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : testResult === "ok" ? (
                  <CheckCircle2 className="size-4 text-green-600" />
                ) : testResult === "fail" ? (
                  <XCircle className="size-4 text-destructive" />
                ) : (
                  "Test"
                )}
              </Button>
            </div>
            {testResult === "ok" && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Connection successful! Ab "Save &amp; Connect" karein.
              </p>
            )}
            {testResult === "fail" && (
              <p className="text-xs text-destructive">
                ✗ Connection fail hua. URL check karein ya script firse deploy karein.
              </p>
            )}
          </div>

          {/* Current status */}
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <b>Current status:</b>{" "}
            {loadWebhookUrl()
              ? `Connected — ${loadWebhookUrl().slice(0, 55)}…`
              : "Not connected (dashboard snapshot mode me hai)"}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setUrl("");
              setTestResult(null);
            }}
          >
            URL Hatao
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Save &amp; Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

