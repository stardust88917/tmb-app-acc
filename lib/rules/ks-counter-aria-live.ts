import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

const COUNTER_SELECTORS = [
  "[class*=\"count\"]",
  "[class*=\"badge\"]",
  "[class*=\"cart\"]",
  "[class*=\"알림\"]",
  "[class*=\"noti\"]",
  "[class*=\"notify\"]",
  "[class*=\"counter\"]",
  "[id*=\"count\"]",
  "[id*=\"badge\"]",
  "[id*=\"cart\"]",
];

export const rule: Rule = {
  id: "ks-counter-aria-live",
  ksCode: "5.6-01",
  ksName: "알림 기능 제공",
  principle: "인식의 용이성",
  guideline: "5.6 알림 기능",
  category: "5.6 알림 기능",
  priority: "medium",
  isBestPractice: false,
  description: "숫자 카운터(장바구니, 알림 뱃지 등)에 aria-live가 없으면 수치가 변경될 때 스크린리더가 변경을 알리지 못합니다.",
  check($: CheerioAPI): CheckResult {
    const selector = COUNTER_SELECTORS.join(", ");
    const counters = $(selector);
    const issues = counters
      .toArray()
      .filter((el) => {
        const $el = $(el);
        return !$el.attr("aria-live") && !$el.attr("role");
      })
      .map((el) => {
        const $el = $(el);
        const cls = $el.attr("class") ?? $el.attr("id") ?? "";
        return {
          selector: `[class/id*="${cls.slice(0, 30)}"]`,
          html: $.html(el)?.slice(0, 250) ?? "",
          message: "숫자 카운터/뱃지 요소에 aria-live 속성이 없습니다.",
          suggestion: "동적으로 변경되는 카운터에 aria-live=\"polite\" 또는 role=\"status\"를 추가하세요.",
        };
      });

    const checkedCount = counters.length;
    const passCount = checkedCount - issues.length;

    if (checkedCount === 0) {
      return { verdict: "해당없음", issues: [], passCount: 0, checkedCount: 0,
        notes: "카운터/뱃지 패턴의 요소를 찾을 수 없습니다." };
    }
    return {
      verdict: issues.length > 0 ? "검토필요" : "적합",
      issues,
      passCount,
      checkedCount,
      notes: "정적 분석으로는 동적 업데이트 여부를 확인할 수 없습니다. 실제 동작 확인 필요.",
    };
  },
};
