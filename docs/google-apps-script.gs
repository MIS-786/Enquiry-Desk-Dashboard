// ============================================================================
// Google Apps Script for Broker Dashboard -> "Form Deta" Sheet
// Spreadsheet ID: 13CRg_4u7HSeMELiBYF2q5UuVhkNf_DEJPViOaAPwIrk
// Tab: Form Deta (GID: 1754193838)
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

function getTargetSheet() {
  var ss;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch(e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    throw new Error("Spreadsheet nahi mila! ID: " + SPREADSHEET_ID);
  }

  // 1. Exact name match: "Form Deta"
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;

  // 2. Case-insensitive / trimmed match
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === SHEET_NAME.toLowerCase()) {
      return sheets[i];
    }
  }

  // 3. Match by GID: 1754193838
  for (var j = 0; j < sheets.length; j++) {
    if (sheets[j].getSheetId() === TARGET_GID) {
      return sheets[j];
    }
  }

  // 4. Tab nahi mila to automatically create karein with headers
  sheet = ss.insertSheet(SHEET_NAME);
  sheet.appendRow(HEADERS);
  return sheet;
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
    var sheet = getTargetSheet();

    // Fallback: Agar GET query params me broker/item aaye, to row append karein
    if (e && e.parameter && (e.parameter.broker || e.parameter.item)) {
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

      sheet.appendRow(row);
      return jsonResponse({ success: true, message: "Row added via GET to " + sheet.getName(), row: row });
    }

    // Default GET: Sheet data read karein
    var values = sheet.getDataRange().getValues();
    return jsonResponse({ success: true, sheetName: sheet.getName(), values: values });
  } catch(err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
