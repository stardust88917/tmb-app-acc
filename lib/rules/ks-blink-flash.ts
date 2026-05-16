import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-blink-flash",
  ksCode: "2.3.1",
  ksName: "깜박임과 번쩍임 사용 제한",
  principle: "운용의 용이성",
  guideline: "2.3 광과민성 발작 예방",
  priority: "high",
  isBestPractice: false,
  description:
    "초당 3~50회 주기로 깜박이거나 번쩍이는 콘텐츠를 제공하지 않아야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    // <blink> 태그
    $("blink").each((_, el) => {
      checkedCount++;
      issues.push({
        selector: "blink",
        html: $.html(el).slice(0, 300),
        message: "<blink> 요소는 콘텐츠를 깜박이게 합니다. 폐기된 요소입니다.",
        suggestion: "<blink> 요소를 제거하고 CSS animation을 사용하지 마세요.",
      });
    });

    // <marquee> 태그
    $("marquee").each((_, el) => {
      checkedCount++;
      issues.push({
        selector: "marquee",
        html: $.html(el).slice(0, 300),
        message:
          "<marquee> 요소는 콘텐츠를 자동으로 이동시킵니다. 폐기된 요소입니다.",
        suggestion:
          "<marquee> 요소를 제거하고, 정지 기능이 있는 CSS animation으로 대체하세요 (KS 2.2.2 참고).",
      });
    });

    // CSS class names suggesting flashing/blinking (heuristic)
    const flashingClasses = [
      "blink",
      "flash",
      "flicker",
      "strobe",
      "twinkle",
      "flashing",
    ];
    $("[class]").each((_, el) => {
      const classes = ($(el).attr("class") ?? "").toLowerCase();
      const matched = flashingClasses.find((c) => classes.includes(c));
      if (matched) {
        checkedCount++;
        issues.push({
          selector: `[class*="${matched}"]`,
          html: $.html(el).slice(0, 200),
          message: `class="${$(el).attr("class")}" — 깜박임/번쩍임을 유발할 수 있는 CSS 클래스가 발견됐습니다.`,
          suggestion:
            "해당 애니메이션이 초당 3회 이상 깜박이지 않는지 확인하고, prefers-reduced-motion 미디어 쿼리를 적용하세요.",
        });
      }
    });

    if (checkedCount === 0) {
      return {
        verdict: "적합",
        issues: [],
        passCount: 1,
        checkedCount: 1,
        notes:
          "blink/marquee 요소 없음. CSS 애니메이션은 수동 검사가 필요합니다.",
      };
    }

    const failCount = issues.length;
    passCount = checkedCount - failCount;

    return {
      verdict: failCount > 0 ? "부적합" : "적합",
      issues,
      passCount,
      checkedCount,
    };
  },
};
