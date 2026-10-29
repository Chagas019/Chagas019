import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { AppError, httpStatus, toActionError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireViewer } from "@/server/session";
import { incomingPrefix, VIDEO_MAX_BYTES } from "@/server/services/media";

export const runtime = "nodejs";

/**
 * Emite um token de envio direto para o Vercel Blob (privado).
 * O navegador só pode gravar em incoming/<seu-id>/ e só tipos de mídia aceitos;
 * o arquivo é validado e processado depois em /api/uploads/finalize.
 */
export async function POST(req: Request) {
  if (process.env.STORAGE_DRIVER !== "blob") {
    return NextResponse.json({ ok: false, error: "Envio direto indisponível neste ambiente." }, { status: 404 });
  }
  try {
    const body = (await req.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const viewer = await requireViewer();
        await enforceRateLimit(`upload:${viewer.id}`, 60, 600);
        if (!pathname.startsWith(incomingPrefix(viewer.id)) || pathname.includes("..")) throw new AppError("FORBIDDEN");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/quicktime", "video/webm"],
          maximumSizeInBytes: VIDEO_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const e = toActionError(err);
    return NextResponse.json(e, { status: httpStatus(e.code) });
  }
}
