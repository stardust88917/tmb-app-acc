import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

// Detects CSS rules that hide the focus outline
const OUTLINE_NONE_RE = /([^{}]*)\{[^}]*outline\s*:\s*(?:0|none)[^}]*\}/gi;

export const rule: Rule = {
  id: "ks-focus-visible",
  ksCode: "6.1-02",
  confidence: "high",
  requiresCss: true,
  check(_$: CheerioAPI, _html: string, css?: string): Violation[] {
    if (!css) return [];
    const violations: Violation[] = [];
    let match: RegExpExecArray | null;
    while ((match = OUTLINE_NONE_RE.exec(css)) !== null) {
      const selector = match[1].trim();
      if (selector.includes(":focus") || selector.includes(":focus-visible")) {
        violations.push({
          selector: selector.slice(0, 100),
          snippet: match[0].slice(0, 200),
          message: `${selector} — outline: none 으로 포커스 표시를 숨깁니다. 대체 포커스 스타일(:focus-visible)을 제공하세요.`,
        });
      }
    }
    return violations.slice(0, 10);
  },
};
