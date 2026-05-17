import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

const VALID_LANG_RE = /^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/;

export const rule: Rule = {
  id: "ks-html-lang",
  ksCode: "7.2-01",
  confidence: "high",
  check($: CheerioAPI): Violation[] {
    const lang = $("html").attr("lang");
    if (lang === undefined) {
      return [{ selector: "html", snippet: "<html> (lang 없음)", message: "html 요소에 lang 속성이 없습니다. 한국어 페이지에는 lang=\"ko\"를 추가하세요." }];
    }
    if (lang.trim() === "") {
      return [{ selector: "html[lang=\"\"]", snippet: "<html lang=\"\">", message: "lang 속성값이 비어 있습니다. lang=\"ko\" 처럼 유효한 BCP 47 코드를 입력하세요." }];
    }
    if (!VALID_LANG_RE.test(lang)) {
      return [{ selector: `html[lang="${lang}"]`, snippet: `<html lang="${lang}">`, message: `lang="${lang}" 은 유효한 BCP 47 형식이 아닙니다.` }];
    }
    return [];
  },
};
