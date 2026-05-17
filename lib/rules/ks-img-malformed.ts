import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

// Matches <img ...> NOT followed by /> (non-self-closed in raw source)
const MALFORMED_RE = /<img\b[^>]*(?<!\/)>/gi;

export const rule: Rule = {
  id: "ks-img-malformed",
  ksCode: "8.1-01",
  confidence: "low",
  check(_$: CheerioAPI, htmlText: string): Violation[] {
    const matches = [...htmlText.matchAll(MALFORMED_RE)].slice(0, 10);
    return matches.map((m) => ({
      selector: "img",
      snippet: m[0].slice(0, 250),
      message: "img 태그가 self-close(/>) 형식이 아닙니다. XHTML 호환이 필요한 경우 <img ... />를 사용하세요 (HTML5에서는 <img>도 유효).",
    }));
  },
};
