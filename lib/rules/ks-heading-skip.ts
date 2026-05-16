import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

export const rule: Rule = {
  id: "ks-heading-skip",
  ksCode: "8.1-01",
  ksName: "운영체제 접근성 기능 준수",
  principle: "견고성",
  guideline: "8.1 OS 접근성",
  category: "8.1 OS 접근성",
  priority: "medium",
  isBestPractice: false,
  description: "제목 레벨을 건너뛰면(h1→h3 등) 스크린리더 사용자가 문서 구조를 탐색하기 어렵습니다.",
  check($: CheerioAPI): CheckResult {
    const headings = $("h1, h2, h3, h4, h5, h6").toArray();
    const issues: { selector: string; html: string; message: string; suggestion: string }[] = [];

    let prevLevel = 0;
    for (const el of headings) {
      const tag = (el as { tagName?: string }).tagName ?? "h1";
      const level = parseInt(tag.replace("h", ""), 10);
      if (prevLevel > 0 && level > prevLevel + 1) {
        issues.push({
          selector: tag,
          html: $.html(el)?.slice(0, 250) ?? "",
          message: `h${prevLevel} 다음에 h${level}이 사용되었습니다 (레벨 ${level - prevLevel - 1}단계 건너뜀).`,
          suggestion: `h${prevLevel + 1}을 사용하거나, 중간 레벨의 제목을 추가해 계층 구조를 연속되게 만드세요.`,
        });
      }
      prevLevel = level;
    }

    const checkedCount = headings.length;
    const passCount = checkedCount > 0 ? checkedCount - issues.length : 0;

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
