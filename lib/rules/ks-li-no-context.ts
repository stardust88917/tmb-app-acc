import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-li-no-context",
  ksCode: "5.1-02",
  confidence: "medium",
  check($: CheerioAPI): Violation[] {
    return $("li")
      .toArray()
      .filter((el) => {
        const $el = $(el);
        if ($el.text().trim()) return false;
        if (($el.attr("aria-label") ?? "").trim()) return false;
        if ($el.find(".blind,.sr-only,[class*='visually-hidden']").length) return false;
        if ($el.find("img[alt]").toArray().some((img) =>
          ((img as { attribs?: Record<string, string> }).attribs?.alt ?? "").trim()
        )) return false;
        return true;
      })
      .slice(0, 10)
      .map((el) => ({
        selector: "li",
        snippet: ($.html(el) ?? "").slice(0, 250),
        message: "li 항목에 텍스트나 접근 가능한 이름이 없습니다. aria-label 또는 내부 텍스트를 추가하세요.",
      }));
  },
};
