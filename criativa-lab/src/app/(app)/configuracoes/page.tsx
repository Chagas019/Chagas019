"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Download, LogOut, RotateCcw, Save } from "lucide-react";
import { CATEGORIES } from "@/lib/content/categories";
import { useUserData } from "@/lib/store";
import type { CategoryId } from "@/lib/types";
import { PageHeader } from "@/components/ui/bits";
import { Button } from "@/components/ui/Button";

export default function ConfiguracoesPage() {
  const { data, user, backend, updateProfile, resetProgress, signOut } = useUserData();
  const router = useRouter();
  const [name, setName] = useState(data.profile.name);
  const [bio, setBio] = useState(data.profile.bio);
  const [focus, setFocus] = useState<CategoryId[]>(data.profile.focus);
  const [goal, setGoal] = useState(data.profile.weeklyGoal);
  const [saving, setSaving] = useState(false);

  const toggle = (id: CategoryId) => setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportadoEm: new Date().toISOString(), email: user.email, ...data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `criativa-lab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader eyebrow="Configurações" title="Seu lab," accent="do seu jeito." />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form
          className="card space-y-6 p-6 sm:p-8"
          onSubmit={async (e) => {
            e.preventDefault();
            if (name.trim().length < 2) return;
            setSaving(true);
            await updateProfile({ name: name.trim(), bio: bio.trim(), focus, weeklyGoal: goal }).catch(() => null);
            setSaving(false);
          }}
        >
          <h2 className="font-display text-xl font-semibold">Perfil</h2>
          <div>
            <label htmlFor="s-name" className="mb-2 block text-sm text-fog">
              Nome
            </label>
            <input id="s-name" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required minLength={2} />
          </div>
          <div>
            <label htmlFor="s-bio" className="mb-2 block text-sm text-fog">
              Bio criativa
            </label>
            <textarea id="s-bio" rows={3} className="field resize-none" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} placeholder="Fotógrafa de rua, apaixonada por tipografia…" />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm text-fog">Áreas de foco (personalizam as recomendações)</legend>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button type="button" key={c.id} className="chip" data-active={focus.includes(c.id)} aria-pressed={focus.includes(c.id)} onClick={() => toggle(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="s-goal" className="mb-2 flex justify-between text-sm text-fog">
              Meta semanal <span className="text-paper">{goal} desafios</span>
            </label>
            <input id="s-goal" type="range" min={1} max={14} value={goal} onChange={(e) => setGoal(Number(e.target.value))} className="w-full accent-[#d4ff3a]" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Save className="size-4" /> Salvar perfil
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="card space-y-4 p-6">
            <h2 className="font-display text-xl font-semibold">Conta</h2>
            <p className="text-sm text-fog">
              E-mail: <span className="text-paper">{user.email}</span>
            </p>
            <p className="flex items-start gap-2 rounded-xl border border-line p-3 text-xs leading-relaxed text-fog">
              <Database className="mt-0.5 size-4 shrink-0 text-lime" />
              {backend.mode === "supabase"
                ? "Seus dados estão sincronizados no Supabase e protegidos por Row Level Security."
                : "Modo local: os dados ficam salvos neste navegador. Configure o Supabase para sincronizar entre dispositivos."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="size-3.5" /> Exportar meus dados
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  router.replace("/entrar");
                }}
              >
                <LogOut className="size-3.5" /> Sair
              </Button>
            </div>
          </section>

          <section className="card space-y-3 border-ember/20 p-6">
            <h2 className="font-display text-xl font-semibold">Zona de recomeço</h2>
            <p className="text-sm text-fog">Apaga desafios concluídos, aulas e histórico (XP volta a zero). Projetos, favoritos e ideias são mantidos.</p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm("Reiniciar todo o progresso? Esta ação não pode ser desfeita.")) resetProgress().catch(() => null);
              }}
            >
              <RotateCcw className="size-3.5" /> Reiniciar progresso
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
