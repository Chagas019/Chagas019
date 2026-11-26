"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, LogOut, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button, Card, inputCls } from "@/components/ui/primitives";

type Profile = { display_name: string | null; ministry: string | null; role_title: string | null; plan: "free" | "premium" };

export function SettingsClient({ freeLimit }: { freeLimit: number }) {
  const { user, supabaseConfigured, signOut, store, toast } = useApp();
  const sb = getBrowserSupabase();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    if (!sb || !user) return;
    sb.from("profiles").select("display_name, ministry, role_title, plan").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data as Profile | null));
    const period = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
    sb.from("ai_usage").select("count").eq("period", period).maybeSingle().then(({ data }) => setUsed((data as { count: number } | null)?.count ?? 0));
  }, [sb, user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!sb || !user || !profile) return;
    const { error } = await sb.from("profiles").update({ display_name: profile.display_name, ministry: profile.ministry, role_title: profile.role_title }).eq("id", user.id);
    toast(error ? `Erro: ${error.message}` : "Perfil atualizado");
  }

  async function exportData() {
    const data = { exportado_em: new Date().toISOString(), salvos: await store.listSaved(), pastas: await store.listFolders(), anotacoes: await store.listNotes(), projetos: await store.listProjects(), pesquisas: await store.listHistory(100) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "verbum-meus-dados.json" });
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 font-serif text-xl text-royal-900">Sua conta</h2>
        {!supabaseConfigured ? (
          <p className="text-sm text-ink-soft">O login ainda não está disponível neste servidor. Seus dados ficam salvos neste navegador.</p>
        ) : !user ? (
          <p className="text-sm text-ink-soft">Você não entrou. <Link href="/entrar?voltar=/configuracoes" className="font-semibold text-royal-700 underline">Entrar ou criar conta</Link></p>
        ) : (
          <form onSubmit={saveProfile} className="space-y-3">
            <p className="text-sm text-ink-mute">{user.email}</p>
            <div><label htmlFor="nome" className="mb-1 block text-sm font-semibold text-royal-900">Nome</label><input id="nome" className={inputCls} maxLength={80} value={profile?.display_name ?? ""} onChange={(e) => profile && setProfile({ ...profile, display_name: e.target.value })} /></div>
            <div><label htmlFor="ministerio" className="mb-1 block text-sm font-semibold text-royal-900">Comunidade, movimento ou pastoral</label><input id="ministerio" className={inputCls} maxLength={120} value={profile?.ministry ?? ""} onChange={(e) => profile && setProfile({ ...profile, ministry: e.target.value })} /></div>
            <div><label htmlFor="funcao" className="mb-1 block text-sm font-semibold text-royal-900">Função</label><input id="funcao" className={inputCls} maxLength={80} placeholder="ex.: Pregador, coordenador, catequista" value={profile?.role_title ?? ""} onChange={(e) => profile && setProfile({ ...profile, role_title: e.target.value })} /></div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" disabled={!profile}>Salvar perfil</Button>
              <Button type="button" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /> Sair</Button>
            </div>
          </form>
        )}
      </Card>

      {user && (
        <Card>
          <h2 className="mb-2 font-serif text-xl text-royal-900">Plano</h2>
          <p className="text-sm text-ink-soft">Plano atual: <strong className="text-royal-900">{profile?.plan === "premium" ? "Premium" : "Gratuito"}</strong></p>
          {profile?.plan !== "premium" && <p className="mt-1 text-sm text-ink-soft">Gerações de IA neste mês: <strong>{used ?? "…"}</strong> de {freeLimit}. O roteiro-base sem IA é ilimitado.</p>}
          <p className="mt-2 text-xs text-ink-mute">Planos pagos ainda não estão disponíveis.</p>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-serif text-xl text-royal-900">Seus dados</h2>
        <p className="mb-4 text-sm text-ink-soft">Baixe uma cópia de tudo o que você salvou ({store.mode === "nuvem" ? "na sua conta" : "neste navegador"}).</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={exportData}><Download className="h-4 w-4" /> Exportar meus dados</Button>
          {store.mode === "local" && (
            <Button variant="ghost" onClick={() => { if (confirm("Apagar todos os dados salvos neste navegador?")) { try { localStorage.removeItem("verbum:v1"); } catch { /* */ } location.reload(); } }}><Trash2 className="h-4 w-4" /> Apagar dados locais</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
