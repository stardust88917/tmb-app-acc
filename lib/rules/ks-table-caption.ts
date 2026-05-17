import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-table-caption",
  ksCode: "7.4-02",
  confidence: "medium",
  check($: CheerioAPI): Violation[] {
    return $("table")
      .toArray()
      .filter((el) => {
        // 레이아웃 테이블 제외 (th가 없고 role=presentation)
        if ($(el).attr("role") === "presentation") return false;
        if ($(el).find("th").length === 0) return false;
        const hasCaption = $(el).find("> caption").length > 0;
        const ariaLabel = ($(el).attr("aria-label") ?? "").trim();
        const ariaLabelledby = ($(el).attr("aria-labelledby") ?? "").trim();
        return !hasCaption && !ariaLabel && !ariaLabelledby;
      })
      .slice(0, 5)
      .map((el) => ({
        selector: "table",
        snippet: ($.html(el) ?? "").slice(0, 250),
        message: "데이터 표에 caption 또는 aria-label이 없습니다. <caption>표 제목</caption>을 추가하세요.",
      }));
  },
};
