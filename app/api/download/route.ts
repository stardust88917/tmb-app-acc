import { generateExcel } from "@/lib/excel-generator";
import type { AuditResponse } from "@/lib/types";

export async function POST(request: Request) {
  let data: AuditResponse;
  try { data = await request.json(); }
  catch { return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 }); }

  if (!data?.ksItems || !Array.isArray(data.ksItems))
    return Response.json({ error: "결과 데이터가 없습니다." }, { status: 400 });

  try {
    const buffer = await generateExcel(data);
    let stem = "result";
    try { stem = new URL(data.source).hostname.replace(/\./g, "_"); }
    catch { stem = (data.source ?? "result").replace(/[^a-zA-Z0-9_\-가-힣]/g, "_").slice(0, 40); }
    const dateStr = new Date(data.auditDate).toISOString().slice(0, 10).replace(/-/g, "");
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
