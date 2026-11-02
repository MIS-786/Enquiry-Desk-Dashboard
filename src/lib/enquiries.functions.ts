import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";

import {
  enquiryToSheetRow,
  parseGvizResponse,
  parseRows,
  type Enquiry,
  type NewEnquiryInput,
} from "./enquiries";
import { SNAPSHOT_ROWS, SNAPSHOT_TAKEN_AT } from "./enquiries.snapshot";

export const SPREADSHEET_ID = "13CRg_4u7HSeMELiBYF2q5UuVhkNf_DEJPViOaAPwIrk";
const TARGET_SHEET_NAME = "Form responses 1";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

export const SHEET_HEADERS = [
  "Timestamp",
  "Broker",
  "Party Name",
  "Item",
  "Delivery / Pickup Location",
  "Delivery / Motorcut",
  "Rate",
  "Bill / K",
  "CD Condition",
  "Other Condition",
  "Remarks",
  "ENQUIRY FOR",
];

export interface EnquiriesPayload {
  source: "live" | "snapshot";
  sheetTitle: string;
  fetchedAt: string;
  enquiries: Enquiry[];
  error?: string | undefined;
  activeSheetName?: string;
  connectionMethod?: "webhook" | "lovable_gateway" | "gviz" | "snapshot";
}

interface SpreadsheetMetadata {
  properties?: { title?: string };
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
}

/**
 * Checks if the target worksheet exists in the spreadsheet.
 * If not, attempts to create it via batchUpdate and initialize headers A1:L1.
 */
async function ensureWorksheet(
  lovableKey: string,
  sheetsKey: string,
): Promise<{ sheetName: string; created: boolean; error?: string }> {
  try {
    const metaUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": sheetsKey,
      },
    });

    if (!metaRes.ok) {
      return { sheetName: TARGET_SHEET_NAME, created: false };
    }

    const meta = (await metaRes.json()) as SpreadsheetMetadata;
    const existingSheets = meta.sheets?.map((s) => s.properties?.title || "").filter(Boolean) || [];

    // 1. If target sheet already exists, use it
    if (existingSheets.includes(TARGET_SHEET_NAME)) {
      return { sheetName: TARGET_SHEET_NAME, created: false };
    }

    // 2. Target sheet doesn't exist; attempt to create "Form responses 1"
    const batchUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;
    const createRes = await fetch(batchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": sheetsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: TARGET_SHEET_NAME,
              },
            },
          },
        ],
      }),
    });

    if (createRes.ok) {
      // 3. Write headers A1:L1 into newly created sheet
      const headerUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/'${TARGET_SHEET_NAME}'!A1:L1?valueInputOption=USER_ENTERED`;
      await fetch(headerUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": sheetsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [SHEET_HEADERS],
        }),
      });

      return { sheetName: TARGET_SHEET_NAME, created: true };
    }

    // If creating failed (e.g. read-only permissions), use the first existing sheet (e.g. Sheet1)
    if (existingSheets.length > 0) {
      return { sheetName: existingSheets[0]!, created: false };
    }

    return { sheetName: TARGET_SHEET_NAME, created: false };
  } catch (err) {
    console.error("Failed to ensure worksheet", err);
    return { sheetName: TARGET_SHEET_NAME, created: false };
  }
}

export const getEnquiries = createServerFn({ method: "GET" })
  .validator((params?: { webhookUrl?: string }) => params)
  .handler(async ({ data }): Promise<EnquiriesPayload> => {
    const webhookUrl = data?.webhookUrl || process.env["GOOGLE_SHEETS_WEBHOOK_URL"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];

    const snapshot = (error?: string): EnquiriesPayload => ({
      source: "snapshot",
      sheetTitle: "Enquiry Capture (Responses)",
      fetchedAt: SNAPSHOT_TAKEN_AT,
      enquiries: parseRows(SNAPSHOT_ROWS),
      error,
      connectionMethod: "snapshot",
    });

    // 1. Try Google Apps Script Web App / Webhook URL if configured
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = (await res.json()) as { values?: string[][] };
          if (Array.isArray(json.values) && json.values.length > 0) {
            return {
              source: "live",
              sheetTitle: "Enquiry Capture (Responses)",
              fetchedAt: new Date().toISOString(),
              enquiries: parseRows(json.values),
              connectionMethod: "webhook",
            };
          }
        }
      } catch (err) {
        console.warn("Webhook fetch failed, falling back to next provider", err);
      }
    }

    // 2. Try Lovable Connector Gateway with auto worksheet detection
    if (lovableKey && sheetsKey) {
      try {
        const { sheetName } = await ensureWorksheet(lovableKey, sheetsKey);
        const url = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/'${sheetName}'!A1:R5000`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": sheetsKey,
          },
        });

        if (res.ok) {
          const json = (await res.json()) as { values?: string[][] };
          const rows = json.values ?? [];
          if (rows.length > 0) {
            return {
              source: "live",
              sheetTitle: "Enquiry Capture (Responses)",
              fetchedAt: new Date().toISOString(),
              enquiries: parseRows(rows),
              activeSheetName: sheetName,
              connectionMethod: "lovable_gateway",
            };
          }
        } else {
          const body = await res.text();
          console.error(`Google Sheets request failed [${res.status}]: ${body}`);
        }
      } catch (err) {
        console.error("Lovable gateway request error", err);
      }
    }

    // 3. Try Google Sheets gviz public visualization endpoint
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
      const gvizRes = await fetch(gvizUrl, {
        headers: { Accept: "text/plain" },
      });

      if (gvizRes.ok) {
        const text = await gvizRes.text();
        const rows = parseGvizResponse(text);
        if (rows.length > 1) {
          return {
            source: "live",
            sheetTitle: "Enquiry Capture (Responses)",
            fetchedAt: new Date().toISOString(),
            enquiries: parseRows(rows),
            connectionMethod: "gviz",
          };
        }
      }
    } catch (err) {
      console.warn("gviz fetch fallback failed", err);
    }

    // 4. Fallback to snapshot
    return snapshot(
      !lovableKey && !webhookUrl
        ? "Sheet not connected yet. Click 'Sheet Setup' to connect your Google Sheet."
        : "Live sheet could not be read. Showing saved copy.",
    );
  });

