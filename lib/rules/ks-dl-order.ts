import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

export const rule: Rule = {
  id: "ks-dl-order",
  ksCode: "8.1-01",
  ksName: "운영체제 접근성 기능 준수",
  principle: "견고성",
  guideline: "8.1 OS 접근성",
  category: "8.1 OS 접근성",
  priority: "medium",
  isBestPractice: false,
  description: "dl 요소의 첫 번째 자식이 dt가 아니면 정의 목록 구조가 잘못된 것입니다.",
  check($: CheerioAPI): CheckResult {
    const dls = $("dl");
    const issues = dls
      .toArray()
      .filter((el) => {
        const firstChild = $(el).children().first();
        const tag = firstChild.prop("tagName");
        return tag !== undefined && tag.toLowerCase() !== "dt";
      })
      .map((el) => ({
        selector: "dl",
        html: $.html(el)?.slice(0, 250) ?? "",
        message: "dl 요소의 첫 번째 자식이 dt가 아닙니다.",
        suggestion: "dl 요소는 반드시 dt로 시작하고 dd가 그 뒤에 위치해야 합니다.",
      }));

    const checkedCount = dls.length;
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
