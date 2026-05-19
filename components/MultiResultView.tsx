"use client";

import { useState } from "react";
import type { MultiAuditResponse, KsItemResult, ConsistencyIssue } from "@/lib/types";
import { calculateScore } from "@/lib/audit/scoring";

// ── 판정 공통 상수 ────────────────────────────────────────────────────────────
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
  { key: "all",       label: (items) => `전체 (${items.length})` },
  { key: "fail-only", label: (items) => `부적합 (${items.filter(i => (i.userVerdict ?? i.verdict) === "fail").length})` },
  { key: "pending",   label: (items) => `미입력 (${items.filter(i => i.verdict === "manual" && !i.userVerdict).length})` },
  { key: "inspector", label: (items) => `검사자 판정 (${items.filter(i => !!i.userVerdict).length})` },
  { key: "auto-only", label: (items) => `자동만 (${items.filter(i => !i.userVerdict).length})` },
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

function pageLabel(source: string) {
  try {
    const u = new URL(source);
    return u.pathname.replace(/^\//, "").slice(0, 40) || u.hostname;
  } catch {
    return source.slice(-40);
  }
}

// ── 단일 KS 항목 카드 ─────────────────────────────────────────────────────────
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
      {hasUserVerdict && (
        <div className="absolute left-0 inset-y-0 w-1 bg-purple-400" />
      )}
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 pl-5 pr-4 py-3 text-left">
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
        {item.userVerdict ? (
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${VERDICT_CHIP[item.userVerdict]?.cls}`}>
            {VERDICT_CHIP[item.userVerdict]?.label} (수동)
          </span>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${chip.cls}`}>{chip.label}</span>
        )}
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

      {open && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3 space-y-3">
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

// ── 일관성 결함 카드 ──────────────────────────────────────────────────────────
function ConsistencyCard({ issue }: { issue: ConsistencyIssue }) {
  const [open, setOpen] = useState(false);
  const sevConfig = {
    high:   { cls: "border-red-200 bg-red-50",       badge: "bg-red-100 text-red-700",       icon: "🔴" },
    medium: { cls: "border-yellow-200 bg-yellow-50", badge: "bg-yellow-100 text-yellow-700", icon: "🟡" },
    low:    { cls: "border-gray-200 bg-gray-50",     badge: "bg-gray-100 text-gray-600",     icon: "🟢" },
  }[issue.severity];

  return (
    <div className={`border rounded-xl overflow-hidden ${sevConfig.cls}`}>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${sevConfig.badge}`}>
          {sevConfig.icon} {issue.severity === "high" ? "높음" : issue.severity === "medium" ? "중간" : "낮음"}
        </span>
        <span className="text-xs font-mono text-gray-400 shrink-0">{issue.ksCode}</span>
        <span className="text-sm font-medium text-gray-800 flex-1">{issue.ksName}</span>
        <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded shrink-0">
          {issue.type === "mixed-verdict" ? "판정 혼재" : issue.type === "structure" ? "구조 불일치" : "내비게이션"}
        </span>
        <span className="text-gray-400 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm text-gray-700">{issue.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-red-700 mb-1">❌ 부적합 페이지 ({issue.affectedPages.length})</p>
              <ul className="space-y-0.5">
                {issue.affectedPages.map((p) => (
                  <li key={p} className="text-xs text-gray-600 truncate">{pageLabel(p)}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-green-700 mb-1">✅ 적합 페이지 ({issue.passingPages.length})</p>
              <ul className="space-y-0.5">
                {issue.passingPages.map((p) => (
                  <li key={p} className="text-xs text-gray-600 truncate">{pageLabel(p)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 페이지 점수 바 차트 ────────────────────────────────────────────────────────
function ScoreBar({ score, label }: { score: number | null; label: string }) {
  const val = score ?? 0;
  const color = val >= 80 ? "bg-green-500" : val >= 60 ? "bg-yellow-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-36 shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${val}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${
        val >= 80 ? "text-green-700" : val >= 60 ? "text-yellow-700" : "text-red-700"
      }`}>
        {score !== null ? `${val}%` : "—"}
      </span>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function MultiResultView({
  data: initialData,
  onDownload,
  downloading,
  dlError,
}: {
  data: MultiAuditResponse;
  onDownload: () => void;
  downloading: boolean;
  dlError: string;
}) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<"pages" | "overview">("overview");
  const [selectedPageIdx, setSelectedPageIdx] = useState(0);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  function updateItemOnPage(pageIdx: number, code: string, patch: Partial<KsItemResult>) {
    setData((prev) => {
      const pages = prev.pages.map((p, i) => {
        if (i !== pageIdx) return p;
        return {
          ...p,
          ksItems: p.ksItems.map((item) =>
            item.code === code ? { ...item, ...patch } : item
          ),
        };
      });
      const updated = { ...prev, pages };
      sessionStorage.setItem("lastAuditResult", JSON.stringify(updated));
      return updated;
    });
  }

  const ov = data.overview;
  const selectedPage = data.pages[selectedPageIdx];
  const pageScore = selectedPage ? calculateScore(selectedPage.ksItems) : null;

  const pageItems = selectedPage?.ksItems ?? [];
  const visibleItems = applyQuickFilter(pageItems, quickFilter);

  // 카테고리별 그룹
  const allPageGrouped = pageItems.reduce<Record<string, KsItemResult[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});
  const visibleGrouped = visibleItems.reduce<Record<string, KsItemResult[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  // 진행 집계
  const inspectorCount = pageItems.filter(i => !!i.userVerdict).length;
  const autoCount = pageItems.filter(i => i.autoCheckable).length;
  const pendingCount = pageItems.filter(i => i.verdict === "manual" && !i.userVerdict).length;

  return (
    <div className="space-y-4">
      {/* 사이트 종합 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h1 className="text-base font-bold text-gray-900 mb-1">KS X 3253:2016 멀티 페이지 검수 결과</h1>
        <p className="text-xs text-gray-400 mb-4">
          {new Date(data.auditDate).toLocaleString("ko-KR")} · {ov.pageCount}개 페이지 검수
          {data.failed.length > 0 && ` · ⚠️ 실패 ${data.failed.length}개`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center sm:col-span-1">
            <p className={`text-2xl font-bold ${
              ov.overallScore >= 80 ? "text-green-600"
              : ov.overallScore >= 60 ? "text-yellow-600"
              : "text-red-600"
            }`}>{ov.overallScore}%</p>
            <p className="text-xs text-gray-500 mt-0.5">최저 적합률</p>
            <p className="text-[10px] text-gray-400 mt-1">엄격 기준 (strictest)</p>
          </div>
          {[
            { label: "✅ 사이트 적합",   value: ov.passCount,   color: "text-green-600" },
            { label: "❌ 사이트 부적합", value: ov.failCount,   color: "text-red-600" },
            { label: "⚠️ 검토필요",     value: ov.reviewCount, color: "text-yellow-600" },
            { label: "🔵 수동검사",     value: ov.manualCount, color: "text-blue-600" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 + 다운로드 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {([["overview", "📊 사이트 종합"], ["pages", "📋 페이지별 결과"]] as const).map(([tab, label]) => (
            <button key={tab} type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {dlError && <p className="text-xs text-red-600">{dlError}</p>}
          <button onClick={onDownload} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
            {downloading ? "⏳ 생성 중..." : "📥 엑셀 다운로드"}
          </button>
        </div>
      </div>

      {/* ── 탭: 사이트 종합 ──────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">페이지별 적합률</h2>
            <div className="space-y-2">
              {ov.pageScores.map((ps) => (
                <ScoreBar key={ps.source} score={ps.score} label={pageLabel(ps.source)} />
              ))}
              {data.failed.map((f) => (
                <div key={f.url} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-36 shrink-0 truncate">{pageLabel(f.url)}</span>
                  <span className="text-xs text-red-600 flex-1">⚠️ 검수 실패: {f.error}</span>
                </div>
              ))}
            </div>
          </div>

          {ov.worstItems.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">최다 부적합 항목 (상위 10)</h2>
              <div className="space-y-2">
                {ov.worstItems.map((w) => (
                  <div key={w.code}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
                    <span className="text-xs font-mono text-gray-400 w-14 shrink-0">{w.code}</span>
                    <span className="text-sm text-gray-800 flex-1">{w.name}</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full shrink-0 font-medium">
                      {w.failPageCount}/{ov.pageCount} 페이지
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">
              일관성 결함
              <span className="ml-2 text-xs font-normal text-gray-400">({data.consistency.length}건)</span>
            </h2>
            <p className="text-xs text-gray-500 mb-3">동일 KS 항목에서 페이지마다 다른 판정이 나온 경우</p>
            {data.consistency.length === 0 ? (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
                ✅ 모든 페이지에서 일관된 판정이 나왔습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {data.consistency.map((issue, i) => (
                  <ConsistencyCard key={i} issue={issue} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 탭: 페이지별 결과 ─────────────────────────────────────────────────── */}
      {activeTab === "pages" && (
        <div className="space-y-4">
          {/* 페이지 선택 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">페이지 선택</p>
            <div className="flex gap-2 flex-wrap">
              {data.pages.map((p, i) => {
                const s = calculateScore(p.ksItems);
                const val = s.rate ?? 0;
                return (
                  <button key={i} type="button"
                    onClick={() => { setSelectedPageIdx(i); setQuickFilter("all"); }}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1.5 ${
                      selectedPageIdx === i
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                    }`}>
                    <span className="truncate max-w-[120px]">{pageLabel(p.source)}</span>
                    <span className={`font-bold shrink-0 ${
                      selectedPageIdx === i ? "text-white"
                      : val >= 80 ? "text-green-600" : val >= 60 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {s.rate !== null ? `${val}%` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 선택 페이지 요약 */}
          {selectedPage && pageScore && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm font-bold text-gray-900 truncate mb-1">{selectedPage.source}</p>
              <p className="text-xs text-gray-400 mb-2">
                {new Date(selectedPage.auditDate).toLocaleString("ko-KR")} · CSS {selectedPage.cssAnalyzed ? "포함" : "미포함"}
              </p>
              {/* 진행 표시 */}
              <div className="mb-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-800 flex flex-wrap gap-x-3 gap-y-1 items-center">
                <span>진행:</span>
                <span>자동 <strong>{autoCount}</strong>건 + 검사자 <strong>{inspectorCount}</strong>건 / {pageItems.length}건</span>
                {pendingCount > 0 && <span className="text-amber-700 font-medium">· 미입력 {pendingCount}건</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${
                    (pageScore.rate ?? 0) >= 80 ? "text-green-600"
                    : (pageScore.rate ?? 0) >= 60 ? "text-yellow-600"
                    : "text-red-600"
                  }`}>
                    {pageScore.rate !== null ? `${pageScore.rate}%` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">적합률</p>
                </div>
                {[
                  { label: "✅ 적합",      value: pageScore.passed,       color: "text-green-600" },
                  { label: "❌ 부적합",    value: pageScore.failed,       color: "text-red-600" },
                  { label: "⚠️ 검토필요", value: pageScore.review,       color: "text-yellow-600" },
                  { label: "🔵 수동검사", value: pageScore.manualPending, color: "text-blue-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 빠른 필터 */}
          <div className="flex gap-1 flex-wrap">
            {QUICK_FILTERS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setQuickFilter(key)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  quickFilter === key ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {label(pageItems)}
              </button>
            ))}
          </div>

          {/* KS 항목 목록 (카테고리별) */}
          {Object.keys(allPageGrouped)
            .filter(cat => visibleGrouped[cat])
            .map((category) => {
              const catItems = allPageGrouped[category];
              const autoInCat = catItems.filter(i => i.autoCheckable).length;
              const manualInCat = catItems.filter(i => !i.autoCheckable).length;
              const inspectorInCat = catItems.filter(i => !!i.userVerdict).length;
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{category}</h2>
                    <span className="text-xs text-gray-400">
                      자동 {autoInCat}
                      {manualInCat > 0 && ` · 검사자 ${inspectorInCat}/${manualInCat}`}
                      {inspectorInCat > 0 && " ✍️"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {visibleGrouped[category].map((item) => (
                      <KsItemCard
                        key={item.code}
                        item={item}
                        onUserVerdict={(code, v) =>
                          updateItemOnPage(selectedPageIdx, code, {
                            userVerdict: v,
                            userInputAt: v ? new Date().toISOString() : undefined,
                          })
                        }
                        onUserMemo={(code, n) =>
                          updateItemOnPage(selectedPageIdx, code, { userMemo: n })
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}

          {visibleItems.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">해당 항목이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
