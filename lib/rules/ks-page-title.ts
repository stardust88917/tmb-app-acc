import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-page-title",
  ksCode: "6.4-04",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    const title = $("head title").text().trim();
    if (!title) {
      return [{
        selector: "head",
        snippet: "<title>(없음 또는 비어 있음)</title>",
        message: "페이지에 <title> 요소가 없거나 비어 있습니다. 페이지 목적을 설명하는 고유한 제목을 추가하세요.",
      }];
    }
    if (title.length < 2) {
      return [{
        selector: "title",
        snippet: `<title>${title}</title>`,
        message: `<title>${title}</title> — 제목이 너무 짧습니다. 페이지 내용을 구체적으로 설명하세요.`,
      }];
    }
    return [];
  },
};
