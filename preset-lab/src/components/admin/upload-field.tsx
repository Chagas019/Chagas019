"use client";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { prepareUploadAction, registerProductFileAction } from "@/app/actions/admin";
import { FieldError, Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useField } from "./admin-form";

const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const PRIVATE_ACCEPT = ".xmp,.dng,.zip,.cube,.3dl";
const PRIVATE_EXT = ["xmp", "dng", "zip", "cube", "3dl"];

type Progress = (pct: number) => void;

function send(method: "PUT" | "POST", url: string, body: Blob | FormData, headers: Record<string, string>, onProgress: Progress) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Falha no envio (HTTP ${xhr.status}).`;
      try {
        const j = JSON.parse(xhr.responseText) as { error?: string; message?: string };
        msg = j.error || j.message || msg;
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Falha de rede durante o envio."));
    xhr.timeout = 15 * 60 * 1000;
    xhr.ontimeout = () => reject(new Error("O envio demorou demais e foi cancelado."));
    xhr.send(body);
  });
}

/**
 * Fluxo único de upload (Supabase e local):
 * 1) prepareUploadAction valida e gera o caminho no servidor;
 * 2) o navegador envia para a URL assinada do Supabase (PUT) ou para /api/admin/upload (local).
 */
export async function uploadFile(target: "private" | "media", file: File, onProgress: Progress, productId?: string) {
  const prep = await prepareUploadAction(target, file.name, file.size, file.type, productId);
  if (!prep.ok) throw new Error(prep.error);
  if (prep.kind === "supabase") {
    await send("PUT", prep.signedUrl, file, { "content-type": file.type || "application/octet-stream", "x-upsert": "false" }, onProgress);
  } else {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("target", target);
    fd.set("path", prep.path);
    await send("POST", "/api/admin/upload", fd, {}, onProgress);
  }
  return { path: prep.path, publicUrl: prep.publicUrl };
}

type Status = { kind: "idle" } | { kind: "uploading"; pct: number } | { kind: "done" } | { kind: "error"; message: string };

function StatusLine({ status, id }: { status: Status; id: string }) {
  if (status.kind === "idle") return null;
  return (
    <p id={id} role={status.kind === "error" ? "alert" : "status"} className={cn("mt-2 text-xs", status.kind === "error" ? "text-danger" : status.kind === "done" ? "text-ok" : "text-ash")}>
      {status.kind === "uploading" && (
        <span className="flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Enviando… {status.pct}%
          <span className="relative h-1 w-24 overflow-hidden rounded-full bg-bone/10">
            <span className="absolute inset-y-0 left-0 bg-signal transition-[width]" style={{ width: `${status.pct}%` }} />
          </span>
        </span>
      )}
      {status.kind === "done" && "Imagem enviada."}
      {status.kind === "error" && status.message}
    </p>
  );
}

/** Campo de imagem: URL editável + botão de upload para o bucket público de mídia. */
export function MediaUrlField({ name, label, defaultValue, hint, onRemove, className }: { name: string; label: string; defaultValue?: string | null; hint?: string; onRemove?: () => void; className?: string }) {
  const field = useField(name);
  const uid = useId();
  const inputId = onRemove ? `${field.id}-${uid}` : field.id;
  const [value, setValue] = useState(defaultValue ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const statusId = `${inputId}-status`;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setStatus({ kind: "uploading", pct: 0 });
    try {
      const { publicUrl } = await uploadFile("media", file, (pct) => setStatus({ kind: "uploading", pct }));
      if (!publicUrl) throw new Error("O servidor não devolveu a URL da imagem.");
      setValue(publicUrl);
      setStatus({ kind: "done" });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Falha no envio." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const showPreview = value && (value.startsWith("/") || value.startsWith("https://"));
  return (
    <div className={className}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-stretch gap-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border hairline bg-graphite-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {showPreview ? <img src={value} alt="" className="size-full object-cover" /> : <ImageUp className="size-4 text-smoke" aria-hidden />}
        </div>
        <Input
          id={inputId}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="/api/media/... ou https://..."
          aria-invalid={!!field.error}
          aria-describedby={[field.error ? field.errorId : "", hint ? field.hintId : "", status.kind !== "idle" ? statusId : ""].filter(Boolean).join(" ") || undefined}
          className="min-w-0 flex-1"
        />
        <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} className="sr-only" id={`${inputId}-file`} tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" variant="outline" className="h-12 shrink-0 rounded-xl px-4" onClick={() => fileRef.current?.click()} disabled={status.kind === "uploading"} aria-label={`Enviar imagem: ${label}`}>
          {status.kind === "uploading" ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
          <span className="hidden sm:inline">Enviar</span>
        </Button>
        {onRemove && (
          <Button type="button" variant="ghost" className="h-12 shrink-0 rounded-xl px-3" onClick={onRemove} aria-label="Remover imagem da galeria">
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
      {hint && (
        <p id={field.hintId} className="mt-1.5 text-xs text-smoke">
          {hint}
        </p>
      )}
      <StatusLine status={status} id={statusId} />
      {!onRemove && <FieldError id={field.errorId}>{field.error}</FieldError>}
    </div>
  );
}

/** Galeria: lista de imagens com adicionar/remover. */
export function GalleryField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string[] }) {
  const field = useField(name);
  const [items, setItems] = useState(() => defaultValue.map((v, i) => ({ key: i, value: v })));
  const [next, setNext] = useState(defaultValue.length);
  return (
    <fieldset>
      <legend className="lab-label mb-2 text-ash">{label}</legend>
      <div className="grid grid-cols-1 gap-4">
        {items.length === 0 && <p className="text-sm text-smoke">Nenhuma imagem na galeria.</p>}
        {items.map((it, i) => (
          <MediaUrlField key={it.key} name={name} label={`Imagem ${i + 1}`} defaultValue={it.value} onRemove={() => setItems((l) => l.filter((x) => x.key !== it.key))} />
        ))}
      </div>
      {items.length < 12 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            setItems((l) => [...l, { key: next, value: "" }]);
            setNext((n) => n + 1);
          }}
        >
          <Plus aria-hidden /> Adicionar imagem
        </Button>
      )}
      <FieldError id={field.errorId}>{field.error}</FieldError>
    </fieldset>
  );
}

/** Upload de arquivo privado do preset (.xmp/.dng/.zip/.cube/.3dl) + registro no banco. */
export function ProductFileUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "uploading"; pct: number; name: string } | { kind: "done"; name: string } | { kind: "error"; message: string }>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();

  async function onFile(file: File | undefined) {
    if (!file) return;
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!PRIVATE_EXT.includes(ext)) {
      setStatus({ kind: "error", message: "Formato não aceito. Use .xmp, .dng, .zip, .cube ou .3dl." });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setStatus({ kind: "error", message: "Arquivo maior que 100 MB." });
      return;
    }
    setStatus({ kind: "uploading", pct: 0, name: file.name });
    try {
      const { path } = await uploadFile("private", file, (pct) => setStatus({ kind: "uploading", pct, name: file.name }), productId);
      const reg = await registerProductFileAction(productId, path, file.name, ext);
      if (!reg.ok) throw new Error(reg.error ?? "Não foi possível registrar o arquivo.");
      setStatus({ kind: "done", name: file.name });
      router.refresh();
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Falha no envio." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-bone/20 p-5">
      <label htmlFor={id} className="lab-label block text-ash">
        Novo arquivo do preset
      </label>
      <p className="mt-1 text-sm text-smoke">.xmp, .dng, .zip, .cube ou .3dl — até 100 MB. O arquivo vai para o armazenamento privado e só é entregue por link assinado.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          id={id}
          type="file"
          accept={PRIVATE_ACCEPT}
          disabled={status.kind === "uploading"}
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full max-w-sm text-sm text-ash file:mr-4 file:h-10 file:cursor-pointer file:rounded-full file:border-0 file:bg-bone file:px-5 file:text-sm file:font-medium file:text-ink hover:file:bg-white"
        />
      </div>
      <div aria-live="polite" className="mt-3 text-sm">
        {status.kind === "uploading" && (
          <span className="flex items-center gap-2 text-ash">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Enviando {status.name}… {status.pct}%
            <span className="relative h-1 w-32 overflow-hidden rounded-full bg-bone/10">
              <span className="absolute inset-y-0 left-0 bg-signal transition-[width]" style={{ width: `${status.pct}%` }} />
            </span>
          </span>
        )}
        {status.kind === "done" && <span className="text-ok">{status.name} enviado e registrado.</span>}
        {status.kind === "error" && (
          <span role="alert" className="text-danger">
            {status.message}
          </span>
        )}
      </div>
    </div>
  );
}

