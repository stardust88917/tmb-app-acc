import AuditForm from "@/components/AuditForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">♿</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">T멤버십 접근성 검수</h1>
          <p className="text-sm text-gray-500 mt-1">KS X 3253:2016 기준 자동 검수 도구</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <AuditForm />
        </div>

        {/* KS Principles Info */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "👁", label: "인식의 용이성", count: 7 },
            { icon: "⌨️", label: "운용의 용이성", count: 9 },
            { icon: "💡", label: "이해의 용이성", count: 6 },
            { icon: "🔧", label: "견고성", count: 2 },
          ].map((p) => (
            <div
              key={p.label}
              className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm"
            >
              <p className="text-xl mb-1">{p.icon}</p>
              <p className="text-xs font-medium text-gray-700">{p.label}</p>
              <p className="text-xs text-gray-400">{p.count}개 항목</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          KS X 3253:2016 | axe-core + Playwright | ExcelJS
        </p>
      </div>
    </main>
  );
}
