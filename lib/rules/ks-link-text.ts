import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

const GENERIC_TEXT = /^(자세히보기|more|click here|here|링크|바로가기|더보기|read more|보기)$/i;

export const rule: Rule = {
  id: "ks-link-text",
  ksCode: "6.4-03",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    return $("a[href]")
      .toArray()
      .filter((el) => {
        const $el = $(el);
        const ariaLabel = ($el.attr("aria-label") ?? "").trim();
        const title = ($el.attr("title") ?? "").trim();
        if (ariaLabel || title) return false;
        const hasBlind = $el.find(".blind,.sr-only,[class*='visually-hidden']").length > 0;
        if (hasBlind) return false;
        const text = $el.text().trim();
        if (!text) return true;                    // 텍스트 없음
        if (GENERIC_TEXT.test(text)) return true;  // 의미 없는 링크 텍스트
        return false;
      })
      .slice(0, 10)
      .map((el) => {
        const text = $(el).text().trim() || "(텍스트 없음)";
        return {
          selector: `a[href="${$(el).attr("href")?.slice(0, 40)}"]`,
          snippet: ($.html(el) ?? "").slice(0, 250),
          message: `링크 텍스트 "${text}" — 맥락 없이 의미를 파악할 수 없습니다. aria-label 또는 구체적인 텍스트를 제공하세요.`,
        };
      });
  },
};
