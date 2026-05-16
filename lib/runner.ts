import { load } from "cheerio";
import { randomUUID } from "crypto";
import { allRules } from "./rules";
import type { AuditResult, PrincipleSummary, Principle, RuleResult } from "./types";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
};

export async function runAuditFromHtml(html: string, fileName: string): Promise<AuditResult> {
  return runRules(html, fileName, 200);
}

export async function runAudit(url: string): Promise<AuditResult> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  const html = await res.text();
  return runRules(html, url, res.status);
}

async function runRules(html: string, sourceLabel: string, fetchStatus: number): Promise<AuditResult> {
  // cheerio 파싱
  const $ = load(html);

  // 14개 룰 실행
  const ruleResults: RuleResult[] = allRules.map((rule) => {
    try {
      const result = rule.check($, html);
      return {
        ruleId: rule.id,
        ksCode: rule.ksCode,
        ksName: rule.ksName,
        principle: rule.principle,
        guideline: rule.guideline,
        category: rule.category,
        verdict: result.verdict,
        priority: rule.priority,
        issues: result.issues,
        isBestPractice: rule.isBestPractice,
        passCount: result.passCount,
        checkedCount: result.checkedCount,
        notes: result.notes,
      };
    } catch (err) {
      return {
        ruleId: rule.id,
        ksCode: rule.ksCode,
        ksName: rule.ksName,
        principle: rule.principle,
        guideline: rule.guideline,
        category: rule.category,
        verdict: "검토필요" as const,
        priority: rule.priority,
        issues: [],
        isBestPractice: rule.isBestPractice,
        passCount: 0,
        checkedCount: 0,
        notes: `룰 실행 오류: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  });

  // 4. 집계
  const principlesSummary = computePrincipleSummary(ruleResults);
  const overallScore = computeScore(ruleResults);

  return {
    id: randomUUID(),
    url: sourceLabel,
    auditedAt: new Date().toISOString(),
    fetchStatus,
    totalItems: ruleResults.length,
    passCount: ruleResults.filter((r) => r.verdict === "적합").length,
    failCount: ruleResults.filter((r) => r.verdict === "부적합").length,
    reviewCount: ruleResults.filter((r) => r.verdict === "검토필요").length,
    naCount: ruleResults.filter((r) => r.verdict === "해당없음").length,
    overallScore,
    principlesSummary,
    ruleResults,
  };
}

function computePrincipleSummary(results: RuleResult[]): PrincipleSummary[] {
  const principles: Principle[] = [
    "인식의 용이성",
    "운용의 용이성",
    "이해의 용이성",
    "견고성",
  ];

  return principles.map((name) => {
    const group = results.filter(
      (r) => r.principle === name && !r.isBestPractice
    );
    const pass = group.filter((r) => r.verdict === "적합").length;
    const fail = group.filter((r) => r.verdict === "부적합").length;
    const review = group.filter((r) => r.verdict === "검토필요").length;
    const na = group.filter((r) => r.verdict === "해당없음").length;
    const evaluated = pass + fail;
    return {
      name,
      total: group.length,
      pass,
      fail,
      review,
      na,
      score: evaluated > 0 ? Math.round((pass / evaluated) * 100) : 100,
    };
  });
}

function computeScore(results: RuleResult[]): number {
  const evaluated = results.filter(
    (r) => r.verdict === "적합" || r.verdict === "부적합"
  );
  if (evaluated.length === 0) return 100;
  const pass = evaluated.filter((r) => r.verdict === "적합").length;
  return Math.round((pass / evaluated.length) * 100);
}
