"use client";

import { useState } from "react";
import type { RuleResult } from "@/lib/types";

interface Props {
  ruleResults: RuleResult[];
}

const VERDICT_ICON: Record<string, string> = {
  적합: "✅", 부적합: "❌", 검토필요: "⚠️", 해당없음: "⬜",
};
const VERDICT_BG: Record<string, string> = {
  적합: "bg-green-50 border-green-100",
  부적합: "bg-red-50 border-red-200",
  검토필요: "bg-yellow-50 border-yellow-200",
  해당없음: "bg-gray-50 border-gray-100",
};
const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};
const PRIORITY_LABEL: Record<string, string> = {
  high: "🔴 높음", medium: "🟡 중간", low: "🟢 낮음",
};

type FilterType = "all" | "부적합" | "검토필요" | "적합";

export default function IssueList({ ruleResults }: Props) {
  const [filter, setFilter] = useState<FilterType>("부적합");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const counts = {
    all: ruleResults.length,
    부적합: ruleResults.filter((r) => r.verdict === "부적합").length,
    검토필요: ruleResults.filter((r) => r.verdict === "검토필요").length,
    적합: ruleResults.filter((r) => r.verdict === "적합").length,
  };

  const filtered =
    filter === "all" ? ruleResults : ruleResults.filter((r) => r.verdict === filter);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-gray-800">검수 항목 상세</h2>
        <div className="flex gap-1 flex-wrap">
          {(["부적합", "검토필요", "all", "적합"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                filter === f ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all"
                ? `전체 (${counts.all})`
                : `${VERDICT_ICON[f]} ${f} (${counts[f]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">해당 항목이 없습니다.</p>
        )}
        {filtered.map((r) => (
          <div key={r.ruleId} className={`border rounded-xl overflow-hidden ${VERDICT_BG[r.verdict]}`}>
            {/* Header row */}
            <button
              onClick={() => toggle(r.ruleId)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <span>{VERDICT_ICON[r.verdict]}</span>
              <span className="text-xs font-mono text-gray-400 w-12 shrink-0">{r.ksCode}</span>
              <span className="text-sm font-medium text-gray-800 flex-1">{r.ksName}</span>
              {r.issues.length > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {r.issues.length}건
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_BADGE[r.priority]}`}>
                {PRIORITY_LABEL[r.priority]}
              </span>
              {r.isBestPractice && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Best Practice
                </span>
              )}
              <span className="text-gray-400 text-xs">{expanded.has(r.ruleId) ? "▲" : "▼"}</span>
            </button>

            {/* Expanded issues */}
            {expanded.has(r.ruleId) && (
              <div className="border-t border-gray-200 px-4 pb-4 pt-3 space-y-3">
                {r.notes && (
                  <p className="text-xs text-gray-500 italic">{r.notes}</p>
                )}
                {r.issues.length === 0 && (
                  <p className="text-xs text-gray-400">이슈 없음.</p>
                )}
                {r.issues.slice(0, 5).map((issue, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 space-y-1.5">
                    <div className="flex items-start gap-2 flex-wrap">
                      <code className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded break-all">
                        {issue.selector}
                      </code>
                    </div>
                    <p className="text-xs text-gray-700">{issue.message}</p>
                    {issue.html && (
                      <pre className="text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                        {issue.html.slice(0, 250)}
                      </pre>
                    )}
                    <p className="text-xs text-blue-600">
                      💡 {issue.suggestion}
                    </p>
                  </div>
                ))}
                {r.issues.length > 5 && (
                  <p className="text-xs text-gray-400">
                    ... 외 {r.issues.length - 5}건 (엑셀 다운로드에서 전체 확인)
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
