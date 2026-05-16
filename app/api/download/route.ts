import { getResult } from "@/lib/result-store";
import { generateExcel } from "@/lib/excel-generator";

export async function POST(request: Request) {
  let id: string;
  try {
    const body = await request.json();
    id = (body.id ?? "").trim();
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  if (!id) {
    return Response.json({ error: "결과 ID가 필요합니다." }, { status: 400 });
  }

  const result = getResult(id);
  if (!result) {
    return Response.json({ error: "결과를 찾을 수 없거나 만료됐습니다." }, { status: 404 });
  }

  try {
    const buffer = await generateExcel(result);
    let hostname = "";
    try { hostname = new URL(result.url).hostname.replace(/\./g, "_"); } catch { hostname = "result"; }
    const dateStr = new Date(result.auditedAt).toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `a11y_${hostname}_${dateStr}.xlsx`;

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
