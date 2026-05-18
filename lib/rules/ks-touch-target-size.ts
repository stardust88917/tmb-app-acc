import type { CheerioAPI } from "cheerio";
import type { Violation, Rule } from "./rule-types";

/**
 * 6.5-01 터치 영역 9mm 이상 (반자동, CSS 필요)
 * CSS에서 button·a·input 관련 selector에 고정 px 단위의
 * width/height/min-width/min-height 가 34px 미만인 경우 위반으로 표시.
 * vw / % / calc 는 런타임 계산이 필요하므로 검사하지 않음.
 * confidence: low (CSS만으로 실제 렌더 크기를 완전히 확정할 수 없음).
 */
export const rule: Rule = {
  id: "ks-touch-target-size",
  ksCode: "6.5-01",
  confidence: "low",
  requiresCss: true,

  check(_$: CheerioAPI, _htmlText: string, css?: string): Violation[] {
    if (!css) return [];

    const violations: Violation[] = [];
    const MIN_PX = 34; // 9mm @96dpi

    // 대상 selector를 포함하는 CSS 블록 추출
    // button, a, input, [role="button"] 등의 간단한 블록
    const blockPattern =
      /(?:button|a\b|input|select|textarea|\[role=["']button["']\])[^{]*\{([^}]+)\}/gi;

    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = blockPattern.exec(css)) !== null) {
      const selector = blockMatch[0].split("{")[0].trim();
      const body = blockMatch[1];

      // width / height / min-width / min-height 에서 순수 px 값 추출
      const sizePattern = /(?:min-)?(width|height)\s*:\s*(\d+(?:\.\d+)?)px/gi;
      let sizeMatch: RegExpExecArray | null;
      while ((sizeMatch = sizePattern.exec(body)) !== null) {
        const px = parseFloat(sizeMatch[2]);
        if (px > 0 && px < MIN_PX) {
          violations.push({
            selector,
            snippet: `${sizeMatch[1]}: ${sizeMatch[2]}px`,
            message: `터치 영역 ${px}px — 최소 ${MIN_PX}px(9mm) 이상 권장. Accessibility Insights로 실기기 검증 필요.`,
          });
          break; // 한 블록에서 중복 보고 방지
        }
      }
    }

    return violations;
  },
};
