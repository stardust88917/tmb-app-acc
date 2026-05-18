import { load } from "cheerio";
import { allRules } from "@/lib/rules";
import ksRulesRaw from "@/data/ks-rules.json";
import manualGuidesData from "@/data/manual-check-guides.json";
import type {
  AuditResponse,
  KsItemResult,
  KsVerdict,
  RuleResult,
  Violation,
  ManualCheckGuide,
} from "@/lib/types";

type KsRuleRow = {
  code: string;
  clause: string;
  category: string;
  name: string;
  criteriaPass?: string;
  criteriaFail?: string;
  iosHint?: string;
  androidHint?: string;
  severity: string;
  note?: string;
};

const KS_RULES = (ksRulesRaw as { rules: KsRuleRow[] }).rules;
const MANUAL_GUIDES = manualGuidesData as ManualCheckGuide[];

// ── clause 번호 → 원칙명 ──────────────────────────────────────────────────────
function getPrinciple(clause: string): string {
  const n = parseInt(clause, 10);
  if (n === 5) return "인식의 용이성";
  if (n === 6) return "운용의 용이성";
  if (n === 7) return "이해의 용이성";
  if (n === 8) return "견고성";
  return clause;
}

// ── 자동 검사 가능 KS 코드 집합 (registry 기반) ──────────────────────────────
const AUTO_KS_CODES = new Set(allRules.map((r) => r.ksCode));

// ── 미디어 존재 여부로 N/A 항목 감지 ─────────────────────────────────────────
function detectNaItems(htmlText: string): Set<string> {
  const $ = load(htmlText);
  const na = new Set<string>();

  const hasVideo =
    $("video").length > 0 ||
    $('source[type^="video/"]').length > 0;

  const hasAudio =
    $("audio").length > 0 ||
    $('source[type^="audio/"]').length > 0;

  const hasMediaIframe =
    $('iframe[src*="youtube.com"], iframe[src*="youtu.be"], iframe[src*="vimeo.com"]')
      .length > 0;

  if (!hasVideo && !hasMediaIframe) na.add("5.2-01");
  if (!hasAudio)                     na.add("5.2-02");

  return na;
}

// ── 모든 룰 실행 ────────────────────────────────────────────────────────────
export function runAllRules(
  htmlText: string,
  css?: string
): RuleResult[] {
  const $ = load(htmlText);
  return allRules.map((rule) => {
    try {
      const violations: Violation[] =
        rule.requiresCss && !css
          ? []                                       // CSS 필요하지만 없음 → 건너뜀
          : rule.check($, htmlText, css);
      return {
        ruleId: rule.id,
        ksCode: rule.ksCode,
        confidence: rule.confidence,
        violations,
      };
    } catch (err) {
      console.error(`[rule:${rule.id}]`, err);
      return { ruleId: rule.id, ksCode: rule.ksCode, confidence: "low", violations: [] };
    }
  });
}

