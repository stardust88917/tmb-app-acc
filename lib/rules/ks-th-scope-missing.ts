import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

export const rule: Rule = {
  id: "ks-th-scope-missing",
  ksCode: "8.1-01",
  ksName: "운영체제 접근성 기능 준수",
  principle: "견고성",
  guideline: "8.1 OS 접근성",
  category: "8.1 OS 접근성",
  priority: "medium",
  isBestPractice: false,
  description: "th 요소에 scope 속성이 없으면 보조기술이 데이터 셀과의 관계를 파악하기 어렵습니다.",
  check($: CheerioAPI): CheckResult {
    const ths = $("th");
    const issues = ths
      .toArray()
      .filter((el) => {
        const scope = $(el).attr("scope");
        return scope === undefined || scope.trim() === "";
      })
      .map((el) => ({
        selector: "th",
        html: $.html(el)?.slice(0, 250) ?? "",
        message: "th 요소에 scope 속성이 없습니다.",
        suggestion: "행 헤더는 scope=\"row\", 열 헤더는 scope=\"col\"을 추가하세요.",
      }));

    const checkedCount = ths.length;
    const passCount = checkedCount - issues.length;

    if (checkedCount === 0) {
      return { verdict: "해당없음", issues: [], passCount: 0, checkedCount: 0 };
    }
    return {
      verdict: issues.length > 0 ? "부적합" : "적합",
      issues,
      passCount,
      checkedCount,
    };
  },
};
