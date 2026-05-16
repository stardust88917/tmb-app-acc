import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-page-heading",
  ksCode: "2.4.2",
  ksName: "제목 제공",
  principle: "운용의 용이성",
  guideline: "2.4 쉬운 내비게이션",
  priority: "medium",
  isBestPractice: false,
  description:
    "페이지, 프레임, 콘텐츠 블록에는 적절한 제목을 제공해야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    // 1. <title> 요소
    const titleText = $("title").first().text().trim();
    checkedCount++;
    if (!titleText) {
      issues.push({
        selector: "title",
        html: "<title></title>",
        message: "페이지 <title>이 비어 있거나 없습니다.",
        suggestion:
          "페이지 내용을 설명하는 고유한 제목을 <title>에 제공하세요 (예: <title>상품 목록 | T멤버십</title>).",
      });
    } else {
      passCount++;
    }

    // 2. h1 존재 여부
    const h1Count = $("h1").length;
    checkedCount++;
    if (h1Count === 0) {
      issues.push({
        selector: "h1",
        html: "",
        message: "페이지에 <h1> 요소가 없습니다.",
        suggestion:
          "페이지의 주제목을 나타내는 <h1> 요소를 추가하세요. 보통 페이지당 1개를 사용합니다.",
      });
    } else {
      passCount++;
    }

    // 3. 제목 계층 건너뜀 검사 (h1→h3 등)
    const headingSelectors = ["h1", "h2", "h3", "h4", "h5", "h6"];
    const headings: number[] = [];
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      headings.push(parseInt(el.name.replace("h", ""), 10));
    });

    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1];
      const curr = headings[i];
      if (curr > prev + 1) {
        checkedCount++;
        issues.push({
          selector: `h${curr}`,
          html: `<h${curr}>...</h${curr}>`,
          message: `제목 레벨이 h${prev}에서 h${curr}로 건너뜁니다. 중간 단계가 누락됐습니다.`,
          suggestion: `h${prev + 1}부터 순서대로 사용하세요. 시각적 크기를 조절하려면 CSS를 사용하세요.`,
        });
      } else {
        passCount++;
        checkedCount++;
      }
    }

    // 4. <iframe> title 속성
    $("iframe").each((_, el) => {
      const $el = $(el);
      const title = $el.attr("title");
      const ariaHidden = $el.attr("aria-hidden");
      if (ariaHidden === "true") return;
      checkedCount++;
      if (!title || title.trim() === "") {
        issues.push({
          selector: "iframe",
          html: $.html(el).slice(0, 200),
          message: "<iframe> 요소에 title 속성이 없습니다.",
          suggestion:
            '프레임 목적을 설명하는 title 속성을 추가하세요 (예: title="광고 배너" 또는 aria-hidden="true" 처리).',
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
