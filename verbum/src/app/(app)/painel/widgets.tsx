"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, History, Bookmark, CloudOff } from "lucide-react";
import { useApp } from "@/components/providers";
import type { HistoryEntry, Project } from "@/lib/store/types";
import { Card } from "@/components/ui/primitives";

export function DashboardWidgets() {
  const { store, savedKeys, supabaseConfigured, user, authReady } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!authReady) return;
    store.listProjects().then((p) => setProjects(p.slice(0, 4))).catch(() => {});
    store.listHistory(6).then(setHistory).catch(() => {});
  }, [store, authReady]);

  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg text-royal-900"><FileText className="h-4 w-4 text-gold-500" /> Pregações recentes</h2>
        {projects.length ? (
          <ul className="space-y-1">{projects.map((p) => (
            <li key={p.id}><Link href={`/assistente?projeto=${p.id}`} className="block rounded-lg px-2 py-2 text-sm hover:bg-ivory-100"><span className="font-medium text-royal-900">{p.title}</span><span className="block text-xs text-ink-mute">{new Date(p.updated_at).toLocaleDateString("pt-BR")} · {p.status}</span></Link></li>
          ))}</ul>
        ) : <p className="text-sm text-ink-mute">Nenhuma pregação salva ainda. <Link href="/assistente" className="text-royal-700 hover:underline">Prepare a primeira.</Link></p>}
      </Card>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg text-royal-900"><History className="h-4 w-4 text-gold-500" /> Pesquisas recentes</h2>
        {history.length ? (
          <ul className="flex flex-wrap gap-2">{history.map((h) => <li key={h.id}><Link href={`/pesquisa?q=${encodeURIComponent(h.query)}`} className="inline-block rounded-full bg-ivory-200 px-3 py-1 text-sm text-ink-soft hover:bg-ivory-300">{h.query}</Link></li>)}</ul>
        ) : <p className="text-sm text-ink-mute">Suas buscas aparecerão aqui.</p>}
      </Card>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-lg text-royal-900"><Bookmark className="h-4 w-4 text-gold-500" /> Meu Espaço</h2>
        <p className="font-serif text-4xl text-royal-900">{savedKeys.size}</p>
        <p className="text-sm text-ink-soft">itens salvos</p>
        {supabaseConfigured && authReady && !user && (
          <p className="mt-3 flex items-start gap-2 text-xs text-ink-mute"><CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Salvo só neste navegador. <Link href="/entrar" className="text-royal-700 hover:underline">Entre</Link> para guardar na sua conta.</p>
        )}
        <Link href="/meu-espaco" className="mt-4 inline-block text-sm font-medium text-royal-700 hover:underline">Abrir Meu Espaço</Link>
      </Card>
    </section>
  );
}
