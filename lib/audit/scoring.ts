import type { KsItemResult } from "@/lib/types";

export interface ScoreResult {
  passed: number;        // 적합 (자동 + 사용자 판정 포함)
  failed: number;        // 부적합
  review: number;        // 검토 필요
  na: number;            // 해당 없음
  manualPending: number; // 수동 미검사 (사용자 판정 없는 manual 항목)
  total: number;         // 전체 항목 수
  rate: number | null;   // 적합률 0~100 (분모 0이면 null)
  formula: string;       // 표시용 공식 문자열
}

/**
 * KS 항목 목록에서 적합률을 계산합니다.
 *
 * 산정 기준:
 *   - 유효 판정: userVerdict ?? verdict
 *   - 분모: "pass" + "fail" 항목만 포함
 *   - 분모 제외: "review", "na", "manual"(미판정)
 *   - 적합률 = passed / (passed + failed) × 100
 */
export function calculateScore(items: KsItemResult[]): ScoreResult {
  let passed = 0;
  let failed = 0;
  let review = 0;
  let na = 0;
  let manualPending = 0;

  for (const item of items) {
    const effective = item.userVerdict ?? item.verdict;
    switch (effective) {
      case "pass":   passed++;   break;
      case "fail":   failed++;   break;
      case "review": review++;   break;
      case "na":     na++;       break;
      case "manual": manualPending++; break;
    }
  }

  const denominator = passed + failed;
  const rate =
    denominator > 0
      ? Math.round((passed / denominator) * 1000) / 10  // 소수점 1자리
      : null;

  return {
    passed,
    failed,
    review,
    na,
    manualPending,
    total: items.length,
    rate,
    formula: "적합 ÷ (적합 + 부적합) × 100",
  };
}
