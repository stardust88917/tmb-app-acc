import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

const VALID_LANG_RE = /^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/;

export const rule: Rule = {
  id: "ks-html-lang",
  ksCode: "8.1-01",
  ksName: "운영체제 접근성 기능 준수",
  principle: "모범 사례",
  guideline: "8.1 OS 접근성",
  category: "8.1 OS 접근성",
  priority: "medium",
  isBestPractice: true,
  description: "html 요소에 lang 속성이 없거나 유효하지 않으면 스크린리더가 올바른 언어로 읽지 못합니다.",
  check($: CheerioAPI): CheckResult {
    const lang = $("html").attr("lang");
    const issues: { selector: string; html: string; message: string; suggestion: string }[] = [];

    if (lang === undefined) {
      issues.push({
        selector: "html",
        html: "<html> (lang 속성 없음)",
        message: "html 요소에 lang 속성이 없습니다.",
        suggestion: "한국어 페이지에는 <html lang=\"ko\">를 추가하세요.",
      });
    } else if (lang.trim() === "") {
      issues.push({
        selector: "html[lang=\"\"]",
        html: "<html lang=\"\">",
        message: "lang 속성값이 비어 있습니다.",
        suggestion: "lang=\"ko\" 처럼 유효한 BCP 47 언어 코드를 입력하세요.",
      });
    } else if (!VALID_LANG_RE.test(lang)) {
      issues.push({
        selector: `html[lang="${lang}"]`,
        html: `<html lang="${lang}">`,
        message: `lang="${lang}" 값이 BCP 47 형식에 맞지 않습니다.`,
        suggestion: "올바른 언어 코드를 사용하세요 (예: ko, ko-KR, en, en-US).",
      });
    }

    return {
      verdict: issues.length > 0 ? "부적합" : "적합",
      issues,
      passCount: issues.length > 0 ? 0 : 1,
      checkedCount: 1,
    };
  },
};
