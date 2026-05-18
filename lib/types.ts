// ── 단일 위반 인스턴스 ─────────────────────────────────────────────────────
export interface Violation {
  selector: string;
  snippet: string;
  lineHint?: number;
  message: string;
}

// ── 자동 검사 룰 결과 (KS 항목에 매핑되기 전) ──────────────────────────────
export interface RuleResult {
  ruleId: string;
  ksCode: string;
  confidence: "high" | "medium" | "low";
  violations: Violation[];
}

// ── KS X 3253:2016 34개 항목 중 하나의 최종 상태 ───────────────────────────
export type KsVerdict = "pass" | "fail" | "review" | "manual" | "na";

export interface ManualCheckGuide {
  ksCode: string;
  category: string;
  title: string;
  classification: "manual" | "semi-auto";
  criteriaPass?: string;
  criteriaFail?: string;
  method: string;
  tools: string[];
  platformHints: { ios?: string | null; android?: string | null };
}

export interface KsItemResult {
  code: string;                  // e.g. "5.1-01"
  name: string;                  // e.g. "이미지 대체 텍스트 제공"
  principle: string;             // 인식의 용이성 / 운용의 용이성 / 이해의 용이성 / 견고성
  category: string;
  severity: string;
  autoCheckable: boolean;

  // KS 기준 (엑셀 원본)
  criteriaPass?: string;         // 적합 기준 설명
  criteriaFail?: string;         // 부적합 사례
  iosHint?: string;              // iOS 구현 힌트
  androidHint?: string;          // Android 구현 힌트
  note?: string;                 // 비고

  // 자동 검사 항목
  verdict: KsVerdict;
  violations: Violation[];       // 위반 인스턴스 목록
  ruleIds: string[];             // 해당 KS 코드를 담당하는 룰 ID들
  confidence?: "high" | "medium" | "low";  // 가장 낮은 신뢰도
  cssRequired?: boolean;         // CSS 없어서 검사 제한됨

  // 수동 검사 항목
  manualGuide?: ManualCheckGuide;

  // 사용자 입력 (클라이언트측 수동 판정)
  userVerdict?: "pass" | "fail" | "review" | "na";
  userNote?: string;
}

// ── 단일 페이지 API 응답 ───────────────────────────────────────────────────
export interface AuditResponse {
  source: string;             // URL 또는 파일명
  auditDate: string;
  inputMode: "url" | "file";
  cssAnalyzed: boolean;
  ksItems: KsItemResult[];    // 34개 항목

  // 집계
  totalItems: number;
  autoItems: number;
  passCount: number;
  failCount: number;
  reviewCount: number;
  manualCount: number;
  overallScore: number;       // 자동 판정 항목 기준 0-100
}

// ── 멀티 URL 일관성 이슈 ───────────────────────────────────────────────────
export interface ConsistencyIssue {
  ksCode: string;
  ksName: string;
  type: "mixed-verdict" | "structure" | "navigation";
  description: string;
  affectedPages: string[];     // source URLs
  passingPages: string[];
  severity: "high" | "medium" | "low";
}

// ── 사이트 종합 집계 ────────────────────────────────────────────────────────
export interface SiteOverview {
  pageCount: number;
  passCount: number;           // ALL 페이지 적합 항목
  failCount: number;           // ANY 페이지 부적합 항목
  reviewCount: number;
  manualCount: number;
  overallScore: number;        // strictest: 가장 낮은 페이지 점수
  pageScores: { source: string; score: number | null }[];
  worstItems: {
    code: string; name: string;
    failPageCount: number; failPages: string[];
  }[];
}

// ── 멀티 페이지 API 응답 ───────────────────────────────────────────────────
export interface MultiAuditResponse {
  type: "multi";
  auditDate: string;
  pages: AuditResponse[];
  failed: { url: string; error: string }[];
  overview: SiteOverview;
  consistency: ConsistencyIssue[];
}
