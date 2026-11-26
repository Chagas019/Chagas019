import { Download } from "lucide-react";
import type { ProductFile } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

/** Botões de download: POST para a rota que autoriza e redireciona para a URL assinada. */
export function DownloadList({ files }: { files: ProductFile[] }) {
  if (!files.length) return <p className="text-sm text-ash">Os arquivos deste preset ainda estão sendo preparados.</p>;
  return (
    <ul className="grid gap-2">
      {files.map((f) => (
        <li key={f.id}>
          <form method="post" action={`/api/download/${f.id}`}>
            <button data-testid="download-button" className="group flex h-14 w-full items-center justify-between rounded-full border border-bone/20 pl-6 pr-2 text-left transition hover:border-signal">
              <span>
                <span className="font-medium">Baixar .{f.format.toUpperCase()}</span>
                <span className="lab-label ml-3 text-smoke">{formatBytes(f.size_bytes)}</span>
              </span>
              <span className="grid size-10 place-items-center rounded-full bg-signal text-signal-ink transition group-hover:scale-105">
                <Download className="size-4" aria-hidden />
              </span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
