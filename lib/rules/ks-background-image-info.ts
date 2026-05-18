import type { CheerioAPI } from "cheerio";
import type { Violation, Rule } from "./rule-types";

/**
 * 5.1-04 배경 이미지 정보 제공 (반자동, CSS 필요)
 * CSS에 background-image: url(...) 가 존재하면 "수동 확인 필요" 신호를 반환.
 * 의미 있는 배경 이미지인지 자동으로 판단할 수 없으므로 confidence: low.
 */
export const rule: Rule = {
  id: "ks-background-image-info",
  ksCode: "5.1-04",
  confidence: "low",
  requiresCss: true,

  check(_$: CheerioAPI, _htmlText: string, css?: string): Violation[] {
    if (!css) return [];

    const bgMatches = [
      ...css.matchAll(/background(?:-image)?\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/gi),
    ];
    if (bgMatches.length === 0) return [];

    return [
      {
        selector: "CSS",
        snippet: `${bgMatches.length}개의 background-image URL 발견`,
        message: `CSS background-image가 ${bgMatches.length}건 사용 중입니다. 의미 있는 배경 이미지에 숨김 텍스트(.blind, .sr-only) 또는 aria-label 제공 여부를 수동 확인하세요.`,
      },
    ];
  },
};
