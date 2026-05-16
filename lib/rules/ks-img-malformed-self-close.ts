import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

// Matches <img ...> that are NOT self-closed with />  (HTML5 void syntax is fine,
// but some legacy HTML has <img .../> mangled into <img .../ attr>)
const MALFORMED_RE = /<img\b[^>]*(?<!\/)>/gi;

export const rule: Rule = {
  id: "ks-img-malformed-self-close",
  ksCode: "8.1-01",
  ksName: "운영체제 접근성 기능 준수",
  principle: "견고성",
  guideline: "8.1 OS 접근성",
  category: "8.1 OS 접근성",
  priority: "medium",
  isBestPractice: false,
  description: "img 태그가 올바르게 닫히지 않으면 일부 보조기술에서 파싱 오류가 발생할 수 있습니다.",
  check(_$: CheerioAPI, htmlText?: string): CheckResult {
    if (!htmlText) {
      return { verdict: "해당없음", issues: [], passCount: 0, checkedCount: 0,
        notes: "HTML 텍스트를 전달받지 못해 검사를 수행할 수 없습니다." };
    }

    const matches = [...htmlText.matchAll(MALFORMED_RE)];
    // cheerio normalizes HTML, so raw-text check is the only reliable approach here
    const issues = matches.slice(0, 20).map((m) => ({
      selector: "img",
      html: m[0].slice(0, 250),
      message: "img 태그가 self-close 형식(/>)으로 닫히지 않았습니다.",
      suggestion: "XHTML 호환성이 필요하면 <img ... /> 형식을 사용하세요. HTML5에서는 <img ...>도 유효합니다.",
    }));

    const checkedCount = matches.length;
    if (checkedCount === 0) {
      return { verdict: "해당없음", issues: [], passCount: 0, checkedCount: 0,
        notes: "비정상적인 img self-close 패턴이 없습니다." };
    }
    return {
      verdict: issues.length > 0 ? "검토필요" : "적합",
      issues,
      passCount: 0,
      checkedCount,
      notes: "raw HTML 패턴 기반 검사입니다. HTML5 파서는 <img>를 유효한 void 요소로 처리합니다.",
    };
  },
};
