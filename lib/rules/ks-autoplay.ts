import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-autoplay",
  ksCode: "5.3-04",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    return $("video[autoplay], audio[autoplay]")
      .toArray()
      .map((el) => {
        const tag = (el as { tagName?: string }).tagName ?? "media";
        const hasMuted = $(el).attr("muted") !== undefined;
        return {
          selector: `${tag}[autoplay]`,
          snippet: ($.html(el) ?? "").slice(0, 250),
          message: hasMuted
            ? `${tag}[autoplay muted]: 음소거 자동재생은 허용되나 사용자 정지 수단을 반드시 제공하세요.`
            : `${tag}[autoplay]: 소리 있는 자동 재생은 금지입니다. autoplay 속성을 제거하거나 muted와 함께 사용하세요.`,
        };
      });
  },
};
