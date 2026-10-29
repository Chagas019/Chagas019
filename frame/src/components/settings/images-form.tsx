"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { uploadFile } from "@/components/post/uploader";
import { setProfileImageAction } from "@/server/actions/profile";

export function ImagesForm({ name, avatar, cover, ownerId }: { name: string; avatar: string | null; cover: string | null; ownerId: string }) {
  const [busy, setBusy] = useState<"avatar" | "cover" | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  async function handle(which: "avatar" | "cover", file: File | undefined) {
    if (!file) return;
    setBusy(which);
    try {
      const { id } = await uploadFile(file, which, () => {}, ownerId);
      const r = await setProfileImageAction(which, id);
      toast.show(r.ok ? (r.message ?? "Atualizado.") : r.error, r.ok ? "success" : "error");
      router.refresh();
    } catch (err) {
      toast.show((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-3xl">Imagens</h2>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-4">
          <Avatar mediaId={avatar} name={name} size={80} />
          <button type="button" onClick={() => avatarRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-ink-750 px-4 py-2 text-sm hover:bg-ink-700" disabled={!!busy}>
            {busy === "avatar" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />} Trocar foto
          </button>
        </div>
        <button type="button" onClick={() => coverRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-ink-750 px-4 py-2 text-sm hover:bg-ink-700" disabled={!!busy}>
          {busy === "cover" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />} {cover ? "Trocar capa" : "Adicionar capa"}
        </button>
      </div>
      <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" aria-label="Arquivo da foto de perfil" onChange={(e) => handle("avatar", e.target.files?.[0])} />
      <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" aria-label="Arquivo da capa" onChange={(e) => handle("cover", e.target.files?.[0])} />
    </section>
  );
}
