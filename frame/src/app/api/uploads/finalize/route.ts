import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, httpStatus, toActionError } from "@/server/errors";
import { requireViewer } from "@/server/session";
import { finalizeDirectUpload } from "@/server/services/media";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  pathname: z.string().min(1).max(300),
  purpose: z.enum(["post", "avatar", "cover", "showcase_before"]),
  alt: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    const viewer = await requireViewer();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION", "Requisição inválida.");
    const stored = await finalizeDirectUpload({ ownerId: viewer.id, ...parsed.data });
    return NextResponse.json({ ok: true, media: stored }, { status: 201 });
  } catch (err) {
    const e = toActionError(err);
    return NextResponse.json(e, { status: httpStatus(e.code) });
  }
}
