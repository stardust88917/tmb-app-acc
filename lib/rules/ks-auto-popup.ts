import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

const POPUP_RE = /(?:window\.open|alert\s*\(|confirm\s*\(|showModal\s*\(|\.modal\s*\(\s*['"]show)/;
const LOAD_RE = /(?:window\.onload|DOMContentLoaded|addEventListener\s*\(\s*['"](?:load|DOMContentLoaded))/;

export const rule: Rule = {
  id: "ks-auto-popup",
  ksCode: "7.5-01",
  confidence: "medium",
  check($: CheerioAPI): Violation[] {
    const violations: Violation[] = [];

    $("script:not([src])").each((_, el) => {
      const code = $(el).html() ?? "";
      if (LOAD_RE.test(code) && POPUP_RE.test(code)) {
        violations.push({
          selector: "script",
          snippet: code.slice(0, 250),
          message: "페이지 로드 이벤트에서 팝업/모달을 자동 실행하는 스크립트가 있습니다. 사용자 동작 후에만 열리도록 수정하세요.",
        });
      }
    });

    const bodyOnload = $("body").attr("onload") ?? "";
    if (POPUP_RE.test(bodyOnload)) {
      violations.push({
        selector: "body[onload]",
        snippet: `<body onload="${bodyOnload.slice(0, 150)}">`,
        message: "body onload 속성에서 팝업을 자동 실행합니다. 사용자 동작 기반으로 변경하세요.",
      });
    }

    return violations;
  },
};
