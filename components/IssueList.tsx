"use client";

import { useState } from "react";
import type { KsCheckResult } from "@/lib/types";

interface Props {
  ksResults: KsCheckResult[];
}

const VERDICT_ICONS: Record<string, string> = {
  "적합": "✅",
  "부적합": "❌",
  "검토필요": "⚠️",
  "해당없음": "⬜",
};

const VERDICT_BG: Record<string, string> = {
  "적합": "bg-green-50 border-green-100",
  "부적합": "bg-red-50 border-red-200",
  "검토필요": "bg-yellow-50 border-yellow-200",
  "해당없음": "bg-gray-50 border-gray-100",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "🔴 높음",
  medium: "🟡 중간",
  low: "🟢 낮음",
};

type FilterType = "all" | "부적합" | "검토필요" | "적합";

export default function IssueList({ ksResults }: Props) {
  const [filter, setFilter] = useState<FilterType>("부적합");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filtered = ksResults.filter((r) => {
    if (filter === "all") return true;
    return r.verdict === filter;
  });

  function toggleExpand(code: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const counts = {
    all: ksResults.length,
    부적합: ksResults.filter((r) => r.verdict === "부적합").length,
    검토필요: ksResults.filter((r) => r.verdict === "검토필요").length,
    적합: ksResults.filter((r) => r.verdict === "적합").length,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">검수 항목 상세</h2>
        <div className="flex gap-1">
          {(["부적합", "검토필요", "all", "적합"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                filter === f
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? `전체 (${counts.all})` : `${VERDICT_ICONS[f]} ${f} (${counts[f]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">해당 항목이 없습니다.</p>
        )}
        {filtered.map((r) => (
          <div
            key={r.code}
            className={`border rounded-xl overflow-hidden ${VERDICT_BG[r.verdict]}`}
          >
            <button
              onClick={() => toggleExpand(r.code)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <span className="text-base">{VERDICT_ICONS[r.verdict]}</span>
              <span className="text-xs font-mono text-gray-400 shrink-0 w-12">{r.code}</span>
              <span className="text-sm font-medium text-gray-800 flex-1">{r.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[r.priority]}`}
              >
                {PRIORITY_LABEL[r.priority]}
              </span>
              {r.isBestPractice && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Best Practice
                </span>
              )}
              <span className="text-gray-400 text-xs ml-1">
                {expandedIds.has(r.code) ? "▲" : "▼"}
              </span>
            </button>

            {expandedIds.has(r.code) && r.issues.length > 0 && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3">
                {r.issues.map((issue, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-xs text-gray-500">{issue.description}</p>
                    {issue.nodes.slice(0, 3).map((node, j) => (
                      <div
                        key={j}
                        className="bg-white rounded-lg p-3 border border-gray-200 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {node.target.join(" → ")}
                          </span>
                        </div>
                        <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap break-all">
                          {truncate(node.html, 300)}
                        </pre>
                        {node.failureSummary && (
                          <p className="text-xs text-red-600 mt-1">
                            {node.failureSummary.replace(/\n/g, " ")}
                          </p>
                        )}
                      </div>
                    ))}
                    {issue.nodes.length > 3 && (
                      <p className="text-xs text-gray-400">
                        ... 외 {issue.nodes.length - 3}개 이슈 (엑셀에서 확인)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}
