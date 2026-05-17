import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

const FILENAME_RE = /\.(jpe?g|png|gif|webp|svg|bmp)$/i;
const GENERIC_RE = /^(IMG_?|DSC_?|Photo_?|image_?|사진_?|이미지_?)[\d_]*/i;

export const rule: Rule = {
  id: "ks-img-alt-filename",
  ksCode: "5.1-01",
  confidence: "medium",
  check($: CheerioAPI): Violation[] {
    return $("img[alt]")
      .toArray()
      .filter((el) => {
        const alt = ($(el).attr("alt") ?? "").trim();
        if (alt === "") return false;
        return FILENAME_RE.test(alt) || GENERIC_RE.test(alt) || alt === "이미지" || alt === "image";
      })
      .map((el) => {
        const alt = $(el).attr("alt") ?? "";
        return {
          selector: `img[alt="${alt.slice(0, 40)}"]`,
          snippet: ($.html(el) ?? "").slice(0, 250),
          message: `alt="${alt}" 는 파일명 또는 일반 명칭입니다. 이미지가 전달하는 내용을 설명하세요.`,
        };
      });
  },
};
