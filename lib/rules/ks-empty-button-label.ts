import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-empty-button-label",
  ksCode: "5.1-01",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    const violations: Violation[] = [];
    $("button, [role='button']").each((_, el) => {
      const $el = $(el);
      const ariaLabel = ($el.attr("aria-label") ?? "").trim();
      const title = ($el.attr("title") ?? "").trim();
      if (ariaLabel || title) return;
      const text = $el.text().trim();
      const hasBlind = $el.find(".blind,.sr-only,[class*='visually-hidden'],[class*='screen-reader']").length > 0;
      const hasImgAlt = $el.find("img[alt]").toArray().some((img) =>
        ((img as { attribs?: Record<string, string> }).attribs?.alt ?? "").trim() !== ""
      );
      if (!text && !hasBlind && !hasImgAlt) {
        violations.push({
          selector: (el as { tagName?: string }).tagName ?? "button",
          snippet: ($.html(el) ?? "").slice(0, 250),
          message: "버튼에 접근 가능한 이름이 없습니다. 텍스트, aria-label, title 중 하나를 추가하세요.",
        });
      }
    });
    return violations;
  },
};
