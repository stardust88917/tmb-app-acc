import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult, Issue } from "./rule-types";

// 레이블이 필요 없는 input type
const SKIP_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
]);

export const rule: Rule = {
  id: "ks-form-label",
  ksCode: "3.4.1",
  ksName: "레이블 제공",
  principle: "이해의 용이성",
  guideline: "3.4 입력 도움",
  priority: "high",
  isBestPractice: false,
  description: "입력 서식에는 레이블을 제공해야 한다.",

  check($: CheerioAPI): CheckResult {
    const issues: Issue[] = [];
    let passCount = 0;
    let checkedCount = 0;

    const controls = $("input, select, textarea").toArray();

    for (const el of controls) {
      const $el = $(el);
      const type = ($el.attr("type") ?? "text").toLowerCase();
      if (SKIP_TYPES.has(type)) continue;

      const ariaHidden = $el.attr("aria-hidden");
      if (ariaHidden === "true") continue;

      checkedCount++;

      // 1. aria-label
      if ($el.attr("aria-label")?.trim()) { passCount++; continue; }

      // 2. aria-labelledby → 참조 요소 텍스트
      const labelledby = $el.attr("aria-labelledby");
      if (labelledby) {
        const hasText = labelledby.split(/\s+/).some(
          (id) => $(`#${CSS.escape(id)}`).text().trim().length > 0
        );
        if (hasText) { passCount++; continue; }
      }

      // 3. title 속성
      if ($el.attr("title")?.trim()) { passCount++; continue; }

      // 4. <label for="id">
      const id = $el.attr("id");
      if (id) {
        const label = $(`label[for="${CSS.escape(id)}"]`);
        if (label.length > 0 && label.text().trim()) {
          passCount++;
          continue;
        }
      }

      // 5. 부모 <label>로 감싸진 경우
      if ($el.closest("label").length > 0) {
        const labelText = $el
          .closest("label")
          .clone()
          .find("input, select, textarea")
          .remove()
          .end()
          .text()
          .trim();
        if (labelText) { passCount++; continue; }
      }

      // 6. placeholder만 있는 경우 — Best Practice 미달 (경고)
      const placeholder = $el.attr("placeholder");
      if (placeholder?.trim()) {
        issues.push({
          selector: `${el.name}[placeholder]`,
          html: $.html(el).slice(0, 300),
          message: `${el.name === "input" ? `<input type="${type}">` : `<${el.name}>`}에 레이블이 없고 placeholder만 있습니다. placeholder는 입력 시 사라져 레이블 역할을 할 수 없습니다.`,
          suggestion:
            "별도의 <label> 요소나 aria-label을 추가하세요. placeholder는 입력 힌트로만 사용하세요.",
        });
        continue;
      }

      // 레이블 없음
      issues.push({
        selector: el.name,
        html: $.html(el).slice(0, 300),
        message: `${el.name === "input" ? `<input type="${type}">` : `<${el.name}>`}에 접근 가능한 레이블이 없습니다.`,
        suggestion:
          "연결된 <label for=\"id\"> 요소를 추가하거나, aria-label 또는 aria-labelledby 속성을 사용하세요.",
      });
    }

    if (checkedCount === 0) {
      return {
        verdict: "해당없음",
        issues: [],
        passCount: 0,
        checkedCount: 0,
        notes: "페이지에 입력 서식 요소가 없습니다.",
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