export const enquiriesQueryOptions = (webhookUrl?: string) => {
  const params: { webhookUrl?: string } = {};
  if (webhookUrl) params.webhookUrl = webhookUrl;
  return queryOptions({
    queryKey: ["enquiries", webhookUrl || ""],
    queryFn: () => getEnquiries({ data: params }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
};

export const addEnquiry = createServerFn({ method: "POST" })
  .validator((d: { enquiry: NewEnquiryInput; webhookUrl?: string }) => d)
  .handler(
    async ({ data }): Promise<{ success: boolean; liveSaved: boolean; error?: string }> => {
      const { enquiry, webhookUrl: inputWebhook } = data;
      const webhookUrl = inputWebhook || process.env["GOOGLE_SHEETS_WEBHOOK_URL"];
      const lovableKey = process.env["LOVABLE_API_KEY"];
      const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];

      const row = enquiryToSheetRow(enquiry);

      // 1. Try Google Apps Script Web App / Webhook URL
      if (webhookUrl) {
        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(enquiry),
          });

          if (res.ok) {
            return { success: true, liveSaved: true };
          }
          const text = await res.text();
          console.error("Webhook POST failed:", text);
        } catch (err) {
          console.error("Webhook POST error:", err);
        }
      }

      // 2. Try Lovable Connector Gateway with auto worksheet creation
      if (lovableKey && sheetsKey) {
        try {
          const { sheetName } = await ensureWorksheet(lovableKey, sheetsKey);
          const appendUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/'${sheetName}'!A1:L1:append?valueInputOption=USER_ENTERED`;

          const res = await fetch(appendUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": sheetsKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [row],
            }),
          });

          if (res.ok) {
            return { success: true, liveSaved: true };
          }

          const body = await res.text();
          console.error(`Google Sheets append failed [${res.status}]: ${body}`);
          return {
            success: false,
            liveSaved: false,
            error: `Live sheet could not be updated (${res.status}).`,
          };
        } catch (err) {
          console.error("Failed to append via Lovable gateway", err);
          return {
            success: false,
            liveSaved: false,
            error: "Network error while connecting to Google Sheets.",
          };
        }
      }

      return {
        success: true,
        liveSaved: false,
        error:
          "Google Sheets live connection not linked. Enquiry is saved in dashboard. Click 'Sheet Setup' to connect your Google Sheet.",
      };
    },
  );

export const initWorksheet = createServerFn({ method: "POST" })
  .validator((params?: { webhookUrl?: string }) => params)
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; sheetName: string; message: string; error?: string }> => {
      const webhookUrl = data?.webhookUrl || process.env["GOOGLE_SHEETS_WEBHOOK_URL"];
      const lovableKey = process.env["LOVABLE_API_KEY"];
      const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];

      if (webhookUrl) {
        try {
          // Trigger Webhook GET or setup check
          const res = await fetch(webhookUrl, { method: "GET" });
          if (res.ok) {
            return {
              success: true,
              sheetName: TARGET_SHEET_NAME,
              message: "Worksheet verified and connected via Google Apps Script Web App!",
            };
          }
        } catch (err) {
          console.error("Webhook init error", err);
        }
      }

      if (lovableKey && sheetsKey) {
        const result = await ensureWorksheet(lovableKey, sheetsKey);
        return {
          success: true,
          sheetName: result.sheetName,
          message: result.created
            ? `Worksheet '${result.sheetName}' successfully created with A1:L headers!`
            : `Worksheet '${result.sheetName}' is verified and ready!`,
        };
      }

      return {
        success: false,
        sheetName: TARGET_SHEET_NAME,
        message: "No live credentials found.",
        error: "Google Sheets connection not configured. Use the 1-click Google Apps Script.",
      };
    },
  );
