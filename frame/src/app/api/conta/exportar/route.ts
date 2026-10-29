import { getViewer } from "@/server/session";
import { enforceRateLimit } from "@/server/rate-limit";
import { exportUserData } from "@/server/services/privacy";
import { toActionError, httpStatus } from "@/server/errors";

export const runtime = "nodejs";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return new Response("Entre na sua conta.", { status: 401 });
  try {
    await enforceRateLimit(`export:${viewer.id}`, 5, 3600);
  } catch (err) {
    const e = toActionError(err);
    return new Response(e.error, { status: httpStatus(e.code) });
  }
  const data = await exportUserData(viewer.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="frame-dados-${viewer.handle}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
