export type Verdict = "적합" | "부적합" | "검토필요" | "해당없음";
export type Priority = "high" | "medium" | "low";
export type Principle =
  | "인식의 용이성"
  | "운용의 용이성"
  | "이해의 용이성"
  | "견고성"
  | "모범 사례";

export interface Issue {
  selector: string;
  html: string;
  message: string;
  suggestion: string;
}

export interface RuleResult {
  ruleId: string;
  ksCode: string;
  ksName: string;
  principle: Principle;
  guideline: string;
  verdict: Verdict;
  priority: Priority;
  issues: Issue[];
  isBestPractice: boolean;
  passCount: number;
  checkedCount: number;
  notes?: string;
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
  fetchStatus: number;
  totalItems: number;
  passCount: number;
  failCount: number;
  reviewCount: number;
  naCount: number;
  overallScore: number;
  principlesSummary: PrincipleSummary[];
  ruleResults: RuleResult[];
}
