import type { AuditResult } from "@/lib/types";

interface Props {
  result: AuditResult;
}

export default function ScoreCard({ result }: Props) {
  const { overallScore, passCount, failCount, reviewCount, naCount, url, auditedAt } = result;

  const scoreColor =
    overallScore >= 90
      ? "text-green-600"
      : overallScore >= 70
        ? "text-yellow-600"
        : "text-red-600";

  const scoreRing =
    overallScore >= 90
      ? "stroke-green-500"
      : overallScore >= 70
        ? "stroke-yellow-500"
        : "stroke-red-500";

  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - overallScore / 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut score */}
        <div className="relative shrink-0">
          <svg width="130" height="130" className="-rotate-90">
            <circle cx="65" cy="65" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="65"
              cy="65"
              r="54"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`${scoreRing} transition-all duration-700`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${scoreColor}`}>{overallScore}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 truncate mb-1">{url}</p>
          <p className="text-xs text-gray-400 mb-4">
            {new Date(auditedAt).toLocaleString("ko-KR")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="✅ 적합" value={passCount} color="text-green-600" />
            <Stat label="❌ 부적합" value={failCount} color="text-red-600" />
            <Stat label="⚠️ 검토필요" value={reviewCount} color="text-yellow-600" />
            <Stat label="⬜ 해당없음" value={naCount} color="text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