// ── 룰 결과 → 34개 KS 항목으로 매핑 ─────────────────────────────────────────
export function mapToKsItems(
  ruleResults: RuleResult[],
  cssAvailable: boolean,
  naOverrides: Set<string> = new Set()
): KsItemResult[] {
  // ksCode → 해당 룰 결과들
  const byCode = new Map<string, RuleResult[]>();
  for (const rr of ruleResults) {
    const list = byCode.get(rr.ksCode) ?? [];
    list.push(rr);
    byCode.set(rr.ksCode, list);
  }

  return KS_RULES.map((ks) => {
    const principle = getPrinciple(ks.clause);
    const autoCheckable = AUTO_KS_CODES.has(ks.code);
    const manualGuide = MANUAL_GUIDES.find((g) => g.ksCode === ks.code);
    const relatedRules = byCode.get(ks.code) ?? [];

    // ── 공통 필드 ───────────────────────────────────────────────────────
    const base = {
      code: ks.code,
      name: ks.name,
      principle,
      category: ks.category,
      severity: ks.severity,
      autoCheckable,
      criteriaPass: ks.criteriaPass,
      criteriaFail: ks.criteriaFail,
      iosHint: ks.iosHint,
      androidHint: ks.androidHint,
      note: ks.note,
    };

    // ── N/A 오버라이드 (미디어 없는 페이지의 5.2-01/02 등) ────────────────
    if (naOverrides.has(ks.code)) {
      return {
        ...base,
        autoCheckable: false,
        verdict: "na" as KsVerdict,
        violations: [],
        ruleIds: [],
        manualGuide,
      };
    }

    // ── 수동 검사 전용 항목 ─────────────────────────────────────────────
    if (!autoCheckable) {
      return {
        ...base,
        verdict: "manual" as KsVerdict,
        violations: [],
        ruleIds: [],
        manualGuide,
      };
    }

    // ── 자동 검사 항목 ──────────────────────────────────────────────────
    // CSS가 필요한 룰인데 CSS가 없으면 → 검토 필요
    const cssRequired = relatedRules.some((r) => {
      const rule = allRules.find((ar) => ar.id === r.ruleId);
      return rule?.requiresCss && !cssAvailable;
    });

    // 모든 위반 수집
    const allViolations: Violation[] = relatedRules.flatMap((r) => r.violations);

    // 최저 신뢰도
    const confidencePriority = { high: 3, medium: 2, low: 1 } as const;
    const minConfidence: "high" | "medium" | "low" =
      relatedRules.reduce(
        (min, r) =>
          confidencePriority[r.confidence] < confidencePriority[min]
            ? r.confidence
            : min,
        "high" as "high" | "medium" | "low"
      );

    let verdict: KsVerdict;
    if (relatedRules.length === 0) {
      verdict = "na";
    } else if (cssRequired && allViolations.length === 0) {
      verdict = "review";                            // CSS 없어서 불완전 검사
    } else if (allViolations.length === 0) {
      verdict = "pass";
    } else if (minConfidence === "low") {
      verdict = "review";
    } else {
      verdict = "fail";
    }

    return {
      ...base,
      verdict,
      violations: allViolations,
      ruleIds: relatedRules.map((r) => r.ruleId),
      confidence: minConfidence,
      cssRequired: cssRequired || undefined,
      manualGuide,
    };
  });
}

// ── 집계 ──────────────────────────────────────────────────────────────────
function computeSummary(items: KsItemResult[]) {
  const autoItems = items.filter((i) => i.autoCheckable);
  const passCount = autoItems.filter((i) => i.verdict === "pass").length;
  const failCount = autoItems.filter((i) => i.verdict === "fail").length;
  const reviewCount = autoItems.filter((i) => i.verdict === "review").length;
  const manualCount = items.filter((i) => i.verdict === "manual").length;
  const evaluated = passCount + failCount;
  const overallScore = evaluated > 0 ? Math.round((passCount / evaluated) * 100) : 100;
  return { autoItems: autoItems.length, passCount, failCount, reviewCount, manualCount, overallScore };
}

// ── 최상위 진입점 ──────────────────────────────────────────────────────────
export async function runAuditFromHtml(
  htmlText: string,
  fileName: string
): Promise<AuditResponse> {
  const naOverrides = detectNaItems(htmlText);
  const ruleResults = runAllRules(htmlText, undefined);
  const ksItems = mapToKsItems(ruleResults, false, naOverrides);
  const summary = computeSummary(ksItems);
  return {
    source: fileName,
    auditDate: new Date().toISOString(),
    inputMode: "file",
    cssAnalyzed: false,
    ksItems,
    totalItems: ksItems.length,
    ...summary,
  };
}

export async function runAuditFromUrl(url: string): Promise<AuditResponse> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  const htmlText = await res.text();

  // CSS 수집
  const $ = load(htmlText);
  const cssHrefs = $('link[rel="stylesheet"]')
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter(Boolean) as string[];

  const cssContents = await Promise.allSettled(
    cssHrefs.slice(0, 5).map((href) => {
      const full = href.startsWith("http") ? href : new URL(href, url).href;
      return fetch(full, { signal: AbortSignal.timeout(5_000) }).then((r) => r.text());
    })
  );
  const css = cssContents
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value)
    .join("\n");

  const naOverrides = detectNaItems(htmlText);
  const ruleResults = runAllRules(htmlText, css || undefined);
  const ksItems = mapToKsItems(ruleResults, css.length > 0, naOverrides);
  const summary = computeSummary(ksItems);

  return {
    source: url,
    auditDate: new Date().toISOString(),
    inputMode: "url",
    cssAnalyzed: css.length > 0,
    ksItems,
    totalItems: ksItems.length,
    ...summary,
  };
}
