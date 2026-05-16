import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-focus-order",
  ksCode: "2.1.2",
  ksName: "초점 이동",
  principle: "운용의 용이성",
  guideline: "2.1 입력장치 접근성",
  priority: "high",
  isBestPractice: false,
  description:
    "키보드에 의한 초점은 논리적으로 이동해야 하며 시각적으로 구별할 수 있어야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    // tabindex > 0 — 탭 순서가 DOM 순서를 벗어남
    $("[tabindex]").each((_, el) => {
      const tabindex = parseInt($(el).attr("tabindex") ?? "0", 10);
      checkedCount++;
      if (tabindex > 0) {
        issues.push({
          selector: `[tabindex="${tabindex}"]`,
          html: $.html(el).slice(0, 300),
          message: `tabindex="${tabindex}" — 양수 tabindex는 DOM 탭 순서를 변경하여 예측 불가능한 초점 이동을 유발합니다.`,
          suggestion:
            "tabindex 값을 0 또는 -1로 변경하고, DOM 순서를 논리적으로 배치하여 탭 순서를 자연스럽게 만드세요.",
        });
      } else {
        passCount++;
      }
    });

    // aria-hidden="true" 안에 포커스 가능한 요소
    $('[aria-hidden="true"]').each((_, el) => {
      const focusable = $(el).find(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        checkedCount++;
        issues.push({
          selector: '[aria-hidden="true"]',
          html: $.html(el).slice(0, 300),
          message: `aria-hidden="true" 영역 안에 포커스 가능한 요소가 ${focusable.length}개 있습니다. 스크린 리더가 숨겼지만 키보드로 진입 가능합니다.`,
          suggestion:
            "aria-hidden 영역 안의 포커스 가능 요소에 tabindex=\"-1\"을 추가하거나, aria-hidden 영역 자체를 재설계하세요.",
        });
      }
    });

    // onclick이 있으나 keyboard 이벤트가 없는 비상호작용 요소
    const nonInteractiveTags = ["div", "span", "li", "td", "tr", "p"];
    nonInteractiveTags.forEach((tag) => {
      $(`${tag}[onclick]`).each((_, el) => {
        const $el = $(el);
        const hasKeyboard =
          $el.attr("onkeydown") ||
          $el.attr("onkeypress") ||
          $el.attr("onkeyup");
        const hasRole = $el.attr("role");
        const hasTabindex = $el.attr("tabindex");
        checkedCount++;
        if (!hasKeyboard || (!hasRole && !hasTabindex)) {
          issues.push({
            selector: `${tag}[onclick]`,
            html: $.html(el).slice(0, 300),
            message: `<${tag}> 요소에 onclick 핸들러가 있으나 키보드 이벤트나 role/tabindex가 없습니다. 키보드로 접근·조작 불가능합니다.`,
            suggestion: `<button> 또는 <a>로 교체하거나, role="button"과 tabindex="0", onkeydown 핸들러를 추가하세요.`,
          });
        } else {
          passCount++;
        }
      });
    });

    if (checkedCount === 0) {
      return {
        verdict: "적합",
        issues: [],
        passCount: 1,
        checkedCount: 1,
        notes: "tabindex 관련 이슈 없음. 동적 초점 이동은 수동 검사가 필요합니다.",
      };
    }

    return {
      verdict: issues.length > 0 ? "부적합" : "적합",
      issues,
      passCount,
      checkedCount,
    };
  },
};
