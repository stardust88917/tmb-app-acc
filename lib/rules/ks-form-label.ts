import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

const SKIP_TYPES = new Set(["hidden","submit","button","reset","image"]);

export const rule: Rule = {
  id: "ks-form-label",
  ksCode: "7.1-01",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    return $("input,select,textarea")
      .toArray()
      .filter((el) => {
        const $el = $(el);
        const type = ($el.attr("type") ?? "text").toLowerCase();
        if (SKIP_TYPES.has(type)) return false;
        if (($el.attr("aria-label") ?? "").trim()) return false;
        if (($el.attr("aria-labelledby") ?? "").trim()) return false;
        if (($el.attr("title") ?? "").trim()) return false;
        if (($el.attr("placeholder") ?? "").trim()) return false; // covered by ks-placeholder-as-label
        const id = $el.attr("id");
        if (id && $(`label[for="${id}"]`).length) return false;
        if ($el.closest("label").length) return false;
        return true;
      })
      .slice(0, 10)
      .map((el) => {
        const tag = (el as { tagName?: string }).tagName ?? "input";
        const type = $(el).attr("type") ?? "";
        return {
          selector: type ? `${tag}[type="${type}"]` : tag,
          snippet: ($.html(el) ?? "").slice(0, 250),
          message: "폼 컨트롤에 연결된 label 또는 aria-label이 없습니다. label[for] 또는 aria-label을 추가하세요.",
        };
      });
  },
};
