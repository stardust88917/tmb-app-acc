import type { CheerioAPI } from "cheerio";
import type { Rule, Violation } from "./rule-types";

// Parses a hex color to [r,g,b] 0-255
function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const [r, g, b] = h.split("").map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const chan = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

// Extract inline color pairs from CSS text
function findLowContrastPairs(css: string): Violation[] {
  const violations: Violation[] = [];
  // Match selector blocks
  const blockRe = /([^{}]+)\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(css)) !== null) {
    const selector = match[1].trim();
    const body = match[2];
    const colorMatch = body.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,6})/i);
    const bgMatch = body.match(/(?:^|;)\s*background(?:-color)?\s*:\s*(#[0-9a-f]{3,6})/i);
    if (!colorMatch || !bgMatch) continue;
    const fg = hexToRgb(colorMatch[1]);
    const bg = hexToRgb(bgMatch[1]);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio < 4.5) {
      violations.push({
        selector: selector.slice(0, 80),
        snippet: `color: ${colorMatch[1]}; background: ${bgMatch[1]}`,
        message: `명도 대비 ${ratio.toFixed(2)}:1 — 4.5:1 미만입니다 (WCAG AA). 텍스트 또는 배경색을 조정하세요.`,
      });
    }
  }
  return violations.slice(0, 10);
}

export const rule: Rule = {
  id: "ks-color-contrast",
  ksCode: "5.3-03",
  confidence: "low",
  requiresCss: true,
  check(_$: CheerioAPI, _html: string, css?: string): Violation[] {
    if (!css) return [];
    return findLowContrastPairs(css);
  },
};
