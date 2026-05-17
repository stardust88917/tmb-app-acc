"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditResponse } from "@/lib/types";

type Mode = "url" | "file";

const STEPS = [
  { pct: 25, label: "HTML 수신 중..." },
  { pct: 50, label: "CSS 분석 중..." },
  { pct: 75, label: "23개 룰 실행 중..." },
  { pct: 90, label: "KS 34개 항목 (자동 12·수동 22) 매핑 중..." },
];

export default function AuditForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = mode === "url" ? url.trim().length > 0 : file !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setRunning(true);
    setError("");
    setProgress(10);
    setProgressLabel(mode === "url" ? "HTML 가져오는 중..." : "파일 읽는 중...");

    let stepIdx = 0;
    const timer = setInterval(() => {
      if (stepIdx < STEPS.length) {
        setProgress(STEPS[stepIdx].pct);
        setProgressLabel(STEPS[stepIdx].label);
        stepIdx++;
      }
    }, 2000);

    try {
      let res: Response;
      if (mode === "file" && file) {
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch("/api/audit", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
      }

      clearInterval(timer);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "검수 실패");
      }

      const data = (await res.json()) as AuditResponse;
      setProgress(100);
      setProgressLabel("완료!");
      sessionStorage.setItem("lastAuditResult", JSON.stringify(data));
      setTimeout(() => router.push("/result"), 300);
    } catch (err) {
      clearInterval(timer);
      setRunning(false);
      setProgress(0);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    }
  }

  if (running) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-center">
          <p className="text-base font-semibold text-gray-700 mb-1">KS X 3253:2016 접근성 검수 중</p>
          <p className="text-sm text-gray-400 truncate max-w-xs mb-1">
            {mode === "url" ? url : (file?.name ?? "")}
          </p>
          <p className="text-sm text-blue-600 font-medium">{progressLabel}</p>
        </div>
        <div className="w-full max-w-md">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>진행률</span><span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex gap-4 text-xs text-gray-400">
          {["수신", "CSS", "룰 실행", "매핑", "완료"].map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${progress >= (i + 1) * 18 ? "bg-blue-600" : "bg-gray-200"}`} />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {(["url", "file"] as Mode[]).map((m) => (
          <button key={m} type="button"
            onClick={() => { setMode(m); setFile(null); setUrl(""); setError(""); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {m === "url" ? "🔗 URL" : "📄 HTML 파일"}
          </button>
        ))}
      </div>

      {mode === "url" && (
        <div>
          <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-1">검수할 URL</label>
          <div className="flex gap-2">
            <input id="url-input" type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com" required
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={!canSubmit}
              className="px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              검수 시작
            </button>
          </div>
        </div>
      )}

      {mode === "file" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">HTML 파일 선택</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex-1 border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-left text-gray-500 hover:border-blue-400 transition-colors">
              {file
                ? <span className="text-gray-800 font-medium">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                : "클릭하여 .html 파일 선택…"}
            </button>
            <input ref={fileRef} type="file" accept=".html,.htm" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="submit" disabled={!canSubmit}
              className="px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              검수 시작
            </button>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            ⚠️ 파일 모드는 외부 CSS를 분석하지 않으므로 색상 대비·포커스 표시 항목 검사가 제한됩니다.
          </p>
        </div>
      )}

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
        <p className="font-semibold">📋 KS X 3253:2016 · 34개 항목 (자동 12 · 수동 22) · 23개 룰</p>
        <p>URL 모드: HTML + 연결 CSS 자동 수집 → 색상 대비·포커스 포함 전체 검사</p>
        <p>파일 모드: 로컬 HTML 정적 분석 → CSS 룰 제외 (axe DevTools로 보완 권장)</p>
      </div>
    </form>
  );
}
