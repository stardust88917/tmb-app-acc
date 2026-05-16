import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

export const rule: Rule = {
  id: "ks-table-no-caption",
  ksCode: "8.1-01",
  ksName: "운영체제 접근성 기능 준수",
  principle: "견고성",
  guideline: "8.1 OS 접근성",
  category: "8.1 OS 접근성",
  priority: "medium",
  isBestPractice: false,
  description: "데이터 표에 caption이 없으면 스크린리더 사용자가 표의 주제를 파악하기 어렵습니다.",
  check($: CheerioAPI): CheckResult {
    // layout tables (no th, no headers) are excluded
    const tables = $("table").toArray().filter((el) => {
      return $(el).find("th, [role=\"columnheader\"], [role=\"rowheader\"]").length > 0;
    });

    const issues = tables
      .filter((el) => {
        const hasCaption = $(el).find("> caption").length > 0;
        const ariaLabel = $(el).attr("aria-label") ?? "";
        const ariaLabelledby = $(el).attr("aria-labelledby") ?? "";
        const summary = $(el).attr("summary") ?? "";
        return !hasCaption && ariaLabel.trim() === "" && ariaLabelledby.trim() === "" && summary.trim() === "";
      })
      .map((el) => ({
        selector: "table",
        html: $.html(el)?.slice(0, 250) ?? "",
        message: "데이터 표에 caption, aria-label, 또는 aria-labelledby가 없습니다.",
        suggestion: "<caption>표 제목</caption>을 추가하거나, aria-label 속성으로 표의 내용을 설명하세요.",
      }));

    const checkedCount = tables.length;
    const passCount = checkedCount - issues.length;

    if (checkedCount === 0) {
      return { verdict: "해당없음", issues: [], passCount: 0, checkedCount: 0 };
    }
    return {
      verdict: issues.length > 0 ? "부적합" : "적합",
      issues,
      passCount,
      checkedCount,
    };
  },
};
