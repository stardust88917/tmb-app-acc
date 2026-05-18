import { generateExcel, generateMultiExcel } from "@/lib/excel-generator";
import type { AuditResponse, MultiAuditResponse } from "@/lib/types";

export async function POST(request: Request) {
  let data: AuditResponse | MultiAuditResponse;
  try { data = await request.json(); }
  catch { return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 }); }

  if (!data) return Response.json({ error: "결과 데이터가 없습니다." }, { status: 400 });

  try {
    // ── Multi-page report ──────────────────────────────────────────────────
    if ("type" in data && data.type === "multi") {
      const multi = data as MultiAuditResponse;
      const buffer = await generateMultiExcel(multi);
      const dateStr = new Date(multi.auditDate).toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `a11y_multi_${multi.pages.length}pages_${dateStr}.xlsx`;
      return new Response(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }

    // ── Single-page report ─────────────────────────────────────────────────
    const single = data as AuditResponse;
    if (!single.ksItems || !Array.isArray(single.ksItems))
      return Response.json({ error: "결과 데이터가 없습니다." }, { status: 400 });

    const buffer = await generateExcel(single);
    let stem = "result";
    try { stem = new URL(single.source).hostname.replace(/\./g, "_"); }
    catch { stem = (single.source ?? "result").replace(/[^a-zA-Z0-9_\-가-힣]/g, "_").slice(0, 40); }
    const dateStr = new Date(single.auditDate).toISOString().slice(0, 10).replace(/-/g, "");
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
