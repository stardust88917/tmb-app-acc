import type { CheerioAPI } from "cheerio";

/** 하나의 위반 인스턴스 */
export interface Violation {
  selector: string;   // CSS 선택자 (가능하면 구체적으로)
  snippet: string;    // 원본 HTML 발췌 (최대 250자)
  lineHint?: number;  // 줄 번호 (가능할 때)
  message: string;    // 사람이 읽을 수 있는 위반 설명
}

/** 각 룰 파일이 export하는 구조 */
export interface Rule {
  id: string;
  ksCode: string;
  /** 자동 검사 신뢰도: high → 즉시 부적합, medium → 부적합, low → 검토 필요 */
  confidence: "high" | "medium" | "low";
  requiresCss?: boolean;
  bestPractice?: boolean;
  check($: CheerioAPI, htmlText: string, css?: string): Violation[];
}
