"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { AuditResult } from "@/lib/types";
import ScoreCard from "@/components/ScoreCard";
import PrincipleChart from "@/components/PrincipleChart";
import IssueList from "@/components/IssueList";

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [result, setResult] = useState<AuditResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(`audit_${id}`);
    if (stored) {
      try {
        setResult(JSON.parse(stored) as AuditResult);
      } catch {
        router.push("/");
      }
    } else {
      router.push("/");
    }
  }, [id, router]);

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    setDownloadError("");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: result.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "다운로드 실패");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : `a11y_result_${id}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "다운로드 실패");
    } finally {
      setDownloading(false);
    }
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">결과를 불러오는 중...</p>
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
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← 새 검수
          </button>
          <div className="flex items-center gap-2">
            {downloadError && (
              <p className="text-xs text-red-600">{downloadError}</p>
            )}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {downloading ? (
                <>
                  <span className="animate-spin">⏳</span> 생성 중...
                </>
              ) : (
                <>📥 엑셀 다운로드</>
              )}
            </button>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900">
          접근성 검수 결과
        </h1>

        <ScoreCard result={result} />
        <PrincipleChart principles={result.principlesSummary} />
        <IssueList ksResults={result.ksResults} />

        <p className="text-center text-xs text-gray-400 pb-4">
          KS X 3253:2016 기준 | {result.ksResults.length}개 항목 검수
        </p>
      </div>
    </div>
  );
}
