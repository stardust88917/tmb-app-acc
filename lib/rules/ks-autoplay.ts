import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-autoplay",
  ksCode: "1.3.4",
  ksName: "자동 재생 금지",
  principle: "인식의 용이성",
  guideline: "1.3 명료성",
  priority: "medium",
  isBestPractice: false,
  description: "자동으로 소리가 재생되지 않아야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    // video/audio with autoplay
    $("video[autoplay], audio[autoplay]").each((_, el) => {
      const $el = $(el);
      const tag = el.name.toLowerCase();
      const isMuted = $el.attr("muted") !== undefined;
      const hasControls = $el.attr("controls") !== undefined;

      checkedCount++;

      if (tag === "audio" || (tag === "video" && !isMuted)) {
        issues.push({
          selector: `${tag}[autoplay]`,
          html: $.html(el).slice(0, 300),
          message: `<${tag}> 요소에 autoplay 속성이 있습니다${tag === "audio" ? " — 소리가 자동 재생됩니다" : " (소리 포함 가능성)"}. 사용자가 제어할 수 없습니다.`,
          suggestion: `autoplay 속성을 제거하거나, controls 속성을 추가하여 사용자가 재생을 제어할 수 있도록 하세요.${tag === "video" ? " 배경 영상이라면 muted 속성을 추가하세요." : ""}`,
        });
      } else {
        // video with autoplay + muted is acceptable (no sound)
        if (!hasControls) {
          passCount++;
        } else {
          passCount++;
        }
      }
    });

    // Check for <object> or <embed> with autoplay parameter
    $("object, embed").each((_, el) => {
      const $el = $(el);
      const dataAttr = ($el.attr("data") ?? "").toLowerCase();
      const autoplayParam = $el.find('param[name="autoplay"][value="true"], param[name="autoStart"][value="true"]');
      if (autoplayParam.length > 0) {
        checkedCount++;
        issues.push({
          selector: el.name,
          html: $.html(el).slice(0, 300),
          message: `<${el.name}> 요소에 autoplay/autoStart 파라미터가 있습니다.`,
          suggestion: "autoplay/autoStart 파라미터를 제거하거나 false로 설정하세요.",
        });
      }
    });

    if (checkedCount === 0) {
      return {
        verdict: "해당없음",
        issues: [],
        passCount: 0,
        checkedCount: 0,
        notes: "페이지에 자동 재생 가능한 미디어 요소가 없습니다.",
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
