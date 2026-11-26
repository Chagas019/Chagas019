import type { Metadata } from "next";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { integrationStatus, serverEnv } from "@/lib/env";
import { PageHeader, Card } from "@/components/ui/primitives";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default function Configuracoes() {
  const s = integrationStatus();
  const rows = [
    { ok: s.supabase, name: "Conta e banco de dados (Supabase)", on: "Login, Meu Espaço sincronizado na nuvem e limites de uso.", off: "Sem login; Meu Espaço salvo apenas no navegador. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY." },
    { ok: s.ai, name: "Assistente de IA (Claude)", on: `Roteiros completos gerados por IA (modelo ${serverEnv.aiModel}).`, off: "Disponível apenas o roteiro-base sem IA. Defina ANTHROPIC_API_KEY no servidor." },
    { ok: s.youtube, name: "Busca de vídeos (YouTube Data API)", on: "Pregações e músicas em vídeo buscadas em tempo real.", off: "Oferecemos links de busca direta no YouTube. Defina YOUTUBE_API_KEY no servidor." },
  ];
  return (
    <div>
      <PageHeader eyebrow="Configurações" title="Conta, integrações e dados" />
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsClient freeLimit={serverEnv.freeAiLimit} />
        <Card>
          <h2 className="mb-4 font-serif text-xl text-royal-900">Integrações deste servidor</h2>
          <ul className="space-y-4">
            {rows.map((r) => (
              <li key={r.name} className="flex gap-3">
                {r.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-label="Ativa" /> : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-label="Não configurada" />}
                <div>
                  <p className="font-semibold text-royal-900">{r.name} <span className={`ml-1 text-xs font-medium ${r.ok ? "text-emerald-800" : "text-amber-800"}`}>{r.ok ? "ativa" : "não configurada"}</span></p>
                  <p className="text-sm text-ink-soft">{r.ok ? r.on : r.off}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-ink-mute">As chaves secretas ficam apenas no servidor e nunca são enviadas ao navegador.</p>
        </Card>
      </div>
    </div>
  );
}
