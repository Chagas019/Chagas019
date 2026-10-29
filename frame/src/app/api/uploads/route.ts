import { NextResponse } from "next/server";
import { AppError, httpStatus, toActionError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireViewer } from "@/server/session";
import { storeUpload, VIDEO_MAX_BYTES, type MediaPurpose } from "@/server/services/media";

export const runtime = "nodejs";

const PURPOSES: MediaPurpose[] = ["post", "avatar", "cover", "showcase_before"];

/** Recebe um arquivo por requisição (multipart), valida e armazena. Retorna o id da mídia. */
export async function POST(req: Request) {
  try {
    const viewer = await requireViewer();
    await enforceRateLimit(`upload:${viewer.id}`, 60, 600);
    const length = Number(req.headers.get("content-length") ?? 0);
    if (length > VIDEO_MAX_BYTES + 1024 * 1024) throw new AppError("VALIDATION", "Arquivo grande demais.");
    const form = await req.formData();
    const file = form.get("file");
    const purpose = String(form.get("purpose") ?? "post") as MediaPurpose;
    if (!(file instanceof File)) throw new AppError("VALIDATION", "Nenhum arquivo enviado.");
    if (!PURPOSES.includes(purpose)) throw new AppError("VALIDATION", "Destino de upload inválido.");
    const data = Buffer.from(await file.arrayBuffer());
    const stored = await storeUpload({
      ownerId: viewer.id,
      purpose,
      data,
      alt: String(form.get("alt") ?? "").slice(0, 300),
      allowVideo: purpose === "post",
    });
    return NextResponse.json({ ok: true, media: stored }, { status: 201 });
  } catch (err) {
    const e = toActionError(err);
    return NextResponse.json(e, { status: httpStatus(e.code) });
  }
}
