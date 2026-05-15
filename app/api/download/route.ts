import { getResult } from "@/lib/result-store";
import { generateExcel } from "@/lib/excel-generator";

export async function POST(request: Request) {
  let id: string;

  try {
    const body = await request.json();
    id = body.id?.trim();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!id) {
    return Response.json({ error: "Result ID is required" }, { status: 400 });
  }

  const result = getResult(id);
  if (!result) {
    return Response.json({ error: "Result not found or expired" }, { status: 404 });
  }

  try {
    const buffer = await generateExcel(result);
    const hostname = new URL(result.url).hostname.replace(/\./g, "_");
    const dateStr = new Date(result.auditedAt)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const filename = `a11y_${hostname}_${dateStr}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Excel generation failed";
    console.error("[download]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
