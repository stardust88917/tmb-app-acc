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
  name: string;
  guide: string;
  checkPoints: string[];
  tools: string[];
  wcagRef: string;
}

export interface KsItemResult {
  code: string;                  // e.g. "5.1-01"
  name: string;                  // e.g. "이미지 대체 텍스트 제공"
  principle: string;
  category: string;
  severity: string;
  autoCheckable: boolean;

  // 자동 검사 항목
  verdict: KsVerdict;
  violations: Violation[];       // 위반 인스턴스 목록
  ruleIds: string[];             // 해당 KS 코드를 담당하는 룰 ID들
  confidence?: "high" | "medium" | "low";  // 가장 낮은 신뢰도
  cssRequired?: boolean;         // CSS 없어서 검사 제한됨

  // 수동 검사 항목
  manualGuide?: ManualCheckGuide;

  // 사용자 입력 (클라이언트측 수동 판정)
  userVerdict?: "pass" | "fail" | "review";
  userNote?: string;
}

// ── API 응답 전체 ──────────────────────────────────────────────────────────
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
