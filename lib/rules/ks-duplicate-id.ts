import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-duplicate-id",
  ksCode: "4.1.1",
  ksName: "마크업 오류 방지",
  principle: "견고성",
  guideline: "4.1 문법 준수",
  priority: "medium",
  isBestPractice: false,
  description:
    "마크업 언어의 요소는 열고 닫음, 중첩 관계, 속성 선언에 오류가 없어야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    const idCount = new Map<string, number>();
    const idEl = new Map<string, string>();

    $("[id]").each((_, el) => {
      const id = $(el).attr("id") ?? "";
      if (!id) return;
      idCount.set(id, (idCount.get(id) ?? 0) + 1);
      if (!idEl.has(id)) {
        idEl.set(id, $.html(el).slice(0, 200));
      }
    });

    let passCount = 0;
    let checkedCount = 0;

    for (const [id, count] of idCount.entries()) {
      checkedCount++;
      if (count > 1) {
        issues.push({
          selector: `#${id}`,
          html: idEl.get(id) ?? "",
          message: `id="${id}"가 페이지에 ${count}번 중복됩니다.`,
          suggestion: `각 요소에 고유한 id 값을 사용하세요. aria-labelledby, aria-describedby 등이 이 id를 참조한다면 오동작이 발생합니다.`,
        });
      } else {
        passCount++;
      }
    }

    if (checkedCount === 0) {
      return {
        verdict: "적합",
        issues: [],
        passCount: 1,
        checkedCount: 1,
        notes: "페이지에 id 속성이 없습니다.",
      };
    }

    return {
      verdict: issues.length > 0 ? "부적합" : "적합",
      issues,
      passCount,
      checkedCount,
    };
  },
};
