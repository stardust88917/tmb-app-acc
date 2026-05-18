import { rule as imgAltMissing }         from "./ks-img-alt-missing";
import { rule as imgAltFilename }         from "./ks-img-alt-filename";
import { rule as emptyAriaLabel }         from "./ks-empty-aria-label";
import { rule as emptyButtonLabel }       from "./ks-empty-button-label";
import { rule as liNoContext }            from "./ks-li-no-context";
import { rule as decorativeImg }          from "./ks-decorative-img";
import { rule as backgroundImageInfo }    from "./ks-background-image-info";
import { rule as colorContrast }          from "./ks-color-contrast";
import { rule as autoplay }              from "./ks-autoplay";
import { rule as counterAriaLive }       from "./ks-counter-aria-live";
import { rule as focusVisible }          from "./ks-focus-visible";
import { rule as skipNav }               from "./ks-skip-nav";
import { rule as headingStructure }      from "./ks-heading-structure";
import { rule as linkText }              from "./ks-link-text";
import { rule as pageTitle }             from "./ks-page-title";
import { rule as placeholderAsLabel }    from "./ks-placeholder-as-label";
import { rule as formLabel }             from "./ks-form-label";
import { rule as htmlLang }              from "./ks-html-lang";
import { rule as metaRefresh }           from "./ks-meta-refresh";
import { rule as tableCaption }          from "./ks-table-caption";
import { rule as thScope }              from "./ks-th-scope";
import { rule as autoPopup }             from "./ks-auto-popup";
import { rule as dlOrder }               from "./ks-dl-order";
import { rule as imgMalformed }          from "./ks-img-malformed";
import { rule as ariaUsage }             from "./ks-aria-usage";
import { rule as touchTargetSize }       from "./ks-touch-target-size";
import type { Rule } from "./rule-types";

export const allRules: Rule[] = [
  imgAltMissing,        // 5.1-01 img alt 없음              (high)
  imgAltFilename,       // 5.1-01 img alt 파일명             (medium)
  emptyAriaLabel,       // 5.1-01 aria-label 빈값           (high)
  emptyButtonLabel,     // 5.1-02 버튼 레이블 없음            (high)
  liNoContext,          // 5.1-01 li 텍스트 없음              (medium)
  decorativeImg,        // 5.1-03 장식 이미지 모순 처리        (medium)
  backgroundImageInfo,  // 5.1-04 배경 이미지 대체 수단        (low, CSS)
  colorContrast,        // 5.4-01 명도 대비                   (low, CSS)
  autoplay,             // 7.4-01 자동재생                    (high)
  counterAriaLive,      // 5.6-01 카운터 aria-live           (low)
  focusVisible,         // 6.1-02 포커스 숨김                 (high, CSS)
  skipNav,              // 6.1-01 건너뛰기 링크 없음           (medium)
  headingStructure,     // 6.1-01 제목 구조                   (high)
  linkText,             // 5.1-02 링크 텍스트                 (high)
  pageTitle,            // 7.2-01 페이지 제목                 (high)
  placeholderAsLabel,   // 7.1-01 placeholder만               (high)
  formLabel,            // 7.1-01 label 없음                  (high)
  htmlLang,             // 8.2-01 html lang                  (high)
  metaRefresh,          // 7.5-01 meta refresh               (high)
  tableCaption,         // 8.2-01 표 caption 없음             (medium)
  thScope,              // 8.2-01 th scope 없음               (medium)
  autoPopup,            // 7.5-01 자동 팝업                   (medium)
  dlOrder,              // 8.2-01 dl 순서                     (medium)
  imgMalformed,         // 8.2-01 img 형식 오류               (low)
  ariaUsage,            // 8.2-02 ARIA 잘못 사용              (medium)
  touchTargetSize,      // 6.5-01 터치 영역 9mm 이상          (low, CSS)
];

export type { Rule };
