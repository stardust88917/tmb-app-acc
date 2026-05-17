import { runAuditFromUrl, runAuditFromHtml } from "@/lib/audit/rule-runner";

export const maxDuration = 30;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  // ── File upload mode ──────────────────────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try { formData = await request.formData(); }
    catch { return Response.json({ error: "폼 데이터를 읽을 수 없습니다." }, { status: 400 }); }

    const file = formData.get("file");
    if (!file || !(file instanceof File))
      return Response.json({ error: "HTML 파일을 선택하세요." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return Response.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });

    try {
      const html = await file.text();
      const result = await runAuditFromHtml(html, file.name);
      return Response.json(result);
    } catch (err) {
      console.error("[audit/file]", err);
      return Response.json({ error: err instanceof Error ? err.message : "검수 실패" }, { status: 500 });
    }
  }

  // ── URL mode ──────────────────────────────────────────────────────────────
  let url: string;
  try {
    const body = await request.json();
    url = (body.url ?? "").trim();
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  if (!url) return Response.json({ error: "URL을 입력하세요." }, { status: 400 });
  if (!url.startsWith("http://") && !url.startsWith("https://"))
    return Response.json({ error: "http(s)://로 시작하는 URL을 입력하세요." }, { status: 400 });

  try {
    const result = await runAuditFromUrl(url);
    return Response.json(result);
  } catch (err) {
    console.error("[audit/url]", err);
    return Response.json({ error: err instanceof Error ? err.message : "검수 실패" }, { status: 500 });
  }
}
