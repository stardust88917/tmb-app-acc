"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "url" | "file";

// Single-URL fake steps (for file/single-URL progress animation)
const SINGLE_STEPS = [
  { pct: 25, label: "HTML 수신 중..." },
  { pct: 50, label: "CSS 분석 중..." },
  { pct: 75, label: "26개 룰 실행 중..." },
  { pct: 90, label: "KS 34개 항목 매핑 중..." },
];

function parseUrls(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http://") || s.startsWith("https://"))
    .slice(0, 30);
}

export default function AuditForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");

  // URL mode state
  const [urlText, setUrlText] = useState("");

  // File mode state
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Running state
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressCurrent, setProgressCurrent] = useState("");
  const [error, setError] = useState("");

  const parsedUrls = mode === "url" ? parseUrls(urlText) : [];
  const isMulti = parsedUrls.length > 1;
  const canSubmit = mode === "url" ? parsedUrls.length > 0 : file !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setRunning(true);
    setError("");
    setProgress(10);
    setProgressLabel(mode === "file" ? "파일 읽는 중..." : "검수 시작...");

    // ── File mode ─────────────────────────────────────────────────────────
    if (mode === "file" && file) {
      let stepIdx = 0;
      const timer = setInterval(() => {
        if (stepIdx < SINGLE_STEPS.length) {
          setProgress(SINGLE_STEPS[stepIdx].pct);
          setProgressLabel(SINGLE_STEPS[stepIdx].label);
          stepIdx++;
        }
      }, 2000);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/audit", { method: "POST", body: fd });
        clearInterval(timer);
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "검수 실패"); }
        const data = await res.json();
        setProgress(100); setProgressLabel("완료!");
        sessionStorage.setItem("lastAuditResult", JSON.stringify(data));
        setTimeout(() => router.push("/result"), 300);
      } catch (err) {
        clearInterval(timer);
        setRunning(false); setProgress(0);
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      }
      return;
    }

    // ── Single URL ─────────────────────────────────────────────────────────
    if (!isMulti) {
      let stepIdx = 0;
      const timer = setInterval(() => {
        if (stepIdx < SINGLE_STEPS.length) {
          setProgress(SINGLE_STEPS[stepIdx].pct);
          setProgressLabel(SINGLE_STEPS[stepIdx].label);
          stepIdx++;
        }
      }, 2000);
      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: parsedUrls[0] }),
        });
        clearInterval(timer);
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "검수 실패"); }
        const data = await res.json();
        setProgress(100); setProgressLabel("완료!");
        sessionStorage.setItem("lastAuditResult", JSON.stringify(data));
        setTimeout(() => router.push("/result"), 300);
      } catch (err) {
        clearInterval(timer);
        setRunning(false); setProgress(0);
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      }
      return;
    }

    // ── Multi-URL streaming ────────────────────────────────────────────────
    setProgressTotal(parsedUrls.length);
    setProgressDone(0);
    setProgressCurrent(parsedUrls[0]);
    setProgressLabel(`0 / ${parsedUrls.length} 검수 중...`);
    setProgress(5);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: parsedUrls }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "검수 실패"); }
      if (!res.body) throw new Error("스트림을 받을 수 없습니다.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg = JSON.parse(trimmed);
            if (msg.type === "progress") {
              const { done: d, total: t, url } = msg as { type: string; done: number; total: number; url: string };
              setProgressDone(d);
              setProgressTotal(t);
              setProgressCurrent(url);
              setProgressLabel(`${d} / ${t} 검수 중...`);
              setProgress(Math.round((d / t) * 90) + 5);
            } else if (msg.type === "result") {
              setProgress(100); setProgressLabel("완료!");
              sessionStorage.setItem("lastAuditResult", JSON.stringify(msg.data));
              setTimeout(() => router.push("/result"), 300);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      setRunning(false); setProgress(0);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    }
  }

  // ── Running UI ─────────────────────────────────────────────────────────────
  if (running) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-center">
          <p className="text-base font-semibold text-gray-700 mb-1">KS X 3253:2016 접근성 검수 중</p>
          {isMulti ? (
            <>
              <p className="text-sm font-medium text-blue-700 mb-1">
                {progressDone} / {progressTotal} 페이지 완료
              </p>
              <p className="text-xs text-gray-400 truncate max-w-sm">
                {progressCurrent}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 truncate max-w-xs mb-1">
              {mode === "url" ? parsedUrls[0] : (file?.name ?? "")}
            </p>
          )}
          <p className="text-sm text-blue-600 font-medium mt-1">{progressLabel}</p>
        </div>

        <div className="w-full max-w-md">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>진행률</span><span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        {isMulti && progressTotal > 0 && (
          <div className="flex gap-1 flex-wrap justify-center max-w-sm">
            {Array.from({ length: progressTotal }, (_, i) => (
              <div key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i < progressDone ? "bg-blue-600" : "bg-gray-200"
                }`}
                title={`페이지 ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Form UI ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {(["url", "file"] as Mode[]).map((m) => (
          <button key={m} type="button"
            onClick={() => { setMode(m); setFile(null); setUrlText(""); setError(""); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {m === "url" ? "🔗 URL" : "📄 HTML 파일"}
          </button>
        ))}
      </div>

      {/* URL mode */}
      {mode === "url" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="url-input" className="block text-sm font-medium text-gray-700">
              검수할 URL
            </label>
            {parsedUrls.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                parsedUrls.length > 1
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {parsedUrls.length}개 URL 인식됨
              </span>
            )}
          </div>
          <textarea
            id="url-input"
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder={"https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3\n\n줄바꿈 또는 쉼표로 최대 30개 URL 입력\n(1개 입력 시 단일 검수, 2개 이상 시 멀티 검수)"}
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
          />
          {isMulti && (
            <p className="text-xs text-blue-700 mt-1">
              📊 멀티 검수: 페이지별 결과 + 사이트 종합 + 일관성 결함 분석 포함
            </p>
          )}
          <button type="submit" disabled={!canSubmit}
            className="mt-2 w-full px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {isMulti ? `🔍 ${parsedUrls.length}개 페이지 일괄 검수` : "검수 시작"}
          </button>
        </div>
      )}

      {/* File mode */}
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
        <p className="font-semibold">📋 KS X 3253:2016 · 34개 항목 (자동 12 · 수동 22) · 26개 룰</p>
        <p>URL 모드: HTML + 연결 CSS 자동 수집 → 색상 대비·포커스 포함 전체 검사</p>
        <p>멀티 URL: 최대 30개 · 페이지 간 일관성 결함 자동 감지</p>
        <p>파일 모드: 로컬 HTML 정적 분석 → CSS 룰 제외 (axe DevTools로 보완 권장)</p>
      </div>
    </form>
  );
}
