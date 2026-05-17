import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-skip-nav",
  ksCode: "6.4-01",
  confidence: "medium",
  check($: CheerioAPI): Violation[] {
    // 반복 내비게이션이 있는지 확인
    const hasNav = $("nav, [role='navigation']").length > 0;
    if (!hasNav) return [];   // nav 자체가 없으면 해당 없음

    // 페이지 최상단(처음 5개 링크)에 #main, #content 등 건너뛰기 링크가 있는가
    const firstLinks = $("a[href]").toArray().slice(0, 5);
    const hasSkip = firstLinks.some((el) => {
      const href = $(el).attr("href") ?? "";
      return /^#(main|content|cont|skip|본문|maincontent)/i.test(href);
    });

    if (hasSkip) return [];
    return [
      {
        selector: "body > :first-child",
        snippet: "<a href=\"#main\">본문 바로가기</a> 가 없습니다",
        message: "페이지에 nav/내비게이션이 있지만 반복 영역 건너뛰기 링크가 없습니다. 페이지 최상단에 <a href=\"#main\">본문 바로가기</a>를 추가하세요.",
      },
    ];
  },
};
