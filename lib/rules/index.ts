import { rule as imgAltMissing } from "./ks-img-alt-missing";
import { rule as imgAltFilename } from "./ks-img-alt-filename";
import { rule as emptyAriaLabel } from "./ks-empty-aria-label";
import { rule as emptyButtonLabel } from "./ks-empty-button-label";
import { rule as liOnNoContext } from "./ks-li-on-no-context";
import { rule as counterAriaLive } from "./ks-counter-aria-live";
import { rule as placeholderAsLabel } from "./ks-placeholder-as-label";
import { rule as autoPopupOnLoad } from "./ks-auto-popup-on-load";
import { rule as dlOrder } from "./ks-dl-order";
import { rule as thScopeMissing } from "./ks-th-scope-missing";
import { rule as headingSkip } from "./ks-heading-skip";
import { rule as tableNoCaption } from "./ks-table-no-caption";
import { rule as imgMalformedSelfClose } from "./ks-img-malformed-self-close";
import { rule as htmlLang } from "./ks-html-lang";
import type { Rule } from "./rule-types";

export const allRules: Rule[] = [
  imgAltMissing,          // 5.1-01 img alt 누락
  imgAltFilename,         // 5.1-01 img alt 파일명
  emptyAriaLabel,         // 5.1-01 aria-label 빈값
  emptyButtonLabel,       // 5.1-01 버튼 레이블 없음
  liOnNoContext,          // 5.1-02 li 텍스트 없음
  counterAriaLive,        // 5.6-01 카운터 aria-live 없음
  placeholderAsLabel,     // 7.1-01 placeholder만 있고 label 없음
  autoPopupOnLoad,        // 7.5-01 로드 시 자동 팝업
  dlOrder,                // 8.1-01 dl 순서 오류
  thScopeMissing,         // 8.1-01 th scope 없음
  headingSkip,            // 8.1-01 제목 레벨 건너뜀
  tableNoCaption,         // 8.1-01 표 caption 없음
  imgMalformedSelfClose,  // 8.1-01 img 태그 형식 오류
  htmlLang,               // 8.1-01 html lang (Best Practice)
];

export type { Rule };
