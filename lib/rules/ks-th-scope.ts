import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-th-scope",
  ksCode: "7.4-02",
  confidence: "medium",
  check($: CheerioAPI): Violation[] {
    return $("th")
      .toArray()
      .filter((el) => {
        const scope = $(el).attr("scope");
        return scope === undefined || scope.trim() === "";
      })
      .slice(0, 10)
      .map((el) => ({
        selector: "th",
        snippet: ($.html(el) ?? "").slice(0, 250),
        message: "th 요소에 scope 속성이 없습니다. 행 헤더는 scope=\"row\", 열 헤더는 scope=\"col\"을 추가하세요.",
      }));
  },
};
