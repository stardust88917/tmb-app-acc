import ExcelJS from "exceljs";
import type { AuditResponse, KsItemResult } from "./types";

const VERDICT_FILL: Record<string, Partial<ExcelJS.Fill>> = {
  fail:   { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE8E8" } },
  review: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E1" } },
  pass:   { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } },
  manual: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } },
  na:     { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } },
};

const VERDICT_KO: Record<string, string> = {
  fail: "❌ 부적합", review: "⚠️ 검토필요", pass: "✅ 적합",
  manual: "🔵 수동검사", na: "⬜ 해당없음",
};

function headerRow(ws: ExcelJS.Worksheet, values: string[]) {
  const row = ws.addRow(values);
  row.font = { bold: true, size: 10 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A237E" } };
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  row.height = 24;
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

export async function generateExcel(data: AuditResponse): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "T멤버십 접근성 검수 도구 V0.4";
  wb.created = new Date();

  // ── Sheet 1: 검수 요약 ──────────────────────────────────────────────────
  const summary = wb.addWorksheet("📊 검수 요약");
  summary.columns = [
    { key: "label", width: 22 },
    { key: "value", width: 40 },
  ];
  const meta = [
    ["검수 대상", data.source],
    ["검수 일시", new Date(data.auditDate).toLocaleString("ko-KR")],
    ["입력 방식", data.inputMode === "url" ? "URL" : "HTML 파일"],
    ["CSS 분석", data.cssAnalyzed ? "✅ 포함" : "❌ 미포함 (파일 모드)"],
    ["전체 항목", `${data.totalItems}개 (KS X 3253:2016)`],
    ["자동 검사", `${data.autoItems}개`],
    ["적합 (자동)", `${data.passCount}개`],
    ["부적합 (자동)", `${data.failCount}개`],
    ["검토 필요", `${data.reviewCount}개`],
    ["수동 검사 필요", `${data.manualCount}개`],
    ["접근성 점수", `${data.overallScore}점 / 100점`],
  ];
  meta.forEach(([label, value]) => {
    const row = summary.addRow({ label, value });
    row.height = 18;
    row.getCell("label").font = { bold: true };
  });

  // ── Sheet 2: KS 항목별 결과 ────────────────────────────────────────────
  const detail = wb.addWorksheet("📋 KS 항목별 결과");
  detail.columns = [
    { header: "KS 코드",      key: "code",       width: 10 },
    { header: "원칙",          key: "principle",  width: 16 },
    { header: "범주",          key: "category",   width: 20 },
    { header: "항목명",        key: "name",       width: 26 },
    { header: "심각도",        key: "severity",   width: 10 },
    { header: "검사 방식",     key: "checkType",  width: 12 },
    { header: "판정",          key: "verdict",    width: 14 },
    { header: "신뢰도",        key: "confidence", width: 10 },
    { header: "위반 건수",     key: "count",      width: 10 },
    { header: "사용자 판정",   key: "userVerdict",width: 12 },
    { header: "메모",          key: "note",       width: 40 },
  ];
  headerRow(detail, detail.columns.map((c) => String(c.header ?? "")));

  data.ksItems.forEach((item: KsItemResult) => {
    const effectiveVerdict = item.userVerdict
      ? (item.userVerdict === "pass" ? "pass" : item.userVerdict === "fail" ? "fail" : "review")
      : item.verdict;

    const row = detail.addRow({
      code: item.code,
      principle: item.principle,
      category: item.category,
      name: item.name,
      severity: item.severity,
      checkType: item.autoCheckable ? "자동" : "수동",
      verdict: VERDICT_KO[item.verdict] ?? item.verdict,
      confidence: item.confidence ?? (item.autoCheckable ? "" : "수동"),
      count: item.violations.length || "",
      userVerdict: item.userVerdict
        ? (item.userVerdict === "pass" ? "✅ 적합" : item.userVerdict === "fail" ? "❌ 부적합" : "⚠️ 검토필요")
        : "",
      note: item.userNote ?? "",
    });
    const fill = VERDICT_FILL[effectiveVerdict] ?? VERDICT_FILL.na;
    row.eachCell((cell) => { cell.fill = fill as ExcelJS.Fill; });
    row.height = 18;
    row.alignment = { vertical: "middle", wrapText: true };
  });

  // ── Sheet 3: 위반 상세 ─────────────────────────────────────────────────
  const violations = wb.addWorksheet("🔍 위반 상세");
  violations.columns = [
    { header: "KS 코드",  key: "code",     width: 10 },
    { header: "항목명",   key: "name",     width: 24 },
    { header: "룰 ID",    key: "ruleId",   width: 22 },
    { header: "선택자",   key: "selector", width: 40 },
    { header: "위반 내용",key: "message",  width: 60 },
    { header: "HTML 발췌",key: "snippet",  width: 50 },
  ];
  headerRow(violations, violations.columns.map((c) => String(c.header ?? "")));

  data.ksItems.forEach((item) => {
    if (item.violations.length === 0) return;
    item.violations.forEach((v) => {
      const row = violations.addRow({
        code: item.code,
        name: item.name,
        ruleId: item.ruleIds.join(", "),
        selector: v.selector,
        message: v.message,
        snippet: v.snippet,
      });
      row.height = 36;
      row.alignment = { vertical: "middle", wrapText: true };
      row.fill = VERDICT_FILL.fail as ExcelJS.Fill;
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
