"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditResponse, KsItemResult, MultiAuditResponse } from "@/lib/types";
import { calculateScore } from "@/lib/audit/scoring";
import MultiResultView from "@/components/MultiResultView";

// ── 뱃지 헬퍼 ──────────────────────────────────────────────────────────────
const VERDICT_CHIP: Record<string, { label: string; cls: string }> = {
  pass:   { label: "✅ 적합",     cls: "bg-green-100 text-green-800" },
  fail:   { label: "❌ 부적합",   cls: "bg-red-100 text-red-800" },
  review: { label: "⚠️ 검토필요", cls: "bg-yellow-100 text-yellow-800" },
  manual: { label: "🔵 수동검사", cls: "bg-blue-100 text-blue-800" },
  na:     { label: "⬜ 해당없음", cls: "bg-gray-100 text-gray-500" },
};
const CONF_CHIP: Record<string, string> = {
  high: "bg-red-50 text-red-700", medium: "bg-yellow-50 text-yellow-700", low: "bg-gray-100 text-gray-500",
};
const USER_OPTIONS = [
  { value: "pass",   label: "✅ 적합" },
  { value: "fail",   label: "❌ 부적합" },
  { value: "review", label: "⚠️ 검토필요" },
  { value: "na",     label: "⬜ 해당없음" },
] as const;

type QuickFilter = "all" | "auto-only" | "inspector" | "pending" | "fail-only";
const QUICK_FILTERS: { key: QuickFilter; label: (items: KsItemResult[]) => string }[] = [
  { key: "all",        label: (items) => `전체 (${items.length})` },
  { key: "fail-only",  label: (items) => `부적합 (${items.filter(i => (i.userVerdict ?? i.verdict) === "fail").length})` },
  { key: "pending",    label: (items) => `미입력 (${items.filter(i => i.verdict === "manual" && !i.userVerdict).length})` },
  { key: "inspector",  label: (items) => `검사자 판정 (${items.filter(i => !!i.userVerdict).length})` },
  { key: "auto-only",  label: (items) => `자동만 (${items.filter(i => !i.userVerdict).length})` },
];

function applyQuickFilter(items: KsItemResult[], f: QuickFilter): KsItemResult[] {
  switch (f) {
    case "all":       return items;
    case "fail-only": return items.filter(i => (i.userVerdict ?? i.verdict) === "fail");
    case "pending":   return items.filter(i => i.verdict === "manual" && !i.userVerdict);
    case "inspector": return items.filter(i => !!i.userVerdict);
    case "auto-only": return items.filter(i => !i.userVerdict);
  }
}

