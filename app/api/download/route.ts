import { generateExcel } from "@/lib/excel-generator";
import type { AuditResult } from "@/lib/types";

export async function POST(request: Request) {
  let result: AuditResult;
  try {
    result = await request.json();
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  if (!result || !Array.isArray(result.ruleResults)) {
    return Response.json({ error: "결과 데이터가 없습니다." }, { status: 400 });
  }

  try {
    const buffer = await generateExcel(result);

    let stem = "result";
    try { stem = new URL(result.url).hostname.replace(/\./g, "_"); } catch {
      stem = (result.url ?? "result").replace(/[^a-zA-Z0-9_\-가-힣]/g, "_").slice(0, 40);
    }
    const dateStr = new Date(result.auditedAt).toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `a11y_${stem}_${dateStr}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    console.error("[download]", err);
    return Response.json({ error: "엑셀 생성 실패" }, { status: 500 });
  }
}
