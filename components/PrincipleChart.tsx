import type { PrincipleSummary } from "@/lib/types";

interface Props {
  principles: PrincipleSummary[];
}

const PRINCIPLE_COLORS: Record<string, string> = {
  "인식의 용이성": "bg-purple-500",
  "운용의 용이성": "bg-blue-500",
  "이해의 용이성": "bg-teal-500",
  "견고성": "bg-orange-500",
};

const PRINCIPLE_ICON: Record<string, string> = {
  "인식의 용이성": "👁",
  "운용의 용이성": "⌨️",
  "이해의 용이성": "💡",
  "견고성": "🔧",
};

export default function PrincipleChart({ principles }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">원칙별 적합률</h2>
      <div className="space-y-4">
        {principles.map((p) => (
          <div key={p.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-700">
                {PRINCIPLE_ICON[p.name]} {p.name}
              </span>
              <span className="text-sm font-semibold text-gray-800">{p.score}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full ${PRINCIPLE_COLORS[p.name] ?? "bg-gray-400"} transition-all duration-700`}
                  style={{ width: `${p.score}%` }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-1 text-xs text-gray-400">
              <span>적합 {p.pass}</span>
              <span>부적합 {p.fail}</span>
              <span>검토 {p.review}</span>
              <span>해당없음 {p.na}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
