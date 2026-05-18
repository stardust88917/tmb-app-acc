import type { AuditResponse, ConsistencyIssue, SiteOverview } from "@/lib/types";
import { calculateScore } from "./scoring";

// ── 일관성 결함 감지 ─────────────────────────────────────────────────────────
export function detectInconsistencies(pages: AuditResponse[]): ConsistencyIssue[] {
  if (pages.length < 2) return [];

  const issues: ConsistencyIssue[] = [];
  const ksCodes = pages[0]?.ksItems.map((i) => i.code) ?? [];

  for (const code of ksCodes) {
    const verdicts = pages.map((p) => p.ksItems.find((i) => i.code === code)?.verdict);
    const ksItem = pages[0].ksItems.find((i) => i.code === code);
    if (!ksItem) continue;

    // manual / na 전용 항목은 건너뜀
    const significant = verdicts.filter((v) => v === "pass" || v === "fail" || v === "review");
    if (significant.length < 2) continue;

    const hasFail = significant.includes("fail");
    const hasPass = significant.includes("pass");

    if (hasFail && hasPass) {
      const failPages = pages
        .filter((p) => p.ksItems.find((i) => i.code === code)?.verdict === "fail")
        .map((p) => p.source);
      const passPages = pages
        .filter((p) => p.ksItems.find((i) => i.code === code)?.verdict === "pass")
        .map((p) => p.source);

      const severity =
        ksItem.severity?.includes("높음") ? "high"
        : ksItem.severity?.includes("낮음") ? "low"
        : "medium";

      // 7.2-01 / 7.2-02: 일관성 항목이므로 특별 강조
      const isConsistencyItem = code === "7.2-01" || code === "7.2-02";

      issues.push({
        ksCode: code,
        ksName: ksItem.name,
        type: isConsistencyItem ? "structure" : "mixed-verdict",
        description: isConsistencyItem
          ? `UI 일관성 미준수 — ${failPages.length}개 페이지에서 "${ksItem.name}" 부적합. 동일 UI 컴포넌트가 페이지마다 다른 접근성 품질을 보임.`
          : `${ksItem.name} — ${failPages.length}/${pages.length}개 페이지에서 부적합, ${passPages.length}개 페이지에서 적합. 동일 기준 미적용.`,
        affectedPages: failPages,
        passingPages: passPages,
        severity,
      });
    }
  }

  // 내비게이션 구조 일관성 (6.1-01 기반)
  const navVerdicts = pages.map((p) => ({
    source: p.source,
    v: p.ksItems.find((i) => i.code === "6.1-01")?.verdict,
  }));
  const navFail = navVerdicts.filter((x) => x.v === "fail").map((x) => x.source);
  const navPass = navVerdicts.filter((x) => x.v === "pass").map((x) => x.source);
  if (navFail.length > 0 && navPass.length > 0) {
    // 이미 mixed-verdict로 감지됨 — 중복 방지
    const alreadyAdded = issues.some((i) => i.ksCode === "6.1-01");
    if (!alreadyAdded) {
      issues.push({
        ksCode: "6.1-01",
        ksName: "초점 이동 순서 논리적",
        type: "navigation",
        description: `내비게이션 구조 불일치 — ${navFail.length}개 페이지에서 초점 순서·건너뛰기 링크 미제공`,
        affectedPages: navFail,
        passingPages: navPass,
        severity: "high",
      });
    }
  }

  // 심각도 순 정렬
  const order = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return issues;
}

// ── 사이트 종합 집계 ─────────────────────────────────────────────────────────
export function computeOverview(pages: AuditResponse[]): SiteOverview {
  if (pages.length === 0) {
    return {
      pageCount: 0,
      passCount: 0, failCount: 0, reviewCount: 0, manualCount: 0,
      overallScore: 0,
      pageScores: [],
      worstItems: [],
    };
  }

  const ksCodes = pages[0].ksItems.map((i) => i.code);
  const pageScores = pages.map((p) => {
    const s = calculateScore(p.ksItems);
    return { source: p.source, score: s.rate };
  });

  let passCount = 0, failCount = 0, reviewCount = 0, manualCount = 0;

  // 각 KS 코드에 대해 strictest (ANY fail → fail) 집계
  const worstItems: SiteOverview["worstItems"] = [];
  for (const code of ksCodes) {
    const verdicts = pages.map((p) => p.ksItems.find((i) => i.code === code)?.verdict);
    const failPages = pages
      .filter((p) => p.ksItems.find((i) => i.code === code)?.verdict === "fail")
      .map((p) => p.source);

    if (verdicts.includes("fail")) {
      failCount++;
      if (failPages.length > 0) {
        const ksName = pages[0].ksItems.find((i) => i.code === code)?.name ?? code;
        worstItems.push({ code, name: ksName, failPageCount: failPages.length, failPages });
      }
    } else if (verdicts.includes("review")) {
      reviewCount++;
    } else if (verdicts.some((v) => v === "pass")) {
      passCount++;
    } else {
      manualCount++;
    }
  }

  worstItems.sort((a, b) => b.failPageCount - a.failPageCount);

  const validScores = pageScores.map((p) => p.score).filter((s): s is number => s !== null);
  const overallScore = validScores.length > 0 ? Math.min(...validScores) : 0;

  return {
    pageCount: pages.length,
    passCount, failCount, reviewCount, manualCount,
    overallScore: Math.round(overallScore * 10) / 10,
    pageScores,
    worstItems: worstItems.slice(0, 10),
  };
}
