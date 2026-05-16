import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

const POPUP_PATTERN = /(?:window\.open|alert\s*\(|confirm\s*\(|showModal\s*\(|\.modal\s*\(\s*['"]show)/;

export const rule: Rule = {
  id: "ks-auto-popup-on-load",
  ksCode: "7.5-01",
  ksName: "자동 재생 금지",
  principle: "운용의 용이성",
  guideline: "7.5 자동 재생",
  category: "7.5 자동 재생",
  priority: "medium",
  isBestPractice: false,
  description: "페이지 로드 시 자동으로 팝업·모달을 여는 스크립트는 사용자 제어권을 침해합니다.",
  check($: CheerioAPI, htmlText?: string): CheckResult {
    const raw = htmlText ?? "";
    const issues: { selector: string; html: string; message: string; suggestion: string }[] = [];

    // Inline script tags with window.open / alert / modal on load
    $("script:not([src])").each((_, el) => {
      const code = $(el).html() ?? "";
      const hasLoadEvent =
        /(?:window\.onload|DOMContentLoaded|document\.ready|\$\s*\(document\)|addEventListener\s*\(\s*['"]load['"]|addEventListener\s*\(\s*['"]DOMContentLoaded['"])/.test(code);
      if (hasLoadEvent && POPUP_PATTERN.test(code)) {
        issues.push({
          selector: "script",
          html: code.slice(0, 250),
          message: "페이지 로드 이벤트에서 팝업/모달을 자동 실행하는 스크립트를 발견했습니다.",
          suggestion: "사용자 동작(클릭 등) 후에만 팝업을 열도록 수정하거나, 닫기 버튼과 단축키(ESC)를 제공하세요.",
        });
      }
    });

    // body onload attribute
    const bodyOnload = $("body").attr("onload") ?? "";
    if (POPUP_PATTERN.test(bodyOnload)) {
      issues.push({
        selector: "body[onload]",
        html: `<body onload="${bodyOnload.slice(0, 200)}">`,
        message: "body onload 속성에서 팝업을 자동 실행합니다.",
        suggestion: "onload 속성을 제거하고 사용자 동작 기반 이벤트로 변경하세요.",
      });
    }

    if (!raw && issues.length === 0) {
      return { verdict: "해당없음", issues: [], passCount: 0, checkedCount: 0,
        notes: "정적 분석으로는 동적 팝업 실행 여부를 완전히 파악할 수 없습니다." };
    }

    return {
      verdict: issues.length > 0 ? "검토필요" : "적합",
      issues,
      passCount: issues.length > 0 ? 0 : 1,
      checkedCount: 1,
      notes: "인라인 스크립트 패턴 기반 정적 분석입니다. 외부 스크립트는 검사되지 않습니다.",
    };
  },
};
