import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

const SELECTORS = [
  "[class*='count']","[class*='badge']","[class*='cart']",
  "[class*='noti']","[class*='notify']","[class*='counter']",
  "[id*='count']","[id*='badge']","[id*='cart']",
].join(",");

export const rule: Rule = {
  id: "ks-counter-aria-live",
  ksCode: "5.6-01",
  confidence: "low",
  check($: CheerioAPI): Violation[] {
    return $(SELECTORS)
      .toArray()
      .filter((el) => !$(el).attr("aria-live") && !$(el).attr("role"))
      .slice(0, 5)
      .map((el) => {
        const $el = $(el);
        const id = $el.attr("class") ?? $el.attr("id") ?? "element";
        return {
          selector: `[class/id*="${id.split(" ")[0].slice(0, 30)}"]`,
          snippet: ($.html(el) ?? "").slice(0, 250),
          message: "동적으로 업데이트되는 카운터로 보이나 aria-live 또는 role=\"status\"가 없습니다.",
        };
      });
  },
};
