import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-meta-refresh",
  ksCode: "3.2.1",
  ksName: "사용자 요구에 따른 실행",
  principle: "이해의 용이성",
  guideline: "3.2 예측 가능성",
  priority: "medium",
  isBestPractice: false,
  description:
    "사용자가 의도하지 않은 기능(새 창, 초점 변화, 자동 페이지 전환 등)은 실행되지 않아야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    // <meta http-equiv="refresh">
    $('meta[http-equiv="refresh"], meta[http-equiv="Refresh"]').each(
      (_, el) => {
        const content = $(el).attr("content") ?? "";
        checkedCount++;

        // content 형식: "5" 또는 "5;url=..."
        const seconds = parseInt(content.split(";")[0].trim(), 10);

        if (isNaN(seconds)) {
          issues.push({
            selector: 'meta[http-equiv="refresh"]',
            html: $.html(el).slice(0, 200),
            message: "meta refresh content 파싱 불가. 자동 전환 의도가 있을 수 있습니다.",
            suggestion:
              "meta refresh를 제거하고 사용자가 직접 이동할 수 있는 링크나 버튼을 제공하세요.",
          });
        } else if (seconds === 0) {
          issues.push({
            selector: 'meta[http-equiv="refresh"]',
            html: $.html(el).slice(0, 200),
            message:
              `meta refresh content="${content}" — 즉시(0초) 페이지를 전환합니다.`,
            suggestion:
              "meta refresh 대신 서버 측 301/302 리다이렉트 또는 JavaScript location.replace()를 사용하세요.",
          });
        } else if (seconds > 0 && seconds < 72000) {
          issues.push({
            selector: 'meta[http-equiv="refresh"]',
            html: $.html(el).slice(0, 200),
            message: `meta refresh content="${content}" — ${seconds}초 후 페이지가 자동 전환됩니다. 사용자가 제어할 수 없습니다.`,
            suggestion:
              "자동 전환을 제거하거나, 사용자가 전환을 취소/연장할 수 있는 수단을 제공하세요.",
          });
        } else {
          passCount++; // 20시간 이상이면 사실상 영향 없음
        }
      }
    );

    // 링크/버튼에서 target="_blank" 경고 (사용자 의도와 무관한 새 창)
    $("a[target='_blank']").each((_, el) => {
      const $el = $(el);
      const hasWarning =
        ($el.attr("rel") ?? "").includes("noopener") ||
        ($el.attr("aria-label") ?? "").includes("새 창") ||
        ($el.attr("title") ?? "").includes("새 창") ||
        $el.text().includes("새 창");
      checkedCount++;
      if (!hasWarning) {
        issues.push({
          selector: "a[target='_blank']",
          html: $.html(el).slice(0, 200),
          message:
            'target="_blank" 링크에 새 창 열림 안내가 없습니다. 사용자가 예측하지 못한 새 창이 열립니다.',
          suggestion:
            'rel="noopener" 추가 및 링크 텍스트나 title에 "(새 창)" 또는 "(새 탭)" 안내를 추가하세요.',
        });
      } else {
        passCount++;
      }
    });

    if (checkedCount === 0) {
      return {
        verdict: "적합",
        issues: [],
        passCount: 1,
        checkedCount: 1,
        notes: "자동 전환(meta refresh) 없음.",
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
