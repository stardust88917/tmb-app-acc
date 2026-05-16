import type { CheerioAPI } from "cheerio";
import type { Rule, CheckResult } from "./rule-types";

const FILENAME_RE = /\.(jpe?g|png|gif|webp|svg|bmp)$/i;
const GENERIC_RE = /^(IMG_?|DSC_?|Photo_?|image_?|사진_?|이미지_?)\d*/i;

export const rule: Rule = {
  id: "ks-img-alt-filename",
  ksCode: "5.1-01",
  ksName: "이미지 대체 텍스트 제공",
  principle: "인식의 용이성",
  guideline: "5.1 대체 텍스트",
  category: "5.1 대체 텍스트",
  priority: "medium",
  isBestPractice: false,
  description: "alt 값이 파일명이나 무의미한 텍스트(IMG_001, 이미지 등)이면 스크린리더 사용자에게 정보를 전달하지 못합니다.",
  check($: CheerioAPI): CheckResult {
    const imgs = $("img[alt]");
    const issues = imgs
      .toArray()
      .filter((el) => {
        const alt = ($(el).attr("alt") ?? "").trim();
        if (alt === "") return false;
        return FILENAME_RE.test(alt) || GENERIC_RE.test(alt) || alt === "이미지";
      })
      .map((el) => {
        const alt = $(el).attr("alt") ?? "";
        return {
          selector: `img[alt="${alt.slice(0, 40)}"]`,
          html: $.html(el)?.slice(0, 250) ?? "",
          message: `alt="${alt}" 는 의미없는 대체 텍스트입니다 (파일명 또는 일반 명칭).`,
          suggestion: "이미지가 전달하는 실제 내용을 간결하게 설명하는 alt 텍스트를 작성하세요.",
        };
      });

    const checkedCount = imgs.length;
    const passCount = checkedCount - issues.length;

    if (checkedCount === 0) {
      return { verdict: "해당없음", issues: [], passCount: 0, checkedCount: 0 };
    }
    return {
      verdict: issues.length > 0 ? "부적합" : "적합",
      issues,
      passCount,
      checkedCount,
    };
  },
};
