"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadedItem = {
  localId: string;
  previewUrl: string;
  kind: "image" | "video";
  status: "uploading" | "done" | "error";
  progress: number;
  mediaId?: string;
  error?: string;
  alt: string;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/webm";
const IMAGE_ONLY = "image/jpeg,image/png,image/webp,image/avif";

/** Envia um arquivo para /api/uploads com progresso real (XHR). */
export function uploadFile(file: File, purpose: string, onProgress: (p: number) => void): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("purpose", purpose);
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.ok) resolve({ id: body.media.id });
        else reject(new Error(body.error ?? "Falha no envio."));
      } catch {
        reject(new Error(xhr.status === 413 ? "Arquivo grande demais para este servidor." : "Falha no envio."));
      }
    };
    xhr.onerror = () => reject(new Error("Sem conexão. Tente novamente."));
    xhr.send(fd);
  });
}

export function MediaUploader({
  items,
  setItems,
  max = 10,
  purpose = "post",
  imagesOnly,
  label = "Adicionar imagens ou vídeos",
}: {
  items: UploadedItem[];
  setItems: React.Dispatch<React.SetStateAction<UploadedItem[]>>;
  max?: number;
  purpose?: string;
  imagesOnly?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const room = max - items.length;
    Array.from(list)
      .slice(0, room)
      .forEach((file) => {
        const localId = crypto.randomUUID();
        const kind: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
        const item: UploadedItem = { localId, previewUrl: URL.createObjectURL(file), kind, status: "uploading", progress: 0, alt: "" };
        setItems((prev) => [...prev, item]);
        uploadFile(file, purpose, (p) => setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, progress: p } : i))))
          .then(({ id }) => setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, status: "done", mediaId: id, progress: 100 } : i))))
          .catch((err: Error) => setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, status: "error", error: err.message } : i))));
      });
  }

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((it, idx) => (
            <li key={it.localId} className="space-y-1.5">
              <div className="relative aspect-square overflow-hidden rounded-[var(--radius-sm)] bg-ink-800">
                {it.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <video src={it.previewUrl} className="size-full object-cover" muted />
                )}
                {it.status === "uploading" ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/55 text-sm text-paper">
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden /> {it.progress}%
                    </span>
                  </div>
                ) : null}
                {it.status === "error" ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/70 p-3 text-center text-xs text-danger-400" role="alert">
                    <span>
                      <AlertCircle className="mx-auto mb-1 size-4" aria-hidden />
                      {it.error}
                    </span>
                  </div>
                ) : null}
                {idx === 0 && purpose === "post" ? <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-paper">Capa</span> : null}
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((i) => i.localId !== it.localId))}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-paper hover:bg-black/80"
                  aria-label="Remover arquivo"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {it.kind === "image" && purpose === "post" ? (
                <input
                  value={it.alt}
                  onChange={(e) => setItems((prev) => prev.map((i) => (i.localId === it.localId ? { ...i, alt: e.target.value } : i)))}
                  placeholder="Descrição para acessibilidade"
                  aria-label={`Texto alternativo da imagem ${idx + 1}`}
                  maxLength={300}
                  className="w-full rounded-[var(--radius-xs)] bg-ink-850 px-2 py-1.5 text-xs text-paper ring-1 ring-ink-700 placeholder:text-fog-500 focus:outline-none focus:ring-volt-500"
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {items.length < max ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-volt-400 bg-volt-500/10" : "border-ink-600 hover:border-fog-500 hover:bg-white/[0.02]",
          )}
        >
          <ImagePlus className="size-6 text-volt-300" aria-hidden />
          <span className="text-sm font-medium text-paper">{label}</span>
          <span className="text-xs text-fog-500">
            {imagesOnly ? "JPEG, PNG, WebP ou AVIF até 20 MB" : "JPEG, PNG, WebP, AVIF (20 MB) · MP4, MOV, WebM (200 MB)"} · arraste ou clique
          </span>
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={imagesOnly ? IMAGE_ONLY : ACCEPT}
        multiple={max > 1}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
