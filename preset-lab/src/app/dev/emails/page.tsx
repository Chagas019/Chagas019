import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Inbox, TriangleAlert } from "lucide-react";
import { config } from "@/lib/config";
import { read } from "@/lib/local/store";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Caixa de saída local", robots: { index: false, follow: false } };

/** Converte o link do e-mail em caminho relativo, para funcionar em qualquer porta/host local. */
function localHref(link: string) {
  try {
    const u = new URL(link);
    return `${u.pathname}${u.search}`;
  } catch {
    return link.startsWith("/") ? link : "#";
  }
}

export default async function DevEmailsPage() {
  if (config.backend !== "local") notFound();
  const mails = await read((db) => [...db.outbox].sort((a, b) => b.created_at.localeCompare(a.created_at)));

  return (
    <div className="container-lab py-10 md:py-16">
      <div role="note" className="flex items-start gap-3 rounded-[22px] border border-signal/50 bg-signal/10 p-5 text-sm md:p-6">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden />
        <div>
          <p className="lab-label text-signal">Ferramenta de desenvolvimento</p>
          <p className="mt-2 leading-relaxed text-ash">
            Esta página só existe no modo local. Nenhum e-mail real é enviado: as mensagens de confirmação e de recuperação de senha ficam aqui. Em produção (Supabase), os e-mails são enviados de verdade e esta página não existe.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="lab-label text-smoke">/dev/emails</p>
          <h1 className="display mt-3 text-[clamp(2.75rem,8vw,6rem)]">
            Caixa de <span className="serif-accent text-signal">saída</span>
          </h1>
        </div>
        <p className="lab-label text-smoke">{mails.length} {mails.length === 1 ? "mensagem" : "mensagens"}</p>
      </div>

      {mails.length === 0 ? (
        <div className="mt-10 rounded-[22px] border hairline bg-graphite p-10 text-center">
          <Inbox className="mx-auto size-8 text-smoke" aria-hidden />
          <p className="mt-4 text-ash">Nenhum e-mail ainda. Crie uma conta ou peça recuperação de senha para ver as mensagens aqui.</p>
        </div>
      ) : (
        <ol className="mt-10 border-t hairline" data-testid="outbox">
          {mails.map((m) => (
            <li key={m.id} className="grid gap-3 border-b hairline py-6 md:grid-cols-12 md:items-center md:gap-6" data-testid="email-item">
              <div className="md:col-span-3">
                <p className="lab-label text-smoke">{formatDateTime(m.created_at)}</p>
                <p className="mt-1 break-all text-sm text-ash">Para: {m.to}</p>
              </div>
              <div className="md:col-span-5">
                <p className="text-[17px] font-medium tracking-tight">{m.subject}</p>
                <p className="mt-1 text-sm text-smoke">{m.body}</p>
              </div>
              <div className="min-w-0 md:col-span-4 md:text-right">
                {/* <a> simples: o Link do Next faria prefetch e consumiria o token de uso único */}
                <a href={localHref(m.link)} data-testid="email-link" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-bone px-5 text-sm font-medium text-ink transition hover:bg-white">
                  Abrir link <ArrowUpRight className="size-4" aria-hidden />
                </a>
                <p className="mt-2 truncate font-mono text-[11px] text-smoke" title={m.link}>
                  {m.link}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
