// ============================================================================
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

// POST: Hamesha "Form Deta" tab me append karein
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

// GET: "Form Deta" + "Form responses 1" (Sabhi tabs se data padhein)
function doGet(e) {
  try {
    var ss = getSpreadsheet();
    if (!ss) throw new Error("Spreadsheet nahi mila!");

    // Fallback POST via GET query parameters
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

    // Default GET: Read all data from Form Deta AND Form responses 1
    var allSheets = ss.getSheets();
    var combinedDataRows = [];
    var seenKeys = {};

    for (var s = 0; s < allSheets.length; s++) {
      var sheet = allSheets[s];
      var name = sheet.getName().trim();
      var nameLower = name.toLowerCase();

      // Only read response tabs (Form Deta, Form responses, etc.)
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

        // Deduplication key
        var rowKey = (tsVal + "|" + brokerVal.toLowerCase() + "|" + itemVal.toLowerCase()).replace(/\s+/g, "");
        if (!seenKeys[rowKey]) {
          seenKeys[rowKey] = true;
          combinedDataRows.push(standardizedRow);
        }
      }
    }

    // Fallback if no response sheets matched: read target sheet directly
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
}
