import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-heading-structure",
  ksCode: "6.4-02",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    const violations: Violation[] = [];
    const headings = $("h1,h2,h3,h4,h5,h6").toArray();

    // 제목 없음
    if (headings.length === 0) {
      violations.push({
        selector: "body",
        snippet: "(제목 요소 없음)",
        message: "페이지에 제목(h1~h6) 요소가 없습니다. 콘텐츠 계층을 표현하는 제목을 추가하세요.",
      });
      return violations;
    }

    // h1이 없으면 경고
    if ($("h1").length === 0) {
      violations.push({
        selector: "body",
        snippet: "(h1 없음)",
        message: "페이지에 h1이 없습니다. 페이지의 주 제목을 h1으로 표시하세요.",
      });
    }

    // 레벨 건너뜀 감지
    let prev = 0;
    for (const el of headings) {
      const tag = (el as { tagName?: string }).tagName ?? "h1";
      const level = parseInt(tag.replace(/h/i, ""), 10);
      if (prev > 0 && level > prev + 1) {
        violations.push({
          selector: tag,
          snippet: ($.html(el) ?? "").slice(0, 200),
          message: `h${prev} 다음 h${level} — ${level - prev - 1}단계 건너뜀. h${prev + 1}을 먼저 사용하세요.`,
        });
      }
      prev = level;
    }
    return violations;
  },
};
