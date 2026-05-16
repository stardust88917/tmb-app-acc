import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-skip-nav",
  ksCode: "2.4.1",
  ksName: "반복 영역 건너뛰기",
  principle: "운용의 용이성",
  guideline: "2.4 쉬운 내비게이션",
  priority: "medium",
  isBestPractice: false,
  description: "콘텐츠의 반복되는 영역은 건너뛸 수 있어야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];

    // Skip link 패턴: body 최상단 근처의 #-앵커 링크
    const skipPatterns = [
      'a[href="#main"]',
      'a[href="#content"]',
      'a[href="#maincontent"]',
      'a[href="#skip"]',
      'a[href="#skipnav"]',
      'a[href^="#"][class*="skip"]',
      'a[href^="#"][id*="skip"]',
      ".skip-nav a",
      ".skip-link",
      "#skip-link",
      '[class*="skipnav"]',
      '[class*="skip-nav"]',
      '[id*="skipnav"]',
    ];

    const hasSkipLink = skipPatterns.some((sel) => $(sel).length > 0);

    // nav/header 앞에 오는 최초 링크가 앵커 링크인지 확인 (일반적 skip link)
    const firstBodyLinks = $("body").find("a[href]").slice(0, 5);
    const hasEarlyAnchorLink = firstBodyLinks.toArray().some((el) => {
      const href = $(el).attr("href") ?? "";
      return href.startsWith("#") && href.length > 1;
    });

    // landmark skip 패턴도 인정 (main 랜드마크)
    const hasMainLandmark =
      $("main").length > 0 ||
      $('[role="main"]').length > 0;

    if (hasSkipLink || hasEarlyAnchorLink) {
      return {
        verdict: "적합",
        issues: [],
        passCount: 1,
        checkedCount: 1,
        notes: "반복 영역 건너뛰기 링크가 발견됐습니다.",
      };
    }

    if (hasMainLandmark) {
      issues.push({
        selector: "body",
        html: "",
        message:
          "<main> 랜드마크는 있으나, 명시적 skip navigation 링크가 없습니다.",
        suggestion:
          '페이지 최상단에 <a href="#main" class="skip-link">본문 바로가기</a>를 추가하고, 본문 시작 요소에 id="main"을 지정하세요.',
      });
      return {
        verdict: "검토필요",
        issues,
        passCount: 0,
        checkedCount: 1,
        notes: "main 랜드마크로 부분 지원. 명시적 skip link 권장.",
      };
    }

    issues.push({
      selector: "body",
      html: "",
      message: "페이지 최상단에 반복 영역(네비게이션 등)을 건너뛸 수 있는 링크가 없습니다.",
      suggestion:
        '페이지 첫 번째 요소로 <a href="#main" class="skip-nav">본문 바로가기</a>를 추가하고, 본문 컨테이너에 id="main"을 추가하세요. .skip-nav 는 평소에 숨기고 focus 시 표시하세요.',
    });

    return {
      verdict: "부적합",
      issues,
      passCount: 0,
      checkedCount: 1,
    };
  },
};
