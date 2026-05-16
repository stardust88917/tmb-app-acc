import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

export const rule: Rule = {
  id: "ks-empty-aria-label",
  ksCode: "5.1-01",
  ksName: "이미지 대체 텍스트 제공",
  principle: "인식의 용이성",
  guideline: "5.1 대체 텍스트",
  category: "5.1 대체 텍스트",
  priority: "high",
  isBestPractice: false,
  description: "aria-label이 빈 문자열이면 보조기술이 해당 요소를 접근 가능한 이름 없이 처리합니다.",
  check($: CheerioAPI): CheckResult {
    const elements = $("[aria-label]");
    const issues = elements
      .toArray()
      .filter((el) => {
        const label = $(el).attr("aria-label");
        return label !== undefined && label.trim() === "";
      })
      .map((el) => {
        const tag = (el as { tagName?: string }).tagName ?? "element";
        return {
          selector: `${tag}[aria-label=""]`,
          html: $.html(el)?.slice(0, 250) ?? "",
          message: "aria-label 속성값이 비어 있습니다.",
          suggestion: "aria-label에 요소의 역할과 내용을 설명하는 텍스트를 입력하세요.",
        };
      });

    const checkedCount = elements.length;
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
