"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditResult } from "@/lib/types";

type Mode = "url" | "file";

export default function AuditForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = mode === "url" ? url.trim().length > 0 : file !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("running");
    setErrorMsg("");
    setProgress(15);
    setLabel(mode === "url" ? "HTML 가져오는 중..." : "파일 읽는 중...");

    const steps = [
      { pct: 35, label: "cheerio 파싱 중..." },
      { pct: 60, label: "14개 룰 검사 중..." },
      { pct: 85, label: "KS X 3253 매핑 중..." },
    ];
    let idx = 0;
    const timer = setInterval(() => {
      if (idx < steps.length) {
        setProgress(steps[idx].pct);
        setLabel(steps[idx].label);
        idx++;
      }
    }, 2500);

    try {
      let res: Response;

      if (mode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/audit", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
      }

      clearInterval(timer);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "검수 실패");
      }

      const data = (await res.json()) as { id: string; result: AuditResult };
      setProgress(100);
      setLabel("완료!");
      sessionStorage.setItem(`audit_${data.id}`, JSON.stringify(data.result));
      setTimeout(() => router.push(`/result/${data.id}`), 300);
    } catch (err) {
      clearInterval(timer);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "알 수 없는 오류");
      setProgress(0);
    }
  }

  if (status === "running") {
    const sourceLabel = mode === "url" ? url : (file?.name ?? "");
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-center">
          <p className="text-base font-semibold text-gray-700 mb-1">정적 접근성 분석 중</p>
          <p className="text-sm text-gray-400 truncate max-w-xs mb-1">{sourceLabel}</p>
          <p className="text-sm text-blue-600">{label}</p>
        </div>
        <div className="w-full max-w-md">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>진행률</span><span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-400">
          {["fetch", "파싱", "룰 검사", "매핑", "완료"].map((s, i) => (
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
        {([["url", "🔗 URL"], ["file", "📄 HTML 파일"]] as [Mode, string][]).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setFile(null); setUrl(""); setErrorMsg(""); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* URL input */}
      {mode === "url" && (
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
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              검수 시작
            </button>
          </div>
        </div>
      )}

      {/* File input */}
      {mode === "file" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HTML 파일 선택
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-left text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {file ? (
                <span className="text-gray-800 font-medium">{file.name}</span>
              ) : (
                "클릭하여 .html 파일 선택…"
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              검수 시작
            </button>
          </div>
          {file && (
            <p className="text-xs text-gray-400 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span>⚠️</span><span>{errorMsg}</span>
        </div>
      )}

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 space-y-1">
        <p className="font-semibold">📌 정적 분석 도구 안내</p>
        <p>HTML을 정적으로 분석합니다. 로그인이 필요한 페이지, JavaScript 렌더링 콘텐츠, 동적 상태 변화는 검사되지 않습니다.</p>
        <p>동적 접근성 검사는 <strong>axe DevTools</strong> 또는 <strong>Playwright + axe-core</strong>를 사용하세요.</p>
      </div>

      <p className="text-xs text-gray-400">
        KS X 3253:2016 기준 14개 룰 정적 검사 · 약 5~10초 소요
      </p>
    </form>
  );
}
