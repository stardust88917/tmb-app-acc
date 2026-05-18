import type { CheerioAPI } from "cheerio";
import type { Violation, Rule } from "./rule-types";

/**
 * 5.1-03 장식 이미지 처리
 * - role="presentation" | role="none" 이면서 비어있지 않은 alt 또는 aria-label → 모순
 * - alt="" 이면서 aria-label 설정 → 스크린리더에 불필요한 텍스트 제공
 */
export const rule: Rule = {
  id: "ks-decorative-img",
  ksCode: "5.1-03",
  confidence: "medium",
  requiresCss: false,

  check($: CheerioAPI): Violation[] {
    const violations: Violation[] = [];

    // Case 1: role="presentation"|"none" 이지만 의미 있는 alt 또는 aria-label 존재
    $('img[role="presentation"], img[role="none"]').each((_, el) => {
      const alt = $(el).attr("alt") ?? "";
      const ariaLabel = $(el).attr("aria-label") ?? "";
      if (alt.trim() !== "" || ariaLabel.trim() !== "") {
        violations.push({
          selector: `img[role="${$(el).attr("role")}"]`,
          snippet: ($.html(el) ?? "").slice(0, 200),
          message: `장식 이미지(role="${$(el).attr("role")}")에 대체 텍스트가 있습니다. alt="" 설정 및 aria-label 제거가 필요합니다.`,
        });
      }
    });

    // Case 2: alt="" (장식 처리)인데 aria-label도 설정됨 — 스크린리더가 여전히 읽음
    $('img[alt=""]').each((_, el) => {
      const ariaLabel = $(el).attr("aria-label") ?? "";
      if (ariaLabel.trim() !== "") {
        violations.push({
          selector: 'img[alt=""][aria-label]',
          snippet: ($.html(el) ?? "").slice(0, 200),
          message: `장식 이미지(alt="")에 aria-label이 설정되어 있습니다. 스크린리더에 불필요한 정보가 제공됩니다.`,
        });
      }
    });

    return violations;
  },
};
