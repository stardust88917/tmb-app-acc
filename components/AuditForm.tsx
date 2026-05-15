"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditResult } from "@/lib/types";

export default function AuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("running");
    setErrorMsg("");
    setProgress(10);
    setProgressLabel("브라우저 실행 중...");

    const steps = [
      { pct: 25, label: "페이지 로딩 중..." },
      { pct: 50, label: "axe-core 검사 실행 중..." },
      { pct: 75, label: "KS X 3253 항목 매핑 중..." },
      { pct: 90, label: "결과 정리 중..." },
    ];
    let stepIdx = 0;
    const timer = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgress(steps[stepIdx].pct);
        setProgressLabel(steps[stepIdx].label);
        stepIdx++;
      }
    }, 3000);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      clearInterval(timer);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "검수 실패");
      }

      const data = await res.json() as { id: string; result: AuditResult };
      setProgress(100);
      setProgressLabel("완료!");

      sessionStorage.setItem(`audit_${data.id}`, JSON.stringify(data.result));
      setTimeout(() => router.push(`/result/${data.id}`), 400);
    } catch (err) {
      clearInterval(timer);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "알 수 없는 오류");
      setProgress(0);
    }
  }

  if (status === "running") {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-1">접근성 검수 진행 중</p>
          <p className="text-sm text-gray-500 mb-1 truncate max-w-sm">{url}</p>
          <p className="text-sm text-blue-600">{progressLabel}</p>
        </div>

        <div className="w-full max-w-md">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>진행률</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 text-sm text-gray-400">
          <StepDot done={progress >= 25} label="브라우저" />
          <span className="mt-1">→</span>
          <StepDot done={progress >= 50} label="페이지 로딩" />
          <span className="mt-1">→</span>
          <StepDot done={progress >= 75} label="axe 검사" />
          <span className="mt-1">→</span>
          <StepDot done={progress >= 90} label="KS 매핑" />
          <span className="mt-1">→</span>
          <StepDot done={progress >= 100} label="완료" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-1">
          검수할 URL
        </label>
        <div className="flex gap-2">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            검수 시작
          </button>
        </div>
      </div>

      {status === "error" && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span className="mt-0.5">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <p className="text-xs text-gray-400">
        KS X 3253:2016 기준 32개 항목을 자동 검수합니다. 검수에는 약 15~30초 소요됩니다.
      </p>
    </form>
  );
}

function StepDot({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-3 h-3 rounded-full mt-1 ${done ? "bg-blue-600" : "bg-gray-300"}`}
      />
      <span className="text-xs">{label}</span>
    </div>
  );
}
