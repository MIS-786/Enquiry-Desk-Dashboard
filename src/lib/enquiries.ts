// Pure helpers that turn raw Google Form response rows into dashboard data.
// Kept free of server/browser APIs so they can run anywhere and be unit-tested.

export type EnquiryType = "PURCHASE" | "SALE" | "OTHER";

export interface Enquiry {
  id: string;
  timestamp: string; // ISO string (IST source time)
  timestampLabel: string; // original text from the sheet
  broker: string;
  brokerKey: string;
  party: string;
  item: string;
  itemKey: string;
  location: string;
  mode: string; // Delivery / Motorcut
  rate: number | null;
  billType: string; // Bill / K
  cd: string;
  otherCondition: string;
  remarks: string;
  enquiryFor: EnquiryType;
  enquiryForLabel: string;
}

const HEADER_MAP: Record<string, keyof RowFields> = {
  timestamp: "timestamp",
  broker: "broker",
  "party name": "party",
  item: "item",
  "delivery / pickup location": "location",
  "delivery / motorcut": "mode",
  rate: "rate",
  "bill / k": "billType",
  "cd condition": "cd",
  "other condition": "otherCondition",
  remarks: "remarks",
  "enquiry for": "enquiryFor",
};

interface RowFields {
  timestamp: string;
  broker: string;
  party: string;
  item: string;
  location: string;
  mode: string;
  rate: string;
  billType: string;
  cd: string;
  otherCondition: string;
  remarks: string;
  enquiryFor: string;
}

