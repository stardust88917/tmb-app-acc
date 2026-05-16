import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

export const rule: Rule = {
  id: "ks-table-structure",
  ksCode: "3.3.2",
  ksName: "표의 구성",
  principle: "이해의 용이성",
  guideline: "3.3 콘텐츠의 논리성",
  priority: "medium",
  isBestPractice: false,
  description: "표는 이해하기 쉽게 구성해야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    // 레이아웃 테이블 제외 셀렉터
    const dataTables = $("table").filter((_, el) => {
      const role = $(el).attr("role");
      const ariaHidden = $(el).attr("aria-hidden");
      return role !== "presentation" && role !== "none" && ariaHidden !== "true";
    });

    dataTables.each((_, table) => {
      const $table = $(table);
      checkedCount++;

      const hasTh = $table.find("th").length > 0;

      // 레이아웃 테이블 추론: th가 없고 단순 1열이면 레이아웃일 가능성
      if (!hasTh) {
        // th가 없으면 데이터 테이블인지 레이아웃 테이블인지 판단 불가
        issues.push({
          selector: "table",
          html: $.html(table).slice(0, 300),
          message:
            "<table>에 <th> 요소가 없습니다. 데이터 표라면 헤더 셀이 필요합니다. 레이아웃 용도라면 role=\"presentation\"을 추가하세요.",
          suggestion:
            '데이터 표: 헤더 셀에 <th scope="col"> 또는 <th scope="row">를 사용하세요. 레이아웃 표: <table role="presentation">으로 변경하세요.',
        });
        return;
      }

      let tablePass = true;

      // <th> scope 속성 확인
      $table.find("th").each((_, th) => {
        const scope = $(th).attr("scope");
        const id = $(th).attr("id");
        const ariaLabel = $(th).attr("aria-label");
        if (!scope && !id && !ariaLabel) {
          issues.push({
            selector: "th",
            html: $.html(th).slice(0, 200),
            message:
              '<th> 요소에 scope 속성이 없습니다. 화면 낭독기가 헤더-데이터 관계를 파악하기 어렵습니다.',
            suggestion:
              '열 헤더는 <th scope="col">, 행 헤더는 <th scope="row">를 사용하세요.',
          });
          tablePass = false;
        }
      });

      // <caption> 또는 aria-label 확인
      const hasCaption = $table.find("caption").length > 0;
      const hasAriaLabel =
        $table.attr("aria-label") || $table.attr("aria-labelledby");
      if (!hasCaption && !hasAriaLabel) {
        issues.push({
          selector: "table",
          html: $.html(table).slice(0, 200),
          message:
            "데이터 표에 <caption>이나 aria-label이 없습니다. 표 목적을 파악하기 어렵습니다.",
          suggestion:
            '<caption>표 제목</caption>을 table 첫 번째 자식으로 추가하거나, <table aria-label="표 제목">을 사용하세요.',
        });
        tablePass = false;
      }

      if (tablePass) passCount++;
    });

    if (checkedCount === 0) {
      return {
        verdict: "해당없음",
        issues: [],
        passCount: 0,
        checkedCount: 0,
        notes: "데이터 테이블이 없습니다.",
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
