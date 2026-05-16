import ExcelJS from "exceljs";
import type { AuditResult, RuleResult, Verdict, Priority } from "./types";

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
const FILL: Record<string, ExcelJS.Fill> = {
  부적합: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE8E8" } },
  검토필요: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E1" } },
  적합: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } },
};

function verdictLabel(v: Verdict) {
  return { 적합: "✅ 적합", 부적합: "❌ 부적합", 검토필요: "⚠️ 검토필요", 해당없음: "⬜ 해당없음" }[v];
}
function priorityLabel(p: Priority) {
  return { high: "🔴 높음", medium: "🟡 중간", low: "🟢 낮음" }[p];
}
function applyFill(row: ExcelJS.Row, verdict: Verdict) {
  const fill = FILL[verdict];
  if (fill) row.eachCell((c) => (c.fill = fill));
}
function border(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.border = {
      top: { style: "hair" },
      left: { style: "thin" },
      bottom: { style: "hair" },
      right: { style: "thin" },
    };
    c.alignment = { wrapText: true, vertical: "top" };
  });
}

export async function generateExcel(result: AuditResult): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "T멤버십 접근성 검수 도구 V0.3";
  wb.created = new Date();

  await addSummarySheet(wb, result);
  await addDetailSheet(wb, result);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function addSummarySheet(wb: ExcelJS.Workbook, result: AuditResult) {
  const ws = wb.addWorksheet("📊 검수 요약");
  ws.columns = [{ width: 22 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }];

  ws.addRow(["KS X 3253:2016 접근성 검수 결과"]);
  ws.getRow(1).font = { bold: true, size: 14 };
  ws.mergeCells("A1:F1");
  ws.addRow(["검수 URL", result.url]);
  ws.addRow(["검수 일시", new Date(result.auditedAt).toLocaleString("ko-KR")]);
  ws.addRow(["HTTP 상태", result.fetchStatus]);
  ws.addRow(["종합 점수", `${result.overallScore}점`]);
  ws.addRow([]);

  const hdr = ws.addRow(["원칙", "전체", "적합", "부적합", "검토필요", "해당없음"]);
  hdr.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { horizontal: "center" };
    c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  for (const s of result.principlesSummary) {
    const r = ws.addRow([s.name, s.total, s.pass, s.fail, s.review, s.na]);
    r.eachCell((c) => {
      c.alignment = { horizontal: "center" };
      c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });
  }

  const tot = ws.addRow(["합계", result.totalItems, result.passCount, result.failCount, result.reviewCount, result.naCount]);
  tot.font = { bold: true };
  tot.eachCell((c) => {
    c.alignment = { horizontal: "center" };
    c.border = { top: { style: "medium" }, left: { style: "thin" }, bottom: { style: "medium" }, right: { style: "thin" } };
  });
}

async function addDetailSheet(wb: ExcelJS.Workbook, result: AuditResult) {
  const ws = wb.addWorksheet("📋 파일별 결과", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });

  ws.columns = [
    { header: "파일명", key: "fileName", width: 20 },
    { header: "컴포넌트/화면명", key: "componentName", width: 20 },
    { header: "검수 범주", key: "category", width: 18 },
    { header: "검수 코드", key: "code", width: 12 },
    { header: "검수 항목명", key: "itemName", width: 22 },
    { header: "판정", key: "verdict", width: 14 },
    { header: "이슈 위치", key: "issueLocation", width: 28 },
    { header: "이슈 내용", key: "issueContent", width: 40 },
    { header: "개선 방향", key: "improvement", width: 35 },
    { header: "우선순위", key: "priority", width: 12 },
    { header: "플랫폼", key: "platform", width: 10 },
    { header: "비고", key: "notes", width: 20 },
  ];

  ws.getRow(1).eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { horizontal: "center", wrapText: true };
    c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  let hostname = "";
  try { hostname = new URL(result.url).hostname; } catch { hostname = result.url; }

  for (const rr of result.ruleResults) {
    const noteStr = [
      rr.isBestPractice ? "Best Practice" : "",
      rr.notes ?? "",
    ].filter(Boolean).join(" | ");

    if (rr.issues.length === 0) {
      const row = ws.addRow({
        fileName: hostname,
        componentName: "-",
        category: rr.principle,
        code: rr.ksCode,
        itemName: rr.ksName,
        verdict: verdictLabel(rr.verdict),
        issueLocation: "-",
        issueContent: "-",
        improvement: "-",
        priority: priorityLabel(rr.priority),
        platform: "Web",
        notes: noteStr,
      });
      applyFill(row, rr.verdict);
      border(row);
    } else {
      const shown = rr.issues.slice(0, 10);
      for (const issue of shown) {
        const row = ws.addRow({
          fileName: hostname,
          componentName: "-",
          category: rr.principle,
          code: rr.ksCode,
          itemName: rr.ksName,
          verdict: verdictLabel(rr.verdict),
          issueLocation: trunc(issue.selector, 100),
          issueContent: trunc(issue.message, 300),
          improvement: trunc(issue.suggestion, 300),
          priority: priorityLabel(rr.priority),
          platform: "Web",
          notes: noteStr,
        });
        applyFill(row, rr.verdict);
        border(row);
      }
      if (rr.issues.length > 10) {
        const row = ws.addRow({
          fileName: hostname, componentName: "-",
          category: rr.principle, code: rr.ksCode, itemName: rr.ksName,
          verdict: verdictLabel(rr.verdict),
          issueLocation: `... 외 ${rr.issues.length - 10}건 더 있음`,
          issueContent: "", improvement: "",
          priority: priorityLabel(rr.priority), platform: "Web", notes: noteStr,
        });
        applyFill(row, rr.verdict);
        border(row);
      }
    }
  }
}

function trunc(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
