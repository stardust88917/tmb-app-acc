import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

function hasVisibleText($el: ReturnType<CheerioAPI>): boolean {
  return $el.text().trim().length > 0;
}

function hasBlindChild($el: ReturnType<CheerioAPI>, $: CheerioAPI): boolean {
  return $el.find(".blind, .sr-only, [class*=\"visually-hidden\"], [class*=\"screen-reader\"]").length > 0
    || $el.find("span[aria-hidden=\"false\"]").length > 0;
}

function hasImageWithAlt($el: ReturnType<CheerioAPI>): boolean {
  return $el.find("img[alt]").toArray().some((img) => {
    const alt = (img as { attribs?: Record<string, string> }).attribs?.alt ?? "";
    return alt.trim().length > 0;
  });
}

export const rule: Rule = {
  id: "ks-empty-button-label",
  ksCode: "5.1-01",
  ksName: "이미지 대체 텍스트 제공",
  principle: "인식의 용이성",
  guideline: "5.1 대체 텍스트",
  category: "5.1 대체 텍스트",
  priority: "high",
  isBestPractice: false,
  description: "버튼에 텍스트, aria-label, title, 또는 시각적으로 숨겨진 텍스트가 없으면 스크린리더 사용자가 버튼 기능을 알 수 없습니다.",
  check($: CheerioAPI): CheckResult {
    const buttons = $("button, [role=\"button\"], input[type=\"button\"], input[type=\"submit\"], input[type=\"reset\"]");
    const issues = buttons
      .toArray()
      .filter((el) => {
        const $el = $(el);
        const tag = (el as { tagName?: string }).tagName ?? "";
        if (tag.toLowerCase().startsWith("input")) {
          const val = $el.attr("value") ?? "";
          const ariaLabel = $el.attr("aria-label") ?? "";
          const title = $el.attr("title") ?? "";
          return val.trim() === "" && ariaLabel.trim() === "" && title.trim() === "";
        }
        const ariaLabel = $el.attr("aria-label") ?? "";
        const title = $el.attr("title") ?? "";
        if (ariaLabel.trim() !== "" || title.trim() !== "") return false;
        return !hasVisibleText($el) && !hasBlindChild($el, $) && !hasImageWithAlt($el);
      })
      .map((el) => {
        const tag = (el as { tagName?: string }).tagName ?? "button";
        return {
          selector: tag,
          html: $.html(el)?.slice(0, 250) ?? "",
          message: "버튼에 접근 가능한 이름(텍스트, aria-label, title)이 없습니다.",
          suggestion: "버튼 내부에 텍스트를 추가하거나, aria-label 또는 title 속성으로 기능을 설명하세요.",
        };
      });

    const checkedCount = buttons.length;
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
