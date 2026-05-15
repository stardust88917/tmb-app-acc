import ExcelJS from "exceljs";
import type { AuditResult } from "./types";
import { verdictLabel, priorityLabel } from "./ks-mapper";

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

const FAIL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFDE8E8" },
};

const REVIEW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF8E1" },
};

const PASS_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8F5E9" },
};

export async function generateExcel(result: AuditResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "T멤버십 접근성 검수 도구";
  workbook.created = new Date();

  await addSummarySheet(workbook, result);
  await addDetailSheet(workbook, result);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function addSummarySheet(
  workbook: ExcelJS.Workbook,
  result: AuditResult
) {
  const sheet = workbook.addWorksheet("📊 검수 요약", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  sheet.columns = [
    { width: 20 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];

  sheet.addRow(["KS X 3253:2016 접근성 검수 결과"]);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.mergeCells("A1:F1");

  sheet.addRow(["검수 URL", result.url]);
  sheet.addRow(["검수 일시", new Date(result.auditedAt).toLocaleString("ko-KR")]);
  sheet.addRow(["종합 점수", `${result.overallScore}점`]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(["원칙", "전체", "적합", "부적합", "검토필요", "해당없음"]);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  for (const summary of result.principlesSummary) {
    const row = sheet.addRow([
      summary.name,
      summary.total,
      summary.pass,
      summary.fail,
      summary.review,
      summary.na,
    ]);
    row.eachCell((cell) => {
      cell.alignment = { horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  }

  const totalRow = sheet.addRow([
    "합계",
    result.totalItems,
    result.passCount,
    result.failCount,
    result.reviewCount,
    result.naCount,
  ]);
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.alignment = { horizontal: "center" };
    cell.border = {
      top: { style: "medium" },
      left: { style: "thin" },
      bottom: { style: "medium" },
      right: { style: "thin" },
    };
  });
}

async function addDetailSheet(
  workbook: ExcelJS.Workbook,
  result: AuditResult
) {
  const sheet = workbook.addWorksheet("📋 파일별 결과", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "파일명", key: "fileName", width: 20 },
    { header: "컴포넌트/화면명", key: "componentName", width: 20 },
    { header: "검수 범주", key: "category", width: 18 },
    { header: "검수 코드", key: "code", width: 12 },
    { header: "검수 항목명", key: "itemName", width: 22 },
    { header: "판정", key: "verdict", width: 14 },
    { header: "이슈 위치", key: "issueLocation", width: 30 },
    { header: "이슈 내용", key: "issueContent", width: 40 },
    { header: "개선 방향", key: "improvement", width: 35 },
    { header: "우선순위", key: "priority", width: 12 },
    { header: "플랫폼", key: "platform", width: 10 },
    { header: "비고", key: "notes", width: 20 },
  ];
  sheet.columns = columns;

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  const hostname = new URL(result.url).hostname;

  for (const ksResult of result.ksResults) {
    if (ksResult.issues.length === 0) {
      const row = sheet.addRow({
        fileName: hostname,
        componentName: "-",
        category: ksResult.principle,
        code: ksResult.code,
        itemName: ksResult.name,
        verdict: verdictLabel(ksResult.verdict),
        issueLocation: "-",
        issueContent: "-",
        improvement: "-",
        priority: priorityLabel(ksResult.priority),
        platform: "Web",
        notes: ksResult.isBestPractice ? "Best Practice" : "",
      });
      applyRowStyle(row, ksResult.verdict);
    } else {
      for (const issue of ksResult.issues) {
        const nodeCount = Math.min(issue.nodes.length, 5);
        for (let i = 0; i < Math.max(nodeCount, 1); i++) {
          const node = issue.nodes[i];
          const row = sheet.addRow({
            fileName: hostname,
            componentName: "-",
            category: ksResult.principle,
            code: ksResult.code,
            itemName: ksResult.name,
            verdict: verdictLabel(issue.verdict),
            issueLocation: node ? node.target.join(", ") : "-",
            issueContent: node
              ? truncate(node.html, 200)
              : issue.description,
            improvement: node?.failureSummary
              ? truncate(node.failureSummary, 200)
              : "",
            priority: priorityLabel(ksResult.priority),
            platform: "Web",
            notes: ksResult.isBestPractice ? "Best Practice" : "",
          });
          applyRowStyle(row, issue.verdict);

          row.eachCell((cell) => {
            cell.alignment = { wrapText: true, vertical: "top" };
            cell.border = {
              top: { style: "hair" },
              left: { style: "thin" },
              bottom: { style: "hair" },
              right: { style: "thin" },
            };
          });
        }
        if (issue.nodes.length > 5) {
          const moreRow = sheet.addRow({
            fileName: hostname,
            componentName: "-",
            category: ksResult.principle,
            code: ksResult.code,
            itemName: ksResult.name,
            verdict: verdictLabel(issue.verdict),
            issueLocation: `... 외 ${issue.nodes.length - 5}건 더 있음`,
            issueContent: "",
            improvement: "",
            priority: priorityLabel(ksResult.priority),
            platform: "Web",
            notes: ksResult.isBestPractice ? "Best Practice" : "",
          });
          applyRowStyle(moreRow, issue.verdict);
        }
      }
    }
  }
}

function applyRowStyle(
  row: ExcelJS.Row,
  verdict: "적합" | "부적합" | "검토필요" | "해당없음"
) {
  let fill: ExcelJS.Fill | undefined;
  if (verdict === "부적합") fill = FAIL_FILL;
  else if (verdict === "검토필요") fill = REVIEW_FILL;
  else if (verdict === "적합") fill = PASS_FILL;

  if (fill) {
    row.eachCell((cell) => {
      cell.fill = fill!;
    });
  }
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}
