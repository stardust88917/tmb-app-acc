import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

export const rule: Rule = {
  id: "ks-img-alt-missing",
  ksCode: "5.1-01",
  ksName: "이미지 대체 텍스트 제공",
  principle: "인식의 용이성",
  guideline: "5.1 대체 텍스트",
  category: "5.1 대체 텍스트",
  priority: "high",
  isBestPractice: false,
  description: "img 요소에 alt 속성이 없으면 스크린리더가 파일명을 읽어 이미지를 식별할 수 없습니다.",
  check($: CheerioAPI): CheckResult {
    const imgs = $("img");
    const issues = imgs
      .toArray()
      .filter((el) => $(el).attr("alt") === undefined)
      .map((el) => ({
        selector: "img",
        html: $.html(el)?.slice(0, 250) ?? "",
        message: "img 요소에 alt 속성이 없습니다.",
        suggestion: "alt=\"\" (장식용) 또는 alt=\"의미있는 설명\" 을 추가하세요.",
      }));

    const checkedCount = imgs.length;
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
