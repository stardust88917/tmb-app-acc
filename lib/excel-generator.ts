import ExcelJS from "exceljs";
import type { AuditResponse, KsItemResult, MultiAuditResponse } from "./types";

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
    { header: "자동 판정",     key: "verdict",    width: 14 },
    { header: "신뢰도",        key: "confidence", width: 10 },
    { header: "위반 건수",     key: "count",      width: 10 },
    { header: "검사자 판정",   key: "userVerdict",width: 14 },
    { header: "검사자 메모",   key: "userMemo",   width: 40 },
  ];
  headerRow(detail, detail.columns.map((c) => String(c.header ?? "")));

  const INSPECTOR_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F0FF" } };

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
        ? (item.userVerdict === "pass" ? "✅ 적합" : item.userVerdict === "fail" ? "❌ 부적합" : item.userVerdict === "na" ? "⬜ 해당없음" : "⚠️ 검토필요")
        : "",
      userMemo: item.userMemo ?? "",
    });
    const fill = VERDICT_FILL[effectiveVerdict] ?? VERDICT_FILL.na;
    row.eachCell((cell, colNum) => {
      // 검사자 판정(10)·검사자 메모(11) 열은 보라색 배경 우선
      cell.fill = colNum >= 10 ? INSPECTOR_FILL : fill as ExcelJS.Fill;
    });
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

