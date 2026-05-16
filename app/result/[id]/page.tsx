"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AuditResult } from "@/lib/types";
import ScoreCard from "@/components/ScoreCard";
import PrincipleChart from "@/components/PrincipleChart";
import IssueList from "@/components/IssueList";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [result, setResult] = useState<AuditResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(`audit_${id}`);
    if (!raw) { router.push("/"); return; }
    try { setResult(JSON.parse(raw) as AuditResult); }
    catch { router.push("/"); }
  }, [id, router]);

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    setDlError("");
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: result.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "실패"); }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename\*=UTF-8''(.+)/);
      const filename = match ? decodeURIComponent(match[1]) : `a11y_${id}.xlsx`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setDlError(err instanceof Error ? err.message : "다운로드 실패");
    } finally {
      setDownloading(false);
    }
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← 새 검수
          </button>
          <div className="flex items-center gap-2">
            {dlError && <p className="text-xs text-red-600">{dlError}</p>}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {downloading ? "⏳ 생성 중..." : "📥 엑셀 다운로드"}
            </button>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900">접근성 검수 결과</h1>

        <ScoreCard result={result} />
        <PrincipleChart principles={result.principlesSummary} />
        <IssueList ruleResults={result.ruleResults} />

        <p className="text-center text-xs text-gray-400 pb-4">
          KS X 3253:2016 정적 분석 · 14개 룰 · fetch + cheerio
        </p>
      </div>
    </div>
  );
}
