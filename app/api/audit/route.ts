import { runAudit } from "@/lib/auditor";
import { saveResult } from "@/lib/result-store";

export const maxDuration = 60;

export async function POST(request: Request) {
  let url: string;

  try {
    const body = await request.json();
    url = body.url?.trim();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url) {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return Response.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return Response.json(
      { error: "URL must start with http:// or https://" },
      { status: 400 }
    );
  }

  try {
    const result = await runAudit(url);
    saveResult(result);
    return Response.json({ id: result.id, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit failed";
    console.error("[audit]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
