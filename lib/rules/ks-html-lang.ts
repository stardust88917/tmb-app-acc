import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

// BCP 47 언어 태그 기본 패턴
const VALID_LANG_RE = /^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/;

export const rule: Rule = {
  id: "ks-html-lang",
  ksCode: "3.1.1",
  ksName: "기본 언어 표시",
  principle: "이해의 용이성",
  guideline: "3.1 가독성",
  priority: "medium",
  isBestPractice: false,
  description: "주로 사용하는 언어를 명시해야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];

    const lang = $("html").attr("lang");

    if (lang === undefined) {
      issues.push({
        selector: "html",
        html: "<html>",
        message: '<html> 요소에 lang 속성이 없습니다.',
        suggestion:
          '한국어 페이지라면 <html lang="ko"> 또는 <html lang="ko-KR">을 추가하세요.',
      });
      return { verdict: "부적합", issues, passCount: 0, checkedCount: 1 };
    }

    if (lang.trim() === "") {
      issues.push({
        selector: "html",
        html: '<html lang="">',
        message: "lang 속성이 비어 있습니다.",
        suggestion:
          'lang="ko" 처럼 유효한 BCP 47 언어 코드를 입력하세요.',
      });
      return { verdict: "부적합", issues, passCount: 0, checkedCount: 1 };
    }

    if (!VALID_LANG_RE.test(lang)) {
      issues.push({
        selector: "html",
        html: `<html lang="${lang}">`,
        message: `lang="${lang}" 값이 BCP 47 형식에 맞지 않습니다.`,
        suggestion:
          '올바른 언어 코드를 사용하세요 (예: "ko", "ko-KR", "en", "en-US").',
      });
      return { verdict: "부적합", issues, passCount: 0, checkedCount: 1 };
    }

    return { verdict: "적합", issues: [], passCount: 1, checkedCount: 1 };
  },
};
