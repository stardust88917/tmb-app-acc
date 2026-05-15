export type Verdict = "적합" | "부적합" | "검토필요" | "해당없음";
export type Priority = "high" | "medium" | "low";
export type Principle = "인식의 용이성" | "운용의 용이성" | "이해의 용이성" | "견고성" | "모범 사례";

export interface KsItem {
  code: string;
  name: string;
  principle: Principle;
  guideline: string;
  priority: Priority;
  description: string;
}

export interface AuditIssue {
  axeRuleId: string;
  ksCode: string;
  ksName: string;
  principle: Principle;
  verdict: Verdict;
  impact: string;
  description: string;
  helpUrl: string;
  nodes: IssueNode[];
  isBestPractice: boolean;
}

export interface IssueNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

export interface KsCheckResult {
  code: string;
  name: string;
  principle: Principle;
  guideline: string;
  verdict: Verdict;
  priority: Priority;
  issues: AuditIssue[];
  passCount: number;
  isBestPractice: boolean;
}

export interface PrincipleSummary {
  name: Principle;
  total: number;
  pass: number;
  fail: number;
  review: number;
  na: number;
  score: number;
}

export interface AuditResult {
  id: string;
  url: string;
  auditedAt: string;
  totalItems: number;
  passCount: number;
  failCount: number;
  reviewCount: number;
  naCount: number;
  overallScore: number;
  principlesSummary: PrincipleSummary[];
  ksResults: KsCheckResult[];
  rawAxeResults?: unknown;
}

export interface ExcelRow {
  fileName: string;
  componentName: string;
  category: string;
  code: string;
  itemName: string;
  verdict: string;
  issueLocation: string;
  issueContent: string;
  improvement: string;
  priority: string;
  platform: string;
  notes: string;
}
