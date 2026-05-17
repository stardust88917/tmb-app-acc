import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-dl-order",
  ksCode: "8.1-01",
  confidence: "medium",
  check($: CheerioAPI): Violation[] {
    return $("dl")
      .toArray()
      .filter((el) => {
        const first = $(el).children().first();
        const tag = first.prop("tagName");
        return tag !== undefined && tag.toLowerCase() !== "dt";
      })
      .map((el) => ({
        selector: "dl",
        snippet: ($.html(el) ?? "").slice(0, 250),
        message: "dl 요소의 첫 자식이 dt가 아닙니다. dl은 반드시 dt → dd 순서로 구성해야 합니다.",
      }));
  },
};
