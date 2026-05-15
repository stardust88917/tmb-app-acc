import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import type { AxeResults } from "axe-core";
import {
  mapAxeResultsToKS,
  computePrincipleSummary,
  computeOverallScore,
} from "./ks-mapper";
import type { AuditResult } from "./types";
import { randomUUID } from "crypto";

export async function runAudit(url: string): Promise<AuditResult> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Allow dynamic content to settle
    await page.waitForLoadState("load").catch(() => {});
    await page.waitForTimeout(500);

    const axeResults: AxeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    const ksResults = mapAxeResultsToKS(axeResults);
    const principlesSummary = computePrincipleSummary(ksResults);
    const overallScore = computeOverallScore(ksResults);

    const passCount = ksResults.filter((r) => r.verdict === "적합").length;
    const failCount = ksResults.filter((r) => r.verdict === "부적합").length;
    const reviewCount = ksResults.filter((r) => r.verdict === "검토필요").length;
    const naCount = ksResults.filter((r) => r.verdict === "해당없음").length;

    const result: AuditResult = {
      id: randomUUID(),
      url,
      auditedAt: new Date().toISOString(),
      totalItems: ksResults.length,
      passCount,
      failCount,
      reviewCount,
      naCount,
      overallScore,
      principlesSummary,
      ksResults,
    };

    return result;
  } finally {
    await browser.close();
  }
}
