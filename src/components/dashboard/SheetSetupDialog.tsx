import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  Loader2,
  Settings2,
  XCircle,
} from "lucide-react";
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
  "https://docs.google.com/spreadsheets/d/13CRg_4u7HSeMELiBYF2q5UuVhkNf_DEJPViOaAPwIrk/edit?gid=1754193838#gid=1754193838";

export const APPS_SCRIPT_CODE = `// ============================================================================
// Google Apps Script for Broker Dashboard -> "Form Deta" & "Form responses 1"
// Spreadsheet ID: 13CRg_4u7HSeMELiBYF2q5UuVhkNf_DEJPViOaAPwIrk
// ============================================================================

var SPREADSHEET_ID = "13CRg_4u7HSeMELiBYF2q5UuVhkNf_DEJPViOaAPwIrk";
var SHEET_NAME = "Form Deta";
var TARGET_GID = 1754193838;

var HEADERS = [
  "Timestamp",
  "Broker",
  "Party Name",
  "Item",
  "Delivery / Pickup Location",
  "Delivery / Motorcut",
  "Rate",
  "Bill / Kachha",
  "CD Condition",
  "Other Condition",
  "Remarks",
  "ENQUIRY FOR"
];

function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch(e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getTargetSheet() {
  var ss = getSpreadsheet();
  if (!ss) throw new Error("Spreadsheet nahi mila! ID: " + SPREADSHEET_ID);

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === SHEET_NAME.toLowerCase()) {
      return sheets[i];
    }
  }

  for (var j = 0; j < sheets.length; j++) {
    if (sheets[j].getSheetId() === TARGET_GID) {
      return sheets[j];
    }
  }

  sheet = ss.insertSheet(SHEET_NAME);
  sheet.appendRow(HEADERS);
  return sheet;
}

function mapHeadersToColumns(headerRow) {
  var headerMap = {
    "timestamp": 0,
    "broker": 1,
    "party": 2,
    "party name": 2,
    "item": 3,
    "delivery / pickup location": 4,
    "location": 4,
    "delivery / motorcut": 5,
    "mode": 5,
    "rate": 6,
    "bill / k": 7,
    "bill / kachha": 7,
    "cd": 8,
    "cd condition": 8,
    "other condition": 9,
    "remarks": 10,
    "enquiry for": 11
  };

  var colIndices = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
  for (var i = 0; i < headerRow.length; i++) {
    var h = String(headerRow[i] || "").trim().toLowerCase();
    if (headerMap[h] !== undefined && colIndices[headerMap[h]] === -1) {
      colIndices[headerMap[h]] = i;
    }
  }

  for (var k = 0; k < 12; k++) {
    if (colIndices[k] === -1 && k < headerRow.length) {
      colIndices[k] = k;
    }
  }
  return colIndices;
}

function doPost(e) {
  try {
    var sheet = getTargetSheet();
    var data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch(parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var now = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");
    var rateVal = (data.rate !== undefined && data.rate !== null && data.rate !== "") ? String(data.rate) : "";

    var row = [
      data.timestamp || now,
      data.broker || "",
      data.party || "",
      data.item || "",
      data.location || "",
      data.mode || "Delivery",
      rateVal,
      data.billType || "Bill",
      data.cd || "",
      data.otherCondition || "",
      data.remarks || "",
      (data.enquiryFor || "PURCHASE").toUpperCase()
    ];

    sheet.appendRow(row);
    return jsonResponse({ success: true, message: "Row added to " + sheet.getName(), row: row });
  } catch(err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    var ss = getSpreadsheet();
    if (!ss) throw new Error("Spreadsheet nahi mila!");

    if (e && e.parameter && (e.parameter.broker || e.parameter.item)) {
      var targetSheet = getTargetSheet();
      var p = e.parameter;
      var now = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");
      var rateVal = (p.rate !== undefined && p.rate !== null && p.rate !== "") ? String(p.rate) : "";

      var row = [
        p.timestamp || now,
        p.broker || "",
        p.party || "",
        p.item || "",
        p.location || "",
        p.mode || "Delivery",
        rateVal,
        p.billType || "Bill",
        p.cd || "",
        p.otherCondition || "",
        p.remarks || "",
        (p.enquiryFor || "PURCHASE").toUpperCase()
      ];

      targetSheet.appendRow(row);
      return jsonResponse({ success: true, message: "Row added via GET to " + targetSheet.getName(), row: row });
    }

    var allSheets = ss.getSheets();
    var combinedDataRows = [];
    var seenKeys = {};

    for (var s = 0; s < allSheets.length; s++) {
      var sheet = allSheets[s];
      var name = sheet.getName().trim();
      var nameLower = name.toLowerCase();

      var isResponseSheet = (
        nameLower === SHEET_NAME.toLowerCase() ||
        sheet.getSheetId() === TARGET_GID ||
        nameLower.indexOf("form response") !== -1 ||
        nameLower.indexOf("form deta") !== -1
      );

      if (!isResponseSheet) continue;

      var sheetValues = sheet.getDataRange().getValues();
      if (!sheetValues || sheetValues.length <= 1) continue;

      var header = sheetValues[0];
      var colMap = mapHeadersToColumns(header);

      for (var r = 1; r < sheetValues.length; r++) {
        var srcRow = sheetValues[r];
        if (!srcRow || srcRow.length === 0) continue;

        var standardizedRow = [];
        for (var c = 0; c < 12; c++) {
          var srcIdx = colMap[c];
          var cellVal = (srcIdx !== -1 && srcRow[srcIdx] !== undefined) ? srcRow[srcIdx] : "";
          if (cellVal instanceof Date) {
            cellVal = Utilities.formatDate(cellVal, "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");
          }
          standardizedRow.push(cellVal);
        }

        var brokerVal = String(standardizedRow[1] || "").trim();
        var itemVal = String(standardizedRow[3] || "").trim();
        var tsVal = String(standardizedRow[0] || "").trim();

        if (!brokerVal && !itemVal) continue;

        var rowKey = (tsVal + "|" + brokerVal.toLowerCase() + "|" + itemVal.toLowerCase()).replace(/\s+/g, "");
        if (!seenKeys[rowKey]) {
          seenKeys[rowKey] = true;
          combinedDataRows.push(standardizedRow);
        }
      }
    }

    if (combinedDataRows.length === 0) {
      var singleSheet = getTargetSheet();
      var singleVals = singleSheet.getDataRange().getValues();
      return jsonResponse({ success: true, sheetName: singleSheet.getName(), values: singleVals });
    }

    var finalValues = [HEADERS].concat(combinedDataRows);
    return jsonResponse({
      success: true,
      sheetName: "Form Deta + Responses",
      totalRows: combinedDataRows.length,
      values: finalValues
    });
  } catch(err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

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
  const [testMessage, setTestMessage] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const isSpreadsheetUrl = url.trim().includes("docs.google.com/spreadsheets");
  const isValidScriptUrl = url.trim().includes("script.google.com/macros/s/");

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopied(true);
      toast.success("✓ Code copy ho gaya! Ab Apps Script me paste karein.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Code copy nahi ho saka. Kripya niche se manually select karein.");
    }
  };

  const handleTest = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Pehle Apps Script Web App URL paste karein.");
      return;
    }

    if (isSpreadsheetUrl) {
      toast.error(
        "Ye Google Sheet ka link hai! Step 2 me code Deploy karke mila Web App URL daalein.",
      );
      setTestResult("fail");
      setTestMessage(
        "Ye Google Sheet ka link hai. Apps Script Web App ka URL daalein (https://script.google.com/macros/s/.../exec)",
      );
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestMessage("");

    try {
      const res = await initWorksheet({ data: { webhookUrl: trimmed } });
      if (res.success) {
        setTestResult("ok");
        setTestMessage(res.message);
        toast.success(res.message);
      } else {
        setTestResult("fail");
        setTestMessage(res.error ?? "Connection fail hua.");
        toast.error(res.error ?? "Connection test failed.");
      }
    } catch (err) {
      console.error(err);
      setTestResult("fail");
      setTestMessage("Network error — URL check karein.");
      toast.error("Network error — kripya URL check karein.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = url.trim();
    if (trimmed && isSpreadsheetUrl) {
      toast.error(
        "Google Sheet ka link save nahi ho sakta! Apps Script Web App URL (script.google.com/macros/s/.../exec) daalein.",
      );
      return;
    }

    saveWebhookUrl(trimmed);
    if (trimmed) {
      toast.success("✓ Google Sheet Web App URL save ho gaya! Ab form data seedha sheet me post hoga.");
      onConnected?.(trimmed);
    } else {
      toast.info("URL hata diya gaya.");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto sm:rounded-xl">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-primary" />
            <span className="eyebrow text-xs font-bold text-primary">Direct Google Sheet Setup</span>
          </div>
          <DialogTitle className="text-xl font-bold">
            Google Sheet "Form Deta" se Direct Connect Karein
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Form submit karne par data seedhe aapki Google Sheet ke <b>"Form Deta"</b> tab me post hoga.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 text-sm">
          {/* Step 1 */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                STEP 1
              </span>
              <a
                href={SPREADSHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <ExternalLink className="size-3" />
                Google Sheet Kholen (Tab: Form Deta)
              </a>
            </div>
            <p className="text-xs text-foreground font-medium">
              Apni Google Sheet me upar menu se: <b>Extensions → Apps Script</b> par click karein.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                STEP 2
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="h-7 gap-1.5 text-xs font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Code Copy Karein
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Apps Script me purana code hata kar ye naya code paste karein aur <b>Ctrl + S</b> dabayein:
            </p>
            <pre className="mt-1 max-h-48 overflow-y-auto rounded bg-muted px-3 py-2 text-[10px] leading-relaxed select-all border border-border/60 font-mono">
              {APPS_SCRIPT_CODE}
            </pre>
          </div>

          {/* Step 3 */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              STEP 3 — Deploy as Web App
            </span>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>1. Upar neele rang ke <b>Deploy</b> button par click karein → <b>New deployment</b> chunein.</p>
              <p>2. Bayi taraf gear (⚙️) icon se <b>Web app</b> select karein.</p>
              <p>
                3. <b>Execute as:</b> <span className="font-semibold text-foreground">Me (Aapka Google account)</span>
              </p>
              <p>
                4. <b>Who has access:</b> <span className="rounded bg-primary/15 px-1.5 py-0.5 font-bold text-primary">Anyone (Koi bhi)</span>
                <span className="ml-1 text-[11px] text-destructive font-semibold">⚠️ Zaroori: "Anyone" hi select karein!</span>
              </p>
              <p>5. <b>Deploy</b> button dabayein → <b>Authorize access</b> → Apna Google account select karein → <b>Allow</b> karein.</p>
              <p>6. <b>Web app URL</b> ko copy karein (ye <code>https://script.google.com/macros/s/.../exec</code> se shuru hota hai).</p>
            </div>
          </div>

          {/* Step 4 — URL Input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="webhook-url" className="text-xs font-bold flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  STEP 4
                </span>
                Web App URL Yahan Paste Karein
              </Label>
              {url && isValidScriptUrl && (
                <span className="text-[11px] font-semibold text-green-600">✓ Valid Script URL format</span>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestResult(null);
                  setTestMessage("");
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing || !url.trim() || isSpreadsheetUrl}
                className="shrink-0"
              >
                {testing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : testResult === "ok" ? (
                  <CheckCircle2 className="size-4 text-green-600" />
                ) : testResult === "fail" ? (
                  <XCircle className="size-4 text-destructive" />
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>

            {/* Error if user pasted google sheet url */}
            {isSpreadsheetUrl && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <p className="font-bold flex items-center gap-1">
                  <XCircle className="size-3.5" /> Ye Google Sheet ka link hai!
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Form ka data post karne ke liye Google Apps Script ka Web App URL chahiye. Upar Step 2 ka code Apps Script me daalkar Step 3 se <b>Deploy</b> karein, aur wahan mila Web app URL yahan paste karein.
                </p>
              </div>
            )}

            {testResult === "ok" && (
              <div className="rounded-lg border border-green-600/40 bg-green-500/10 p-2.5 text-xs font-medium text-green-700 dark:text-green-300">
                {testMessage || "✓ Connection successful! Ab niche 'Save & Connect' karein."}
              </div>
            )}

            {testResult === "fail" && !isSpreadsheetUrl && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                {testMessage || "✗ Connection fail hua. Script check karein aur ensure karein ki 'Who has access: Anyone' chuna hai."}
              </div>
            )}
          </div>

          {/* Current status */}
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              <b>Current Status:</b>{" "}
              {loadWebhookUrl() ? (
                <span className="font-semibold text-green-600">✓ Connected</span>
              ) : (
                <span className="text-sale font-semibold">Not connected</span>
              )}
            </span>
            {loadWebhookUrl() && (
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[280px]">
                {loadWebhookUrl()}
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4 gap-2">
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUrl("");
                setTestResult(null);
                setTestMessage("");
              }}
            >
              URL Hatao
            </Button>
          )}
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
            disabled={isSpreadsheetUrl}
            className="bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Save &amp; Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
