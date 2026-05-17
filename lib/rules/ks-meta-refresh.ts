import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

export const rule: Rule = {
  id: "ks-meta-refresh",
  ksCode: "7.3-01",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    return $("meta[http-equiv='refresh'], meta[http-equiv='Refresh']")
      .toArray()
      .map((el) => {
        const content = $(el).attr("content") ?? "";
        const seconds = parseInt(content, 10);
        const isRedirect = content.toLowerCase().includes("url=");
        return {
          selector: "meta[http-equiv='refresh']",
          snippet: `<meta http-equiv="refresh" content="${content}">`,
          message: isRedirect
            ? `meta refresh 자동 이동 (${seconds}초) — 사용자 동의 없는 페이지 전환은 금지입니다.`
            : seconds === 0
            ? "meta refresh 즉시 새로고침 — 사용자를 혼란스럽게 할 수 있습니다."
            : `meta refresh ${seconds}초 후 새로고침 — 사용자에게 제어권을 주세요.`,
        };
      });
  },
};
