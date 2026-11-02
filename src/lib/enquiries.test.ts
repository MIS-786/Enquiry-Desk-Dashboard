import { describe, expect, it } from "vitest";

import {
  applyFilters,
  createEnquiryFromInput,
  DEFAULT_FILTERS,
  enquiryToSheetRow,
  formatSheetTimestamp,
  parseRows,
  parseSheetDate,
  summarizeBrokers,
  summarizeItemBrokers,
  summarizeItems,
  updateEnquiry,
} from "./enquiries";
import { SNAPSHOT_ROWS } from "./enquiries.snapshot";

describe("enquiry parsing", () => {
  it("reads form timestamps as day/month/year in India time", () => {
    expect(parseSheetDate("30/05/2026 16:09:15")?.toISOString()).toBe("2026-05-30T10:39:15.000Z");
  });

  it("groups the same broker even with extra spaces or different case", () => {
    const rows = [
      SNAPSHOT_ROWS[0]!,
      ["28/10/2026 17:58:49", "Milan Desai ", "", "Sarna", "", "", "2440"],
      ["28/10/2026 18:00:18", "MILAN DESAI", "", "Old Mota", "", "", "2350"],
    ];
    const brokers = summarizeBrokers(parseRows(rows));
    expect(brokers).toHaveLength(1);
    expect(brokers[0]?.count).toBe(2);
    expect(brokers[0]?.avg).toBe(2395);
  });

  it("filters to one broker's deals", () => {
    const all = parseRows(SNAPSHOT_ROWS);
    const milan = applyFilters(all, { ...DEFAULT_FILTERS, broker: "MILAN DESAI" });
    expect(milan.map((e) => e.item).sort()).toEqual(["Old Mota", "Sarna"]);
  });

  it("'Today' only keeps enquiries from the current India day", () => {
    const all = parseRows(SNAPSHOT_ROWS);
    const now = new Date("2026-10-28T13:00:00.000Z"); // 18:30 IST, 28 Oct
    expect(applyFilters(all, { ...DEFAULT_FILTERS, period: "today" }, now)).toHaveLength(6);
  });

  it("summarizes items with their broker list and counts", () => {
    const all = parseRows(SNAPSHOT_ROWS);
    const items = summarizeItems(all);
    const sarna = items.find((i) => i.item === "Sarna");
    expect(sarna).toBeDefined();
    expect(sarna?.count).toBe(5);
    expect(sarna?.brokers).toBe(5);
    expect(sarna?.brokerNames).toEqual(
      expect.arrayContaining(["Milan Desai", "Nirmal Jhamnani", "Vibhor Agrawal", "Ramesh Agrawal", "Ramakant Agrawal"]),
    );
  });

  it("returns all brokers for a specific item with correct stats", () => {
    const all = parseRows(SNAPSHOT_ROWS);
    const sarnaBrokers = summarizeItemBrokers(all, "SARNA");
    expect(sarnaBrokers).toHaveLength(5);
    const nirmal = sarnaBrokers.find((b) => b.broker === "Nirmal Jhamnani");
    expect(nirmal).toBeDefined();
    expect(nirmal?.count).toBe(1);
    expect(nirmal?.lastRate).toBe(2435);
  });

  it("updates enquiry fields cleanly and recalculates keys", () => {
    const all = parseRows(SNAPSHOT_ROWS);
    const first = all[0]!;
    const updated = updateEnquiry(first, {
      rate: 2500,
      mode: "Delivery",
      billType: "K",
      location: "Raipur",
      remarks: "Urgent shipment",
    });

    expect(updated.rate).toBe(2500);
    expect(updated.mode).toBe("Delivery");
    expect(updated.billType).toBe("K");
    expect(updated.location).toBe("Raipur");
    expect(updated.remarks).toBe("Urgent shipment");
    expect(updated.id).toBe(first.id);
  });

  it("converts new enquiry form input into a 12-column Google Sheet row (A1:L1)", () => {
    const input = {
      timestamp: "31/10/2026 18:00:00",
      broker: "Milan Desai",
      party: "XYZ Rice Mill",
      item: "Sarna",
      location: "Kharora",
      mode: "Motorcut",
      rate: 2440,
      billType: "Bill",
      cd: "1.50%",
      otherCondition: "5000 bags",
      remarks: "Urgent",
      enquiryFor: "PURCHASE",
    };

    const row = enquiryToSheetRow(input);
    expect(row).toHaveLength(12);
    expect(row[0]).toBe("31/10/2026 18:00:00"); // A: Timestamp
    expect(row[1]).toBe("Milan Desai"); // B: Broker
    expect(row[2]).toBe("XYZ Rice Mill"); // C: Party Name
    expect(row[3]).toBe("Sarna"); // D: Item
    expect(row[4]).toBe("Kharora"); // E: Delivery / Pickup Location
    expect(row[5]).toBe("Motorcut"); // F: Delivery / Motorcut
    expect(row[6]).toBe("2440"); // G: Rate
    expect(row[7]).toBe("Bill"); // H: Bill / K
    expect(row[8]).toBe("1.50%"); // I: CD Condition
    expect(row[9]).toBe("5000 bags"); // J: Other Condition
    expect(row[10]).toBe("Urgent"); // K: Remarks
    expect(row[11]).toBe("PURCHASE"); // L: ENQUIRY FOR

    const enquiry = createEnquiryFromInput(input);
    expect(enquiry.broker).toBe("Milan Desai");
    expect(enquiry.brokerKey).toBe("MILAN DESAI");
    expect(enquiry.item).toBe("Sarna");
    expect(enquiry.rate).toBe(2440);
    expect(enquiry.enquiryFor).toBe("PURCHASE");
  });
});
