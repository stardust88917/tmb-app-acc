import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-img-alt",
  ksCode: "1.1.1",
  ksName: "적절한 대체 텍스트 제공",
  principle: "인식의 용이성",
  guideline: "1.1 대체 텍스트",
  priority: "high",
  isBestPractice: false,
  description: "이미지 등 비텍스트 콘텐츠에 대체 텍스트를 제공해야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    // --- <img> elements ---
    $("img").each((_, el) => {
      const $el = $(el);
      const role = $el.attr("role");
      const ariaHidden = $el.attr("aria-hidden");
      const alt = $el.attr("alt");
      const src = ($el.attr("src") ?? "").slice(0, 60);

      if (ariaHidden === "true" || role === "presentation" || role === "none") {
        passCount++;
        checkedCount++;
        return;
      }

      checkedCount++;

      if (alt === undefined) {
        issues.push({
          selector: `img[src^="${src}"]`,
          html: $.html(el).slice(0, 300),
          message: "img 요소에 alt 속성이 없습니다.",
          suggestion:
            "이미지 내용이나 기능을 설명하는 alt 속성을 추가하세요. 장식용 이미지라면 alt=\"\"와 role=\"presentation\"을 추가하세요.",
        });
      } else if (alt.trim() === "") {
        // Empty alt — check if image is the sole content of a link
        const $parentLink = $el.closest("a[href]");
        if ($parentLink.length > 0) {
          const linkText = $parentLink
            .clone()
            .find("img")
            .remove()
            .end()
            .text()
            .trim();
          const ariaLabel = $parentLink.attr("aria-label");
          const ariaLabelledby = $parentLink.attr("aria-labelledby");
          if (!linkText && !ariaLabel && !ariaLabelledby) {
            issues.push({
              selector: "a > img[alt='']",
              html: $.html($parentLink.get(0)!).slice(0, 300),
              message:
                "링크 안의 이미지에 빈 alt가 있고, 링크에 다른 텍스트도 없습니다. 링크 목적을 알 수 없습니다.",
              suggestion:
                "이미지의 alt에 링크 목적(이동할 페이지/기능)을 설명하거나 링크에 aria-label을 추가하세요.",
            });
          } else {
            passCount++;
          }
        } else {
          passCount++; // Decorative image — empty alt is acceptable
        }
      } else {
        passCount++;
      }
    });

    // --- <input type="image"> ---
    $('input[type="image"]').each((_, el) => {
      const $el = $(el);
      const alt = $el.attr("alt");
      checkedCount++;
      if (!alt || alt.trim() === "") {
        issues.push({
          selector: 'input[type="image"]',
          html: $.html(el).slice(0, 300),
          message: "이미지 버튼(input[type=image])에 alt 속성이 없습니다.",
          suggestion:
            "버튼의 기능을 설명하는 alt 속성을 추가하세요 (예: alt=\"검색\").",
        });
      } else {
        passCount++;
      }
    });

    // --- <area> in image maps ---
    $("area").each((_, el) => {
      const $el = $(el);
      const alt = $el.attr("alt");
      const href = $el.attr("href");
      if (!href) return; // non-link area
      checkedCount++;
      if (alt === undefined || alt.trim() === "") {
        issues.push({
          selector: "area[href]",
          html: $.html(el).slice(0, 300),
          message: "이미지맵 area 요소에 alt 속성이 없습니다.",
          suggestion: "area 링크의 목적을 설명하는 alt 속성을 추가하세요.",
        });
      } else {
        passCount++;
      }
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