export function cleanText(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Title-case a name while keeping short all-caps codes (IR, PBC, CWC) as they are. */
export function displayName(value: string): string {
  const text = cleanText(value);
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => {
      if (word.length <= 3 && word === word.toUpperCase() && /[A-Z]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Parses "dd/mm/yyyy hh:mm:ss" (Google Form, India locale) as IST. */
export function parseSheetDate(value: string): Date | null {
  const m = cleanText(value).match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!m) return null;
  const [, d = "", mo = "", y = "", h = "0", mi = "0", s = "0"] = m;
  const pad = (n: string) => n.padStart(2, "0");
  const iso = `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}+05:30`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseRate(value: string): number | null {
  const text = cleanText(value).replace(/[₹,\s]/g, "");
  if (!text) return null;
  const n = Number.parseFloat(text);
  return Number.isFinite(n) ? n : null;
}

export function normalizeEnquiryFor(value: string): EnquiryType {
  const text = cleanText(value).toUpperCase();
  if (text.startsWith("PURCHASE") || text === "BUY") return "PURCHASE";
  if (text.startsWith("SALE") || text.startsWith("SELL")) return "SALE";
  return "OTHER";
}

export function parseRows(rows: string[][]): Enquiry[] {
  if (!rows.length) return [];
  const [header = [], ...body] = rows;
  const index: Partial<Record<keyof RowFields, number>> = {};
  header.forEach((h, i) => {
    const key = HEADER_MAP[cleanText(h).toLowerCase()];
    if (key && index[key] === undefined) index[key] = i;
  });
  const get = (row: string[], key: keyof RowFields) => {
    const i = index[key];
    return i === undefined ? "" : cleanText(row[i]);
  };

  const result: Enquiry[] = [];
  body.forEach((row, i) => {
    const ts = get(row, "timestamp");
    const brokerRaw = get(row, "broker");
    if (!ts && !brokerRaw) return;
    const date = parseSheetDate(ts);
    const broker = displayName(brokerRaw) || "Unknown";
    const item = displayName(get(row, "item")) || "—";
    const enquiryForRaw = get(row, "enquiryFor");
    result.push({
      id: `row-${i + 2}`,
      timestamp: date ? date.toISOString() : "",
      timestampLabel: ts,
      broker,
      brokerKey: broker.toUpperCase(),
      party: get(row, "party"),
      item,
      itemKey: item.toUpperCase(),
      location: get(row, "location"),
      mode: displayName(get(row, "mode")),
      rate: parseRate(get(row, "rate")),
      billType: get(row, "billType"),
      cd: get(row, "cd"),
      otherCondition: get(row, "otherCondition"),
      remarks: get(row, "remarks"),
      enquiryFor: normalizeEnquiryFor(enquiryForRaw),
      enquiryForLabel: enquiryForRaw ? enquiryForRaw.toUpperCase() : "Not set",
    });
  });
  // Newest first
  return result.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
}

export interface RateStats {
  count: number;
  rated: number;
  avg: number | null;
  min: number | null;
  max: number | null;
}

export function rateStats(list: Enquiry[]): RateStats {
  const rates = list.map((e) => e.rate).filter((r): r is number => r !== null);
  if (!rates.length) return { count: list.length, rated: 0, avg: null, min: null, max: null };
  const sum = rates.reduce((a, b) => a + b, 0);
  return {
    count: list.length,
    rated: rates.length,
    avg: Math.round(sum / rates.length),
    min: Math.min(...rates),
    max: Math.max(...rates),
  };
}

export interface BrokerSummary extends RateStats {
  broker: string;
  brokerKey: string;
  items: string[];
  purchase: number;
  sale: number;
  lastAt: string;
  lastItem: string;
  lastRate: number | null;
}

export function summarizeBrokers(list: Enquiry[]): BrokerSummary[] {
  const groups = new Map<string, Enquiry[]>();
  for (const e of list) {
    const g = groups.get(e.brokerKey) ?? [];
    g.push(e);
    groups.set(e.brokerKey, g);
  }
  return [...groups.entries()]
    .map(([brokerKey, items]) => {
      const sorted = [...items].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const latest = sorted[0]!;
      return {
        ...rateStats(items),
        broker: latest.broker,
        brokerKey,
        items: [...new Set(items.map((e) => e.item))],
        purchase: items.filter((e) => e.enquiryFor === "PURCHASE").length,
        sale: items.filter((e) => e.enquiryFor === "SALE").length,
        lastAt: latest.timestamp,
        lastItem: latest.item,
        lastRate: latest.rate,
      };
    })
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}

export interface ItemSummary extends RateStats {
  item: string;
  itemKey: string;
  brokers: number;
  brokerNames: string[];
  purchase: number;
  sale: number;
  lastAt: string;
  lastBroker: string;
  lastRate: number | null;
}

export interface ItemBrokerDeals extends RateStats {
  broker: string;
  brokerKey: string;
  count: number;
  purchase: number;
  sale: number;
  lastAt: string;
  lastRate: number | null;
  lastParty: string;
  lastLocation: string;
  lastMode: string;
  lastBillType: string;
  lastCd: string;
  lastRemarks: string;
  enquiries: Enquiry[];
}

export function summarizeItems(list: Enquiry[]): ItemSummary[] {
  const groups = new Map<string, Enquiry[]>();
  for (const e of list) {
    const g = groups.get(e.itemKey) ?? [];
    g.push(e);
    groups.set(e.itemKey, g);
  }
  return [...groups.entries()]
    .map(([itemKey, items]) => {
      const sorted = [...items].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const latest = sorted[0]!;
      const brokerMap = new Map<string, string>();
      items.forEach((e) => brokerMap.set(e.brokerKey, e.broker));
      return {
        ...rateStats(items),
        item: latest.item,
        itemKey,
        brokers: brokerMap.size,
        brokerNames: [...brokerMap.values()],
        purchase: items.filter((e) => e.enquiryFor === "PURCHASE").length,
        sale: items.filter((e) => e.enquiryFor === "SALE").length,
        lastAt: latest.timestamp,
        lastBroker: latest.broker,
        lastRate: sorted.find((e) => e.rate !== null)?.rate ?? null,
      };
    })
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}

export function summarizeItemBrokers(list: Enquiry[], itemKey: string): ItemBrokerDeals[] {
  const itemEnquiries = list.filter((e) => e.itemKey === itemKey);
  const groups = new Map<string, Enquiry[]>();
  for (const e of itemEnquiries) {
    const g = groups.get(e.brokerKey) ?? [];
    g.push(e);
    groups.set(e.brokerKey, g);
  }
  return [...groups.entries()]
    .map(([brokerKey, items]) => {
      const sorted = [...items].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const latest = sorted[0]!;
      return {
        ...rateStats(items),
        broker: latest.broker,
        brokerKey,
        count: items.length,
        purchase: items.filter((e) => e.enquiryFor === "PURCHASE").length,
        sale: items.filter((e) => e.enquiryFor === "SALE").length,
        lastAt: latest.timestamp,
        lastRate: latest.rate,
        lastParty: latest.party,
        lastLocation: latest.location,
        lastMode: latest.mode,
        lastBillType: latest.billType,
        lastCd: latest.cd,
        lastRemarks: [latest.otherCondition, latest.remarks].filter(Boolean).join(" · "),
        enquiries: sorted,
      };
    })
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}

export type Period = "today" | "7d" | "30d" | "all";

/** Calendar-day start in IST for the given instant. */
function istDayStart(now: Date): number {
  const offset = 5.5 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() + offset);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted.getTime() - offset;
}

export function periodStart(period: Period, now: Date = new Date()): number | null {
  if (period === "all") return null;
  const start = istDayStart(now);
  if (period === "today") return start;
  const days = period === "7d" ? 6 : 29;
  return start - days * 24 * 60 * 60 * 1000;
}

export interface Filters {
  period: Period;
  broker: string; // brokerKey or "all"
  item: string; // itemKey or "all"
  type: "all" | EnquiryType;
  mode: string; // "all" | Delivery | Motorcut
  search: string;
}

export const DEFAULT_FILTERS: Filters = {
  period: "all",
  broker: "all",
  item: "all",
  type: "all",
  mode: "all",
  search: "",
};

export function applyFilters(list: Enquiry[], f: Filters, now: Date = new Date()): Enquiry[] {
  const start = periodStart(f.period, now);
  const q = f.search.trim().toLowerCase();
  return list.filter((e) => {
    if (start !== null && (!e.timestamp || new Date(e.timestamp).getTime() < start)) return false;
    if (f.broker !== "all" && e.brokerKey !== f.broker) return false;
    if (f.item !== "all" && e.itemKey !== f.item) return false;
    if (f.type !== "all" && e.enquiryFor !== f.type) return false;
    if (f.mode !== "all" && e.mode.toUpperCase() !== f.mode.toUpperCase()) return false;
    if (q) {
      const hay = [e.broker, e.party, e.item, e.location, e.remarks, e.otherCondition]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export function formatRate(rate: number | null): string {
  return rate === null ? "—" : `₹${inr.format(rate)}`;
}

export function updateEnquiry(
  original: Enquiry,
  patch: Partial<Omit<Enquiry, "id">>,
): Enquiry {
  const broker = patch.broker !== undefined ? displayName(patch.broker) || original.broker : original.broker;
  const item = patch.item !== undefined ? displayName(patch.item) || original.item : original.item;
  const enquiryFor = patch.enquiryFor !== undefined ? patch.enquiryFor : original.enquiryFor;

  let rate: number | null = original.rate;
  if (patch.rate !== undefined) {
    if (patch.rate === null || (patch.rate as unknown) === "") {
      rate = null;
    } else {
      const parsed = typeof patch.rate === "number" ? patch.rate : parseRate(String(patch.rate));
      rate = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    }
  }

  return {
    ...original,
    ...patch,
    broker,
    brokerKey: broker.toUpperCase(),
    item,
    itemKey: item.toUpperCase(),
    rate,
    enquiryFor,
    enquiryForLabel:
      patch.enquiryForLabel ??
      (enquiryFor === "OTHER" ? patch.enquiryForLabel || original.enquiryForLabel : enquiryFor),
    mode: patch.mode !== undefined ? displayName(patch.mode) || patch.mode : original.mode,
  };
}

const STORAGE_KEY = "mandi_enquiry_overrides_v1";

export function loadEnquiryOverrides(): Record<string, Partial<Enquiry>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveEnquiryOverride(id: string, patch: Partial<Enquiry>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadEnquiryOverrides();
    current[id] = { ...(current[id] ?? {}), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to save enquiry override", err);
  }
}

export function clearEnquiryOverrides(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear overrides", err);
  }
}

export function formatDateTime(iso: string, fallback = "—"): string {
  if (!iso) return fallback;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function formatDay(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/** Format current or given Date to "dd/mm/yyyy hh:mm:ss" in India locale for Google Sheet */
export function formatSheetTimestamp(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export interface NewEnquiryInput {
  timestamp?: string; // Optional custom timestamp or generated IST
  broker: string; // Col B: Broker
  party?: string; // Col C: Party Name
  item: string; // Col D: Item
  location?: string; // Col E: Delivery / Pickup Location
  mode?: string; // Col F: Delivery / Motorcut
  rate?: number | string | null; // Col G: Rate
  billType?: string; // Col H: Bill / K
  cd?: string; // Col I: CD Condition
  otherCondition?: string; // Col J: Other Condition
  remarks?: string; // Col K: Remarks
  enquiryFor?: EnquiryType | string; // Col L: ENQUIRY FOR
}

export function createEnquiryFromInput(input: NewEnquiryInput, id?: string): Enquiry {
  const tsLabel = input.timestamp || formatSheetTimestamp();
  const date = parseSheetDate(tsLabel);
  const broker = displayName(input.broker) || "Unknown";
  const item = displayName(input.item) || "—";
  const rateParsed =
    input.rate === null || input.rate === "" || input.rate === undefined
      ? null
      : typeof input.rate === "number"
        ? input.rate
        : parseRate(String(input.rate));

  const enquiryFor = normalizeEnquiryFor(input.enquiryFor || "PURCHASE");

  return {
    id: id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: date ? date.toISOString() : new Date().toISOString(),
    timestampLabel: tsLabel,
    broker,
    brokerKey: broker.toUpperCase(),
    party: cleanText(input.party),
    item,
    itemKey: item.toUpperCase(),
    location: cleanText(input.location),
    mode: displayName(input.mode ?? "") || "Delivery",
    rate: rateParsed,
    billType: cleanText(input.billType) || "Bill",
    cd: cleanText(input.cd),
    otherCondition: cleanText(input.otherCondition),
    remarks: cleanText(input.remarks),
    enquiryFor,
    enquiryForLabel: input.enquiryFor ? String(input.enquiryFor).toUpperCase() : "PURCHASE",
  };
}

export function enquiryToSheetRow(input: NewEnquiryInput): string[] {
  const tsLabel = input.timestamp || formatSheetTimestamp();
  return [
    tsLabel, // A: Timestamp
    cleanText(input.broker), // B: Broker
    cleanText(input.party), // C: Party Name
    cleanText(input.item), // D: Item
    cleanText(input.location), // E: Delivery / Pickup Location
    cleanText(input.mode) || "Delivery", // F: Delivery / Motorcut
    input.rate !== null && input.rate !== undefined && input.rate !== ""
      ? String(input.rate).replace(/[₹,\s]/g, "")
      : "", // G: Rate
    cleanText(input.billType) || "Bill", // H: Bill / K
    cleanText(input.cd), // I: CD Condition
    cleanText(input.otherCondition), // J: Other Condition
    cleanText(input.remarks), // K: Remarks
    cleanText(input.enquiryFor || "PURCHASE").toUpperCase(), // L: ENQUIRY FOR
  ];
}

const CREATED_STORAGE_KEY = "mandi_enquiry_created_v1";
const DELETED_STORAGE_KEY = "mandi_enquiry_deleted_v1";

export function loadDeletedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function saveDeletedId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadDeletedIds();
    current.add(id);
    localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify([...current]));
  } catch (err) {
    console.error("Failed to save deleted id", err);
  }
}

export function clearDeletedIds(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DELETED_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear deleted ids", err);
  }
}

export function removeFromCreatedEnquiries(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadCreatedEnquiries();
    const filtered = current.filter((e) => e.id !== id);
    localStorage.setItem(CREATED_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to remove created enquiry", err);
  }
}

export function loadCreatedEnquiries(): Enquiry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CREATED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCreatedEnquiry(enquiry: Enquiry): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadCreatedEnquiries();
    current.unshift(enquiry);
    localStorage.setItem(CREATED_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to save created enquiry", err);
  }
}

export function clearCreatedEnquiries(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CREATED_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear created enquiries", err);
  }
}

export function parseGvizResponse(text: string): string[][] {
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
  if (!match || !match[1]) return [];
  try {
    const json = JSON.parse(match[1]);
    const table = json.table;
    if (!table || !table.cols) return [];

    const headers: string[] = table.cols.map(
      (c: { label?: string; id?: string }) => c.label || c.id || "",
    );
    const rows: string[][] = [];
    rows.push(headers);

    if (Array.isArray(table.rows)) {
      for (const r of table.rows) {
        if (!r.c) continue;
        const rowVals: string[] = r.c.map(
          (cell: { v?: unknown; f?: string } | null) => {
            if (!cell) return "";
            return cell.f !== undefined
              ? String(cell.f)
              : cell.v !== null && cell.v !== undefined
                ? String(cell.v)
                : "";
          },
        );
        if (rowVals.some((v) => v.trim() !== "")) {
          rows.push(rowVals);
        }
      }
    }
    return rows;
  } catch (err) {
    console.error("Failed to parse gviz response", err);
    return [];
  }
}

const WEBHOOK_STORAGE_KEY = "mandi_google_sheets_webhook_url";

export function loadWebhookUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(WEBHOOK_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveWebhookUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!url) {
      localStorage.removeItem(WEBHOOK_STORAGE_KEY);
    } else {
      localStorage.setItem(WEBHOOK_STORAGE_KEY, url.trim());
    }
  } catch (err) {
    console.error("Failed to save webhook URL", err);
  }
}