// ── 멀티 페이지 엑셀 ──────────────────────────────────────────────────────────
export async function generateMultiExcel(data: MultiAuditResponse): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "T멤버십 접근성 검수 도구 V0.4 (멀티)";
  wb.created = new Date();

  const pageLabel = (url: string) => {
    try { return new URL(url).pathname.replace(/^\//, "").slice(0, 30) || url.slice(-20); }
    catch { return url.slice(-30); }
  };

  // ── Sheet 1: 사이트 종합 ────────────────────────────────────────────────
  const ov = data.overview;
  const sum = wb.addWorksheet("📊 사이트 종합");
  sum.columns = [{ key: "k", width: 24 }, { key: "v", width: 50 }];
  [
    ["검수 일시",    new Date(data.auditDate).toLocaleString("ko-KR")],
    ["검수 페이지 수", `${ov.pageCount}개`],
    ["종합 적합률 (최저)", `${ov.overallScore}%`],
    ["사이트 적합",   `${ov.passCount}개 항목 (모든 페이지 적합)`],
    ["사이트 부적합", `${ov.failCount}개 항목 (1개 이상 페이지 부적합)`],
    ["검토 필요",    `${ov.reviewCount}개`],
    ["수동 검사",    `${ov.manualCount}개`],
    ["실패 URL 수",  `${data.failed.length}개`],
  ].forEach(([k, v]) => {
    const r = sum.addRow({ k, v }); r.height = 18;
    r.getCell("k").font = { bold: true };
  });
  sum.addRow([]);

  // 페이지별 점수 표
  const scoreHeader = sum.addRow(["페이지", "적합률", "URL"]);
  scoreHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  scoreHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A237E" } };
  for (const ps of ov.pageScores) {
    const r = sum.addRow([pageLabel(ps.source), ps.score !== null ? `${ps.score}%` : "—", ps.source]);
    r.height = 18;
    const scoreNum = ps.score ?? 0;
    r.getCell(2).fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: scoreNum >= 80 ? "FFE8F5E9" : scoreNum >= 60 ? "FFFFF8E1" : "FFFDE8E8" },
    };
  }

  // 최다 부적합 항목
  if (ov.worstItems.length > 0) {
    sum.addRow([]);
    const wh = sum.addRow(["최다 부적합 항목", "KS 코드", "부적합 페이지 수"]);
    wh.font = { bold: true, color: { argb: "FFFFFFFF" } };
    wh.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB71C1C" } };
    for (const w of ov.worstItems) {
      sum.addRow([w.name, w.code, `${w.failPageCount}/${ov.pageCount}페이지`]);
    }
  }

  // ── Sheet 2: 일관성 결함 ───────────────────────────────────────────────
  const cons = wb.addWorksheet("⚠️ 일관성 결함");
  cons.columns = [
    { header: "심각도", key: "sev", width: 10 },
    { header: "KS 코드", key: "code", width: 10 },
    { header: "항목명", key: "name", width: 26 },
    { header: "유형", key: "type", width: 14 },
    { header: "설명", key: "desc", width: 60 },
    { header: "부적합 페이지", key: "fail", width: 50 },
    { header: "적합 페이지", key: "pass", width: 50 },
  ];
  headerRow(cons, cons.columns.map((c) => String(c.header ?? "")));
  const sevFill: Record<string, string> = { high: "FFFDE8E8", medium: "FFFFF8E1", low: "FFF5F5F5" };
  for (const ci of data.consistency) {
    const r = cons.addRow({
      sev: ci.severity === "high" ? "🔴 높음" : ci.severity === "medium" ? "🟡 중간" : "🟢 낮음",
      code: ci.ksCode, name: ci.ksName,
      type: ci.type === "mixed-verdict" ? "판정 혼재" : ci.type === "structure" ? "구조 불일치" : "내비게이션",
      desc: ci.description,
      fail: ci.affectedPages.map(pageLabel).join("\n"),
      pass: ci.passingPages.map(pageLabel).join("\n"),
    });
    r.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sevFill[ci.severity] } };
    });
    r.height = 36; r.alignment = { vertical: "middle", wrapText: true };
  }

  // ── Sheet 3: 페이지별 KS 결과 (행: 항목, 열: 페이지) ──────────────────
  const detail = wb.addWorksheet("📋 KS 항목별 결과");
  const pageCols = data.pages.map((p) => pageLabel(p.source));
  detail.columns = [
    { header: "KS 코드", key: "code", width: 10 },
    { header: "원칙",    key: "prin",  width: 14 },
    { header: "항목명",  key: "name",  width: 26 },
    ...pageCols.map((lbl, i) => ({ header: lbl, key: `p${i}`, width: 14 })),
  ];
  headerRow(detail, detail.columns.map((c) => String(c.header ?? "")));

  const ksCodes = data.pages[0]?.ksItems.map((i) => i.code) ?? [];
  for (const code of ksCodes) {
    const ksItem = data.pages[0].ksItems.find((i) => i.code === code)!;
    const rowData: Record<string, string> = {
      code, prin: ksItem.principle, name: ksItem.name,
    };
    data.pages.forEach((p, i) => {
      const item = p.ksItems.find((ki) => ki.code === code);
      rowData[`p${i}`] = VERDICT_KO[item?.userVerdict ?? item?.verdict ?? "na"] ?? "";
    });
    const r = detail.addRow(rowData);
    r.height = 18; r.alignment = { vertical: "middle", wrapText: true };
    // 행 배경: 어느 페이지든 fail이면 연한 빨강
    const hasFail = data.pages.some((p) =>
      (p.ksItems.find((ki) => ki.code === code)?.verdict ?? "na") === "fail"
    );
    if (hasFail) r.eachCell((cell) => { cell.fill = VERDICT_FILL.fail as ExcelJS.Fill; });
  }

  // ── Sheet 4: 전체 위반 상세 ────────────────────────────────────────────
  const vio = wb.addWorksheet("🔍 위반 상세");
  vio.columns = [
    { header: "페이지",   key: "page",     width: 26 },
    { header: "KS 코드",  key: "code",     width: 10 },
    { header: "항목명",   key: "name",     width: 24 },
    { header: "선택자",   key: "selector", width: 38 },
    { header: "위반 내용",key: "message",  width: 55 },
    { header: "HTML 발췌",key: "snippet",  width: 45 },
  ];
  headerRow(vio, vio.columns.map((c) => String(c.header ?? "")));
  for (const page of data.pages) {
    const lbl = pageLabel(page.source);
    for (const item of page.ksItems) {
      for (const v of item.violations) {
        const r = vio.addRow({ page: lbl, code: item.code, name: item.name, selector: v.selector, message: v.message, snippet: v.snippet });
        r.height = 30; r.alignment = { vertical: "middle", wrapText: true };
        r.fill = VERDICT_FILL.fail as ExcelJS.Fill;
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
