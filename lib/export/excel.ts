import ExcelJS from "exceljs";
import * as fs from "fs";

// Row-level type — one row per issue (distinct from the audit summary AuditResult in lib/types.ts)
export interface AuditResult {
  component: string;
  category: string;
  ksCode: string;
  itemName: string;
  verdict: string;
  location: string;
  issue: string;
  fix: string;
  priority: string;
  platform: string;
  note: string;
}

const DETAIL_SHEET = "📋 파일별 결과";
const DASHBOARD_SHEET = "📊 대시보드";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1A1A2E" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 10,
};
const VERDICT_FILL: Record<string, ExcelJS.Fill> = {
  "부적합":   { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE8E8" } },
  "❌ 부적합": { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE8E8" } },
  "검토필요":  { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E1" } },
  "⚠️ 검토필요": { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E1" } },
  "적합":     { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } },
  "✅ 적합":   { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } },
};

const DETAIL_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: "파일명",        key: "fileName",   width: 22 },
  { header: "컴포넌트/화면명", key: "component",  width: 22 },
  { header: "검수 범주",     key: "category",   width: 18 },
  { header: "검수 코드",     key: "ksCode",     width: 12 },
  { header: "검수 항목명",   key: "itemName",   width: 24 },
  { header: "판정",          key: "verdict",    width: 14 },
  { header: "이슈 위치",     key: "location",   width: 30 },
  { header: "이슈 내용",     key: "issue",      width: 42 },
  { header: "개선 방향",     key: "fix",        width: 38 },
  { header: "우선순위",      key: "priority",   width: 12 },
  { header: "플랫폼",        key: "platform",   width: 10 },
  { header: "비고",          key: "note",       width: 20 },
];

export function getFillByVerdict(verdict: string): ExcelJS.Fill {
  return VERDICT_FILL[verdict] ?? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
}

export function recalculateDashboard(workbook: ExcelJS.Workbook): void {
  const detail = workbook.getWorksheet(DETAIL_SHEET);
  if (!detail) return;

  // Tear down old dashboard and rebuild
  const existing = workbook.getWorksheet(DASHBOARD_SHEET);
  if (existing) workbook.removeWorksheet(existing.id);
  const dash = workbook.addWorksheet(DASHBOARD_SHEET);

  // --- Aggregate from detail rows (skip header row 1) ---
  const verdictCounts: Record<string, number> = {
    부적합: 0, 검토필요: 0, 적합: 0, 해당없음: 0,
  };
  const categoryMap: Record<string, Record<string, number>> = {};

  detail.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const rawVerdict = String(row.getCell(6).value ?? "");
    const rawCategory = String(row.getCell(3).value ?? "");
    if (!rawCategory) return;

    // Normalise verdict (strip emoji prefix if present)
    const verdict = rawVerdict.replace(/^[✅❌⚠️⬜]\s*/, "").trim();

    if (verdict in verdictCounts) verdictCounts[verdict]++;
    if (!categoryMap[rawCategory]) {
      categoryMap[rawCategory] = { 부적합: 0, 검토필요: 0, 적합: 0, 해당없음: 0 };
    }
    if (verdict in categoryMap[rawCategory]) categoryMap[rawCategory][verdict]++;
  });

  const total = Object.values(verdictCounts).reduce((s, v) => s + v, 0);

  // --- Dashboard layout ---
  dash.columns = [{ width: 24 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }];

  const titleRow = dash.addRow(["📊 KS X 3253 접근성 검수 대시보드"]);
  titleRow.font = { bold: true, size: 14 };
  dash.mergeCells("A1:F1");

  dash.addRow(["마지막 업데이트", new Date().toLocaleString("ko-KR")]);
  dash.addRow([]);

  // Overall summary
  const sumHdr = dash.addRow(["구분", "건수", "비율", "", "", ""]);
  applyHeaderStyle(sumHdr);

  const verdictRows: [string, string][] = [
    ["❌ 부적합",  "부적합"],
    ["⚠️ 검토필요", "검토필요"],
    ["✅ 적합",    "적합"],
    ["⬜ 해당없음", "해당없음"],
  ];
  for (const [label, key] of verdictRows) {
    const count = verdictCounts[key] ?? 0;
    const pct = total > 0 ? `${((count / total) * 100).toFixed(1)}%` : "-";
    const r = dash.addRow([label, count, pct]);
    const fill = VERDICT_FILL[key];
    if (fill) r.eachCell((c) => (c.fill = fill));
    applyBorder(r);
  }
  dash.addRow(["합계", total]);
  dash.addRow([]);

  // Category breakdown
  const catHdr = dash.addRow(["검수 범주", "부적합", "검토필요", "적합", "해당없음", "합계"]);
  applyHeaderStyle(catHdr);

  for (const [category, counts] of Object.entries(categoryMap).sort()) {
    const rowTotal = Object.values(counts).reduce((s, v) => s + v, 0);
    const r = dash.addRow([category, counts["부적합"], counts["검토필요"], counts["적합"], counts["해당없음"], rowTotal]);
    applyBorder(r);
    if ((counts["부적합"] ?? 0) > 0) {
      r.getCell(2).fill = VERDICT_FILL["부적합"];
    }
  }
}

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { horizontal: "center", wrapText: true };
    c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
}

function applyBorder(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.border = { top: { style: "hair" }, left: { style: "thin" }, bottom: { style: "hair" }, right: { style: "thin" } };
    c.alignment = { wrapText: true, vertical: "top" };
  });
}

async function ensureWorkbook(filePath: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();

  if (fs.existsSync(filePath)) {
    await wb.xlsx.readFile(filePath);
    // Ensure the detail sheet exists in case of a corrupted/partial file
    if (!wb.getWorksheet(DETAIL_SHEET)) {
      addDetailSheet(wb);
    }
    return wb;
  }

  // Brand-new workbook
  wb.creator = "T멤버십 접근성 검수 도구";
  wb.created = new Date();
  addDetailSheet(wb);
  return wb;
}

function addDetailSheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(DETAIL_SHEET, {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });
  ws.columns = DETAIL_COLUMNS;
  ws.getRow(1).eachCell((c: ExcelJS.Cell) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { horizontal: "center", wrapText: true };
    c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  return ws;
}

export async function appendAuditResult(
  filePath: string,
  fileName: string,
  results: AuditResult[]
) {
  const workbook = await ensureWorkbook(filePath);
  const sheet = workbook.getWorksheet(DETAIL_SHEET)!;

  const startRow = sheet.rowCount + 1;
  results.forEach((r, i) => {
    const row = sheet.getRow(startRow + i);
    row.values = [
      fileName,    // A: 파일명
      r.component, // B: 컴포넌트
      r.category,  // C: 검수 범주
      r.ksCode,    // D: 검수 코드
      r.itemName,  // E: 검수 항목명
      r.verdict,   // F: 판정
      r.location,  // G: 이슈 위치
      r.issue,     // H: 이슈 내용
      r.fix,       // I: 개선 방향
      r.priority,  // J: 우선순위
      r.platform,  // K: 플랫폼
      r.note,      // L: 비고
    ];
    row.getCell(6).fill = getFillByVerdict(r.verdict);
    row.height = 60;
    applyBorder(row);
  });

  recalculateDashboard(workbook);
  await workbook.xlsx.writeFile(filePath);
}
