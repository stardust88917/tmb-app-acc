import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

const VALID_ROLES = new Set([
  "alert","alertdialog","application","article","banner","button","cell","checkbox",
  "columnheader","combobox","complementary","contentinfo","definition","dialog",
  "directory","document","feed","figure","form","grid","gridcell","group","heading",
  "img","link","list","listbox","listitem","log","main","marquee","math","menu",
  "menubar","menuitem","menuitemcheckbox","menuitemradio","navigation","none","note",
  "option","presentation","progressbar","radio","radiogroup","region","row","rowgroup",
  "rowheader","scrollbar","search","searchbox","separator","slider","spinbutton",
  "status","switch","tab","table","tablist","tabpanel","term","textbox","timer",
  "toolbar","tooltip","tree","treegrid","treeitem",
]);

export const rule: Rule = {
  id: "ks-aria-usage",
  ksCode: "8.1-02",
  confidence: "medium",
  check($: CheerioAPI): Violation[] {
    const violations: Violation[] = [];

    // 1. 유효하지 않은 role 값
    $("[role]").each((_, el) => {
      const role = ($(el).attr("role") ?? "").trim().toLowerCase();
      if (role && !VALID_ROLES.has(role)) {
        violations.push({
          selector: `[role="${role}"]`,
          snippet: ($.html(el) ?? "").slice(0, 250),
          message: `role="${role}" 은 유효한 WAI-ARIA 역할이 아닙니다.`,
        });
      }
    });

    // 2. aria-required/aria-expanded/aria-checked가 boolean이 아닌 값
    const BOOL_ATTRS = ["aria-required","aria-expanded","aria-checked","aria-disabled","aria-hidden","aria-selected"];
    BOOL_ATTRS.forEach((attr) => {
      $(`[${attr}]`).each((_, el) => {
        const val = ($(el).attr(attr) ?? "").trim();
        if (val !== "true" && val !== "false") {
          violations.push({
            selector: `[${attr}="${val}"]`,
            snippet: ($.html(el) ?? "").slice(0, 250),
            message: `${attr}="${val}" — 값은 "true" 또는 "false" 여야 합니다.`,
          });
        }
      });
    });

    return violations.slice(0, 10);
  },
};
