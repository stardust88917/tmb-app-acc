import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-empty-aria-label",
  ksCode: "5.1-01",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    return $("[aria-label]")
      .toArray()
      .filter((el) => ($(el).attr("aria-label") ?? "").trim() === "")
      .map((el) => {
        const tag = (el as { tagName?: string }).tagName ?? "element";
        return {
          selector: `${tag}[aria-label=""]`,
          snippet: ($.html(el) ?? "").slice(0, 250),
          message: "aria-label 값이 비어 있습니다. 요소의 역할과 내용을 설명하는 텍스트를 입력하세요.",
        };
      });
  },
};
