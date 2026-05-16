import type { CheerioAPI } from "cheerio";

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

export interface CheckResult {
  verdict: Verdict;
  issues: Issue[];
  passCount: number;
  checkedCount: number;
  notes?: string;
}

export interface Rule {
  id: string;
  ksCode: string;
  ksName: string;
  principle: Principle;
  guideline: string;
  priority: Priority;
  isBestPractice: boolean;
  description: string;
  check: ($: CheerioAPI) => CheckResult;
}