// ── 개별 항목 카드 ──────────────────────────────────────────────────────────
function KsItemCard({
  item,
  onUserVerdict,
  onUserMemo,
}: {
  item: KsItemResult;
  onUserVerdict: (code: string, v: "pass" | "fail" | "review" | "na" | undefined) => void;
  onUserMemo: (code: string, n: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const chip = VERDICT_CHIP[item.verdict] ?? VERDICT_CHIP.na;
  const hasUserVerdict = !!item.userVerdict;
  const hasMemo = !!(item.userMemo?.trim());

  const borderCls = item.verdict === "fail"   ? "border-red-200 bg-red-50"
    : item.verdict === "review" ? "border-yellow-200 bg-yellow-50"
    : item.verdict === "manual" ? "border-blue-200 bg-blue-50"
    : "border-gray-100 bg-white";

  return (
    <div className={`relative border rounded-xl overflow-hidden ${borderCls}`}>
      {/* 검사자 판정 표시 — 보라색 좌측 strip */}
      {hasUserVerdict && (
        <div className="absolute left-0 inset-y-0 w-1 bg-purple-400" />
      )}

      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 pl-5 pr-4 py-3 text-left"
      >
        <span className="text-xs font-mono text-gray-400 w-14 shrink-0">{item.code}</span>
        <span className="text-sm font-medium text-gray-800 flex-1 min-w-0 truncate">{item.name}</span>

        {item.violations.length > 0 && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full shrink-0">
            {item.violations.length}건
          </span>
        )}
        {item.cssRequired && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full shrink-0">CSS 미포함</span>
        )}
        {item.confidence && (
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${CONF_CHIP[item.confidence]}`}>
            신뢰도 {item.confidence}
          </span>
        )}

        {/* 자동 또는 검사자 판정 뱃지 */}
        {item.userVerdict ? (
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${VERDICT_CHIP[item.userVerdict]?.cls}`}>
            {VERDICT_CHIP[item.userVerdict]?.label} (수동)
          </span>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${chip.cls}`}>{chip.label}</span>
        )}

        {/* 검사자 입력 아이콘 */}
        {hasUserVerdict && <span className="text-xs shrink-0" title="검사자 판정 완료">✍️</span>}
        {hasMemo && (
          <span className="relative group shrink-0">
            <span className="text-xs cursor-default" title={item.userMemo}>📝</span>
            <span className="absolute right-0 bottom-full mb-1 w-52 bg-gray-800 text-white text-xs rounded-lg p-2 hidden group-hover:block z-20 whitespace-pre-wrap leading-relaxed">
              {(item.userMemo ?? "").slice(0, 120)}{(item.userMemo?.length ?? 0) > 120 ? "…" : ""}
            </span>
          </span>
        )}

        <span className="text-gray-400 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {/* Detail */}
      {open && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3 space-y-3">
          {/* KS 기준 */}
          {(item.criteriaPass || item.criteriaFail) && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
              <p className="text-xs font-semibold text-gray-700">📖 KS X 3253 검수 기준</p>
              {item.criteriaPass && (
                <div>
                  <p className="text-xs font-medium text-green-700 mb-0.5">✅ 적합 기준</p>
                  <p className="text-xs text-gray-600 whitespace-pre-line">{item.criteriaPass}</p>
                </div>
              )}
              {item.criteriaFail && item.criteriaFail !== "-" && (
                <div>
                  <p className="text-xs font-medium text-red-700 mb-0.5">❌ 부적합 사례</p>
                  <p className="text-xs text-gray-600 whitespace-pre-line">{item.criteriaFail}</p>
                </div>
              )}
              {item.note && <p className="text-xs text-gray-400 italic">📌 {item.note}</p>}
            </div>
          )}

          {/* 수동/반자동 검사 가이드 */}
          {item.manualGuide && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-800">
                {item.manualGuide.classification === "semi-auto" ? "🔀 반자동 검사 가이드" : "📋 수동 검사 가이드"}
              </p>
              <p className="text-xs text-blue-700 whitespace-pre-line">{item.manualGuide.method}</p>
              <p className="text-xs text-blue-600">🔧 도구: {item.manualGuide.tools.join(", ")}</p>
              {item.manualGuide.platformHints.ios && (
                <p className="text-xs text-gray-500">🍎 iOS: {item.manualGuide.platformHints.ios}</p>
              )}
              {item.manualGuide.platformHints.android && (
                <p className="text-xs text-gray-500">🤖 Android: {item.manualGuide.platformHints.android}</p>
              )}
            </div>
          )}

          {/* 자동 검사 위반 목록 */}
          {item.violations.length === 0 && item.autoCheckable && (
            <p className="text-xs text-gray-400">위반 없음.</p>
          )}
          {item.violations.slice(0, 5).map((v, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 space-y-1">
              <code className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded break-all">{v.selector}</code>
              <p className="text-xs text-gray-700">{v.message}</p>
              {v.snippet && (
                <pre className="text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {v.snippet.slice(0, 200)}
                </pre>
              )}
            </div>
          ))}
          {item.violations.length > 5 && (
            <p className="text-xs text-gray-400">… 외 {item.violations.length - 5}건 (엑셀에서 전체 확인)</p>
          )}

          {/* 검사자 판정 입력 */}
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-600">✏️ 검사자 판정</p>
            <div className="flex gap-2 flex-wrap">
              {USER_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => onUserVerdict(item.code, item.userVerdict === opt.value ? undefined : opt.value)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    item.userVerdict === opt.value
                      ? "border-purple-700 bg-purple-700 text-white"
                      : "border-gray-300 text-gray-600 hover:border-purple-400"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea
              value={item.userMemo ?? ""}
              onChange={(e) => onUserMemo(item.code, e.target.value)}
              placeholder="검사 메모 (선택) — 입력 시 📝 아이콘으로 표시됩니다"
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
            />
            {item.userInputAt && (
              <p className="text-[10px] text-gray-400">
                판정 입력: {new Date(item.userInputAt).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 결과 페이지 ────────────────────────────────────────────────────────
export default function ResultPage() {
  const router = useRouter();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [multiData, setMultiData] = useState<MultiAuditResponse | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");
  const [filterPrinciple, setFilterPrinciple] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  useEffect(() => {
    const raw = sessionStorage.getItem("lastAuditResult");
    if (!raw) { router.push("/"); return; }
    try {
      const parsed = JSON.parse(raw);
      if ("type" in parsed && parsed.type === "multi") {
        setMultiData(parsed as MultiAuditResponse);
      } else {
        setData(parsed as AuditResponse);
      }
    }
    catch { router.push("/"); }
  }, [router]);

  function updateItem(code: string, patch: Partial<KsItemResult>) {
    setData((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        ksItems: prev.ksItems.map((item) =>
          item.code === code ? { ...item, ...patch } : item
        ),
      };
      sessionStorage.setItem("lastAuditResult", JSON.stringify(updated));
      return updated;
    });
  }

  async function handleDownload() {
    // sessionStorage는 MultiResultView·updateItem 양쪽이 매 변경 시 즉시 동기화함.
    // multiData/data 상태는 MultiResultView 내부 변경을 반영하지 못하므로
    // 항상 sessionStorage에서 최신 페이로드를 읽어 전송한다.
    let payload: AuditResponse | MultiAuditResponse | null = null;
    try {
      const raw = sessionStorage.getItem("lastAuditResult");
      if (raw) payload = JSON.parse(raw) as AuditResponse | MultiAuditResponse;
    } catch { /* ignore */ }
    payload ??= multiData ?? data;
    if (!payload) return;
    setDownloading(true);
    setDlError("");
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "실패"); }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename\*=UTF-8''(.+)/);
      const filename = match ? decodeURIComponent(match[1]) : `a11y_${Date.now()}.xlsx`;
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

  if (!data && !multiData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  // ── Multi-page result ────────────────────────────────────────────────────
  if (multiData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button onClick={() => router.push("/")}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              ← 새 검수
            </button>
          </div>
          <MultiResultView
            data={multiData}
            onDownload={handleDownload}
            downloading={downloading}
            dlError={dlError}
          />
          <p className="text-center text-xs text-gray-400 pb-4">
            KS X 3253:2016 · 34개 항목 (자동 12 · 수동 22) · 26개 룰 · fetch + cheerio
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ── Single-page result ───────────────────────────────────────────────────
  const score = calculateScore(data.ksItems);
  const rateVal = score.rate;
  const rateColor = rateVal === null ? "text-gray-400"
    : rateVal >= 80 ? "text-green-600"
    : rateVal >= 60 ? "text-yellow-600"
    : "text-red-600";

  // 상단 진행 집계
  const autoCount = data.ksItems.filter(i => i.autoCheckable).length;
  const inspectorCount = data.ksItems.filter(i => !!i.userVerdict).length;
  const pendingCount = data.ksItems.filter(i => i.verdict === "manual" && !i.userVerdict).length;

  // 필터링
  const principles = ["all", ...Array.from(new Set(data.ksItems.map((i) => i.principle)))];
  const afterPrinciple = filterPrinciple === "all"
    ? data.ksItems
    : data.ksItems.filter(i => i.principle === filterPrinciple);
  const visible = applyQuickFilter(afterPrinciple, quickFilter);

  // 카테고리별 그룹 (표시용 + 전체 통계용)
  const allGrouped = data.ksItems.reduce<Record<string, KsItemResult[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});
  const visibleGrouped = visible.reduce<Record<string, KsItemResult[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← 새 검수
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            {dlError && <p className="text-xs text-red-600">{dlError}</p>}
            <button onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              {downloading ? "⏳ 생성 중..." : "📥 엑셀 다운로드"}
            </button>
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h1 className="text-base font-bold text-gray-900 mb-1">KS X 3253:2016 접근성 검수 결과</h1>
          <p className="text-sm text-gray-500 truncate mb-1">{data.source}</p>
          <p className="text-xs text-gray-400 mb-3">
            {new Date(data.auditDate).toLocaleString("ko-KR")} ·{" "}
            {data.inputMode === "url" ? "URL 모드" : "파일 모드"} ·{" "}
            CSS {data.cssAnalyzed ? "포함" : "미포함"}
          </p>

          {/* 진행 표시 */}
          <div className="mb-4 px-3 py-2 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-800 flex flex-wrap gap-x-3 gap-y-1 items-center">
            <span>진행:</span>
            <span>자동 <strong>{autoCount}</strong>건</span>
            <span>+ 검사자 <strong>{inspectorCount}</strong>건</span>
            <span className="text-gray-400">/ {data.ksItems.length}건 전체</span>
            {pendingCount > 0 && (
              <span className="text-amber-700 font-medium">· 미입력 {pendingCount}건</span>
            )}
            <span className="ml-auto font-medium">
              종합 적합률{" "}
              <span className={rateColor}>
                {rateVal !== null ? `${rateVal}%` : "—"}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center sm:col-span-1">
              <p className={`text-2xl font-bold ${rateColor}`}>
                {rateVal !== null ? `${rateVal}%` : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">종합 적합률</p>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                ⓘ {score.formula}<br />검토·해당없음·미검사 제외
              </p>
            </div>
            {[
              { label: "✅ 적합",      value: score.passed,       color: "text-green-600" },
              { label: "❌ 부적합",    value: score.failed,       color: "text-red-600" },
              { label: "⚠️ 검토필요", value: score.review,       color: "text-yellow-600" },
              { label: "🔵 수동검사", value: score.manualPending, color: "text-blue-600" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <select value={filterPrinciple} onChange={(e) => setFilterPrinciple(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
            {principles.map((p) => (
              <option key={p} value={p}>{p === "all" ? "전체 원칙" : p}</option>
            ))}
          </select>
          <div className="flex gap-1 flex-wrap">
            {QUICK_FILTERS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setQuickFilter(key)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  quickFilter === key
                    ? "bg-gray-800 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {label(afterPrinciple)}
              </button>
            ))}
          </div>
        </div>

        {/* KS items grouped by category */}
        {Object.keys(allGrouped)
          .filter(cat => visibleGrouped[cat])
          .map((category) => {
            const catItems = allGrouped[category];
            const autoInCat = catItems.filter(i => i.autoCheckable).length;
            const manualInCat = catItems.filter(i => !i.autoCheckable).length;
            const inspectorInCat = catItems.filter(i => !!i.userVerdict).length;
            const hasInspectorWork = inspectorInCat > 0;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {category}
                  </h2>
                  <span className="text-xs text-gray-400">
                    자동 {autoInCat}
                    {manualInCat > 0 && ` · 검사자 ${inspectorInCat}/${manualInCat}`}
                    {hasInspectorWork && " ✍️"}
                  </span>
                </div>
                <div className="space-y-2">
                  {visibleGrouped[category].map((item) => (
                    <KsItemCard
                      key={item.code}
                      item={item}
                      onUserVerdict={(code, v) => updateItem(code, {
                        userVerdict: v,
                        userInputAt: v ? new Date().toISOString() : undefined,
                      })}
                      onUserMemo={(code, n) => updateItem(code, { userMemo: n })}
                    />
                  ))}
                </div>
              </div>
            );
          })}

        {visible.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">해당 항목이 없습니다.</p>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          KS X 3253:2016 · 34개 항목 (자동 12 · 수동 22) · 26개 룰 · fetch + cheerio
        </p>
      </div>
    </div>
  );
}
