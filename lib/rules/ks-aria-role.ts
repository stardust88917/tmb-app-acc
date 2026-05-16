import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

// WAI-ARIA 1.2 유효 role 목록 (주요 값)
const VALID_ROLES = new Set([
  "alert","alertdialog","application","article","banner","button","cell",
  "checkbox","columnheader","combobox","complementary","contentinfo",
  "definition","dialog","directory","document","feed","figure","form",
  "grid","gridcell","group","heading","img","link","list","listbox",
  "listitem","log","main","marquee","math","menu","menubar","menuitem",
  "menuitemcheckbox","menuitemradio","navigation","none","note","option",
  "presentation","progressbar","radio","radiogroup","region","row",
  "rowgroup","rowheader","scrollbar","search","searchbox","separator",
  "slider","spinbutton","status","switch","tab","table","tablist","tabpanel",
  "term","textbox","timer","toolbar","tooltip","tree","treegrid","treeitem",
]);

// role별 필수 aria 속성
const REQUIRED_ATTRS: Record<string, string[]> = {
  checkbox: ["aria-checked"],
  combobox: ["aria-expanded"],
  option: ["aria-selected"],
  radio: ["aria-checked"],
  scrollbar: ["aria-controls", "aria-valuenow"],
  slider: ["aria-valuenow"],
  spinbutton: ["aria-valuenow"],
  switch: ["aria-checked"],
  tab: ["aria-selected"],
};

export const rule: Rule = {
  id: "ks-aria-role",
  ksCode: "4.2.1",
  ksName: "웹 애플리케이션 접근성 준수",
  principle: "견고성",
  guideline: "4.2 웹 애플리케이션 접근성",
  priority: "high",
  isBestPractice: false,
  description: "콘텐츠에 WAI-ARIA를 사용한 경우, 해당 기술 사양을 준수해야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    $("[role]").each((_, el) => {
      const $el = $(el);
      const roles = ($el.attr("role") ?? "").trim().split(/\s+/).filter(Boolean);

      for (const role of roles) {
        checkedCount++;

        // 유효하지 않은 role
        if (!VALID_ROLES.has(role)) {
          issues.push({
            selector: `[role="${role}"]`,
            html: $.html(el).slice(0, 300),
            message: `role="${role}"는 WAI-ARIA 사양에 없는 값입니다.`,
            suggestion: `유효한 ARIA role 값을 사용하세요. 필요 없는 경우 role 속성을 제거하세요.`,
          });
          continue;
        }

        // 필수 aria 속성 확인
        const requiredAttrs = REQUIRED_ATTRS[role] ?? [];
        const missingAttrs = requiredAttrs.filter(
          (attr) => !$el.attr(attr)
        );
        if (missingAttrs.length > 0) {
          issues.push({
            selector: `[role="${role}"]`,
            html: $.html(el).slice(0, 300),
            message: `role="${role}"에 필수 속성 ${missingAttrs.map((a) => `"${a}"`).join(", ")}이 없습니다.`,
            suggestion: `role="${role}" 요소에 ${missingAttrs.join(", ")} 속성을 추가하세요.`,
          });
          continue;
        }

        passCount++;
      }
    });

    // aria-* 속성을 사용하는 요소 중 role이 없는 경우 (간단한 검사)
    $("[aria-labelledby]").each((_, el) => {
      const ids = ($( el).attr("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
      checkedCount++;
      const allExist = ids.every((id) => $(`#${CSS.escape(id)}`).length > 0);
      if (!allExist) {
        const missing = ids.filter((id) => $(`#${CSS.escape(id)}`).length === 0);
        issues.push({
          selector: "[aria-labelledby]",
          html: $.html(el).slice(0, 300),
          message: `aria-labelledby가 참조하는 id "${missing.join('", "')}"를 가진 요소가 없습니다.`,
          suggestion: `aria-labelledby에 올바른 id를 참조하거나, 참조 대상 요소에 해당 id를 추가하세요.`,
        });
      } else {
        passCount++;
      }
    });

    $("[aria-describedby]").each((_, el) => {
      const ids = ($(el).attr("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
      checkedCount++;
      const allExist = ids.every((id) => $(`#${CSS.escape(id)}`).length > 0);
      if (!allExist) {
        const missing = ids.filter((id) => $(`#${CSS.escape(id)}`).length === 0);
        issues.push({
          selector: "[aria-describedby]",
          html: $.html(el).slice(0, 300),
          message: `aria-describedby가 참조하는 id "${missing.join('", "')}"를 가진 요소가 없습니다.`,
          suggestion: `aria-describedby에 올바른 id를 참조하거나, 참조 대상 요소에 해당 id를 추가하세요.`,
        });
      } else {
        passCount++;
      }
    });

    if (checkedCount === 0) {
      return {
        verdict: "해당없음",
        issues: [],
        passCount: 0,
        checkedCount: 0,
        notes: "WAI-ARIA 속성이 없습니다.",
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
