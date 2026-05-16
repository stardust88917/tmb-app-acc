import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-media-caption",
  ksCode: "1.2.1",
  ksName: "자막 제공",
  principle: "인식의 용이성",
  guideline: "1.2 멀티미디어 대체 수단",
  priority: "high",
  isBestPractice: false,
  description:
    "멀티미디어 콘텐츠에는 자막, 대본 또는 수어를 제공해야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    $("video, audio").each((_, el) => {
      const tag = el.name.toLowerCase();
      const ariaHidden = $(el).attr("aria-hidden");
      if (ariaHidden === "true") return;

      checkedCount++;

      const hasCaptions = $(el).find(
        'track[kind="captions"], track[kind="subtitles"]'
      ).length > 0;

      if (hasCaptions) {
        passCount++;
      } else {
        issues.push({
          selector: tag,
          html: $.html(el).slice(0, 300),
          message: `<${tag}> 요소에 자막(track[kind="captions"] 또는 track[kind="subtitles"])이 없습니다.`,
          suggestion:
            '<track kind="captions" src="captions.vtt" srclang="ko" label="한국어"> 요소를 추가하거나 텍스트 대본을 인근에 제공하세요.',
        });
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
