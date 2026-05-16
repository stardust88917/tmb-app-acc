import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

export const rule: Rule = {
  id: "ks-placeholder-as-label",
  ksCode: "7.1-01",
  ksName: "레이블 제공",
  principle: "이해의 용이성",
  guideline: "7.1 입력 도움",
  category: "7.1 입력 도움",
  priority: "medium",
  isBestPractice: false,
  description: "placeholder만 있고 label이 없는 입력 필드는 포커스 시 힌트가 사라져 입력 목적을 알기 어렵습니다.",
  check($: CheerioAPI): CheckResult {
    const inputs = $("input[placeholder]:not([type=\"hidden\"]):not([type=\"submit\"]):not([type=\"button\"]):not([type=\"reset\"]), textarea[placeholder]");
    const issues = inputs
      .toArray()
      .filter((el) => {
        const $el = $(el);
        const id = $el.attr("id");
        const ariaLabel = $el.attr("aria-label") ?? "";
        const ariaLabelledby = $el.attr("aria-labelledby") ?? "";
        const title = $el.attr("title") ?? "";
        if (ariaLabel.trim() !== "" || ariaLabelledby.trim() !== "" || title.trim() !== "") return false;
        if (id) {
          const hasLabel = $(`label[for="${id}"]`).length > 0;
          if (hasLabel) return false;
        }
        const hasWrappingLabel = $el.closest("label").length > 0;
        return !hasWrappingLabel;
      })
      .map((el) => {
        const placeholder = $(el).attr("placeholder") ?? "";
        return {
          selector: `input[placeholder="${placeholder.slice(0, 40)}"]`,
          html: $.html(el)?.slice(0, 250) ?? "",
          message: `placeholder="${placeholder}" 만 있고 연결된 label이 없습니다.`,
          suggestion: "<label for=\"...\"> 또는 aria-label을 추가해 입력 목적을 명시하세요.",
        };
      });

    const checkedCount = inputs.length;
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
