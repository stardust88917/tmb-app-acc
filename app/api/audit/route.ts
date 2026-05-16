import { runAudit } from "@/lib/runner";
import { saveResult } from "@/lib/result-store";

export const maxDuration = 30;

export async function POST(request: Request) {
  let url: string;
  try {
    const body = await request.json();
    url = (body.url ?? "").trim();
  } catch {
    return Response.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  if (!url) {
    return Response.json({ error: "URL을 입력하세요." }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return Response.json({ error: "올바른 URL 형식이 아닙니다." }, { status: 400 });
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return Response.json({ error: "http:// 또는 https://로 시작하는 URL을 입력하세요." }, { status: 400 });
  }

  try {
    const result = await runAudit(url);
    saveResult(result);
    return Response.json({ id: result.id, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "검수 실패";
    console.error("[audit]", err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
