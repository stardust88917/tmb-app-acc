import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

export const rule: Rule = {
  id: "ks-li-on-no-context",
  ksCode: "5.1-02",
  ksName: "텍스트 대체 수단 제공",
  principle: "인식의 용이성",
  guideline: "5.1 대체 텍스트",
  category: "5.1 대체 텍스트",
  priority: "medium",
  isBestPractice: false,
  description: "li 요소에 시각적 콘텐츠만 있고(아이콘·이미지 등) 텍스트나 숨김 텍스트가 없으면 목록 항목 의미를 전달하지 못합니다.",
  check($: CheerioAPI): CheckResult {
    const items = $("li");
    const issues = items
      .toArray()
      .filter((el) => {
        const $el = $(el);
        if ($el.text().trim().length > 0) return false;
        const ariaLabel = $el.attr("aria-label") ?? "";
        if (ariaLabel.trim().length > 0) return false;
        const hasBlind =
          $el.find(".blind, .sr-only, [class*=\"visually-hidden\"], [class*=\"screen-reader\"]").length > 0;
        if (hasBlind) return false;
        const hasImgWithAlt = $el.find("img[alt]").toArray().some((img) => {
          const alt = (img as { attribs?: Record<string, string> }).attribs?.alt ?? "";
          return alt.trim().length > 0;
        });
        if (hasImgWithAlt) return false;
        const ariaLabelledby = $el.attr("aria-labelledby") ?? "";
        return ariaLabelledby.trim() === "";
      })
      .map((el) => ({
        selector: "li",
        html: $.html(el)?.slice(0, 250) ?? "",
        message: "li 항목에 텍스트나 접근 가능한 이름이 없습니다.",
        suggestion: "li 내부에 텍스트를 추가하거나, 아이콘/이미지에 alt 또는 aria-label을 제공하세요.",
      }));

    const checkedCount = items.length;
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
