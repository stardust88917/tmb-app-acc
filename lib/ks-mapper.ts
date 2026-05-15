import mappingData from "@/data/axe-ks-mapping.json";
import type { AxeResults, Result, NodeResult } from "axe-core";
import type {
  AuditIssue,
  IssueNode,
  KsCheckResult,
  KsItem,
  Principle,
  PrincipleSummary,
  Verdict,
} from "./types";

const ksItemMap = new Map<string, KsItem>(
  mappingData.ksItems.map((item) => [item.code, item as KsItem])
);

const axeToKsCode = mappingData.axeRuleMapping as Record<string, string>;

export function mapAxeResultsToKS(axeResults: AxeResults): KsCheckResult[] {
  const ksResultMap = new Map<string, KsCheckResult>();

  // Initialize all KS items as "해당없음"
  for (const item of mappingData.ksItems) {
    ksResultMap.set(item.code, {
      code: item.code,
      name: item.name,
      principle: item.principle as Principle,
      guideline: item.guideline,
      verdict: "해당없음",
      priority: item.priority as "high" | "medium" | "low",
      issues: [],
      passCount: 0,
      isBestPractice: item.code === "8.1-01",
    });
  }

  // Process violations (failures)
  for (const violation of axeResults.violations) {
    const ksCode = axeToKsCode[violation.id] ?? "8.1-01";
    const ksResult = ksResultMap.get(ksCode);
    if (!ksResult) continue;

    const issue: AuditIssue = {
      axeRuleId: violation.id,
      ksCode,
      ksName: ksResult.name,
      principle: ksResult.principle,
      verdict: "부적합",
      impact: violation.impact ?? "unknown",
      description: violation.description,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map(nodeToIssueNode),
      isBestPractice: ksCode === "8.1-01",
    };

    ksResult.issues.push(issue);
    ksResult.verdict = "부적합";
  }

  // Process incomplete (needs review)
  for (const incomplete of axeResults.incomplete) {
    const ksCode = axeToKsCode[incomplete.id] ?? "8.1-01";
    const ksResult = ksResultMap.get(ksCode);
    if (!ksResult) continue;

    const issue: AuditIssue = {
      axeRuleId: incomplete.id,
      ksCode,
      ksName: ksResult.name,
      principle: ksResult.principle,
      verdict: "검토필요",
      impact: incomplete.impact ?? "unknown",
      description: incomplete.description,
      helpUrl: incomplete.helpUrl,
      nodes: incomplete.nodes.map(nodeToIssueNode),
      isBestPractice: ksCode === "8.1-01",
    };

    ksResult.issues.push(issue);
    if (ksResult.verdict !== "부적합") {
      ksResult.verdict = "검토필요";
    }
  }

  // Process passes
  for (const pass of axeResults.passes) {
    const ksCode = axeToKsCode[pass.id] ?? "8.1-01";
    const ksResult = ksResultMap.get(ksCode);
    if (!ksResult) continue;

    ksResult.passCount += pass.nodes.length;
    if (ksResult.verdict === "해당없음") {
      ksResult.verdict = "적합";
    }
  }

  // inapplicable → 해당없음 (already default)
  for (const inapplicable of axeResults.inapplicable) {
    const ksCode = axeToKsCode[inapplicable.id] ?? "8.1-01";
    const ksResult = ksResultMap.get(ksCode);
    if (!ksResult) continue;
    // keep as 해당없음 if no other verdict set
  }

  return Array.from(ksResultMap.values());
}

function nodeToIssueNode(node: NodeResult): IssueNode {
  return {
    html: node.html,
    target: node.target.map((t) =>
      typeof t === "string" ? t : JSON.stringify(t)
    ),
    failureSummary: node.failureSummary,
  };
}

export function computePrincipleSummary(
  ksResults: KsCheckResult[]
): PrincipleSummary[] {
  const principleMap = new Map<Principle, PrincipleSummary>();

  const principles: Principle[] = [
    "인식의 용이성",
    "운용의 용이성",
    "이해의 용이성",
    "견고성",
  ];

  for (const p of principles) {
    principleMap.set(p, {
      name: p,
      total: 0,
      pass: 0,
      fail: 0,
      review: 0,
      na: 0,
      score: 0,
    });
  }

  for (const result of ksResults) {
    if (result.principle === "모범 사례") continue;
    const summary = principleMap.get(result.principle);
    if (!summary) continue;

    summary.total++;
    switch (result.verdict) {
      case "적합":
        summary.pass++;
        break;
      case "부적합":
        summary.fail++;
        break;
      case "검토필요":
        summary.review++;
        break;
      case "해당없음":
        summary.na++;
        break;
    }
  }

  for (const summary of principleMap.values()) {
    const evaluated = summary.total - summary.na;
    summary.score = evaluated > 0 ? Math.round((summary.pass / evaluated) * 100) : 100;
  }

  return Array.from(principleMap.values());
}

export function computeOverallScore(ksResults: KsCheckResult[]): number {
  const evaluated = ksResults.filter(
    (r) => r.verdict !== "해당없음" && r.principle !== "모범 사례"
  );
  if (evaluated.length === 0) return 100;
  const pass = evaluated.filter((r) => r.verdict === "적합").length;
  return Math.round((pass / evaluated.length) * 100);
}

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "적합": return "✅ 적합";
    case "부적합": return "❌ 부적합";
    case "검토필요": return "⚠️ 검토필요";
    case "해당없음": return "⬜ 해당없음";
  }
}

export function priorityLabel(priority: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high": return "🔴 높음";
    case "medium": return "🟡 중간";
    case "low": return "🟢 낮음";
  }
}
