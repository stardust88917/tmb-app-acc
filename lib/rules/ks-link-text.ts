import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

// 의미 없는 링크 텍스트 패턴 (한국어 + 영어)
const VAGUE_TEXTS = new Set([
  "여기",
  "클릭",
  "클릭하세요",
  "여기를 클릭",
  "여기를 클릭하세요",
  "바로가기",
  "링크",
  "더보기",
  "more",
  "click here",
  "click",
  "here",
  "read more",
  "learn more",
  "자세히",
  "자세히 보기",
  "go",
  "link",
  "이동",
  "보기",
  ">>",
  "›",
  "→",
  "...",
]);

export const rule: Rule = {
  id: "ks-link-text",
  ksCode: "2.4.3",
  ksName: "적절한 링크 텍스트",
  principle: "운용의 용이성",
  guideline: "2.4 쉬운 내비게이션",
  priority: "high",
  isBestPractice: false,
  description:
    "링크 텍스트는 용도나 목적을 이해할 수 있도록 제공해야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    $("a[href]").each((_, el) => {
      const $el = $(el);
      const ariaHidden = $el.attr("aria-hidden");
      if (ariaHidden === "true") return;

      checkedCount++;

      // 접근 가능한 이름 계산
      const ariaLabel = ($el.attr("aria-label") ?? "").trim();
      const ariaLabelledby = $el.attr("aria-labelledby");
      const title = ($el.attr("title") ?? "").trim();

      // aria-labelledby → 참조 요소 텍스트
      let labelledByText = "";
      if (ariaLabelledby) {
        labelledByText = ariaLabelledby
          .split(/\s+/)
          .map((id) => $(`#${CSS.escape(id)}`).text().trim())
          .join(" ")
          .trim();
      }

      // 링크 내 텍스트 (img alt 포함)
      const $clone = $el.clone();
      $clone.find("img").each((_, img) => {
        const alt = $(img).attr("alt");
        if (alt) $(img).replaceWith(alt);
        else $(img).remove();
      });
      const innerText = $clone.text().trim();

      const accessibleName = ariaLabel || labelledByText || innerText || title;

      if (!accessibleName) {
        issues.push({
          selector: "a[href]",
          html: $.html(el).slice(0, 300),
          message:
            "링크에 접근 가능한 이름이 없습니다 (텍스트, aria-label, title 모두 없음).",
          suggestion:
            "링크 안에 텍스트를 추가하거나, aria-label 또는 title 속성으로 링크 목적을 설명하세요.",
        });
        return;
      }

      const lowerName = accessibleName.toLowerCase().replace(/\s+/g, " ").trim();
      if (VAGUE_TEXTS.has(lowerName)) {
        issues.push({
          selector: "a[href]",
          html: $.html(el).slice(0, 300),
          message: `링크 텍스트 "${accessibleName}"는 목적을 알 수 없는 모호한 표현입니다.`,
          suggestion:
            '링크가 이동하는 목적지나 기능을 명시하세요 (예: "여기" → "T멤버십 쿠폰 목록 보기"). 시각적으로 짧게 유지하려면 aria-label로 보충 설명을 제공하세요.',
        });
        return;
      }

      passCount++;
    });

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
