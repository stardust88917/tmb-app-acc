import type { AuditResult } from "@/lib/types";

export default function ScoreCard({ result }: { result: AuditResult }) {
  const { overallScore, passCount, failCount, reviewCount, naCount, url, auditedAt } = result;

  const scoreColor = overallScore >= 90 ? "text-green-600" : overallScore >= 70 ? "text-yellow-600" : "text-red-600";
  const strokeColor = overallScore >= 90 ? "stroke-green-500" : overallScore >= 70 ? "stroke-yellow-500" : "stroke-red-500";
  const C = 2 * Math.PI * 54;
  const offset = C * (1 - overallScore / 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width="130" height="130" className="-rotate-90">
            <circle cx="65" cy="65" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle cx="65" cy="65" r="54" fill="none" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset}
              className={`${strokeColor} transition-all duration-700`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${scoreColor}`}>{overallScore}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 truncate mb-1">{url}</p>
          <p className="text-xs text-gray-400 mb-1">
            {new Date(auditedAt).toLocaleString("ko-KR")}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            정적 분석 (fetch + cheerio) — 동적 렌더링 콘텐츠는 별도 검사 필요
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "✅ 적합", value: passCount, color: "text-green-600" },
              { label: "❌ 부적합", value: failCount, color: "text-red-600" },
              { label: "⚠️ 검토필요", value: reviewCount, color: "text-yellow-600" },
              { label: "⬜ 해당없음", value: naCount, color: "text-gray-400" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
