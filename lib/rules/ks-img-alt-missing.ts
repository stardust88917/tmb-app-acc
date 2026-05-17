import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-img-alt-missing",
  ksCode: "5.1-01",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    return $("img")
      .toArray()
      .filter((el) => $(el).attr("alt") === undefined)
      .map((el) => ({
        selector: "img",
        snippet: ($.html(el) ?? "").slice(0, 250),
        message: "img 요소에 alt 속성이 없습니다. alt=\"\" (장식용) 또는 의미 있는 설명을 추가하세요.",
      }));
  },
};
