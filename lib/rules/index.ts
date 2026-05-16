import { rule as imgAlt } from "./ks-img-alt";
import { rule as mediaCaption } from "./ks-media-caption";
import { rule as autoplay } from "./ks-autoplay";
import { rule as blinkFlash } from "./ks-blink-flash";
import { rule as focusOrder } from "./ks-focus-order";
import { rule as skipNav } from "./ks-skip-nav";
import { rule as pageHeading } from "./ks-page-heading";
import { rule as linkText } from "./ks-link-text";
import { rule as htmlLang } from "./ks-html-lang";
import { rule as metaRefresh } from "./ks-meta-refresh";
import { rule as tableStructure } from "./ks-table-structure";
import { rule as formLabel } from "./ks-form-label";
import { rule as duplicateId } from "./ks-duplicate-id";
import { rule as ariaRole } from "./ks-aria-role";
import type { Rule } from "./rule-types";

export const allRules: Rule[] = [
  imgAlt,        // 1.1.1 적절한 대체 텍스트 제공
  mediaCaption,  // 1.2.1 자막 제공
  autoplay,      // 1.3.4 자동 재생 금지
  focusOrder,    // 2.1.2 초점 이동
  blinkFlash,    // 2.3.1 깜박임과 번쩍임 사용 제한
  skipNav,       // 2.4.1 반복 영역 건너뛰기
  pageHeading,   // 2.4.2 제목 제공
  linkText,      // 2.4.3 적절한 링크 텍스트
  htmlLang,      // 3.1.1 기본 언어 표시
  metaRefresh,   // 3.2.1 사용자 요구에 따른 실행
  tableStructure,// 3.3.2 표의 구성
  formLabel,     // 3.4.1 레이블 제공
  duplicateId,   // 4.1.1 마크업 오류 방지
  ariaRole,      // 4.2.1 웹 애플리케이션 접근성 준수
];

export type { Rule };
