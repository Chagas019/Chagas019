import { notFound } from "next/navigation";
import { canSeeStats, requireViewerPage } from "@/server/session";
import { platformStats } from "@/server/services/stats";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

function Stat({ label, value, hint, accent }: { label: string; value: number; hint?: string; accent?: boolean }) {
  return (
    <div className={accent ? "rounded-[var(--radius-md)] bg-cobalt-500 p-5" : "rounded-[var(--radius-md)] bg-ink-850 p-5 ring-1 ring-inset ring-white/[0.06]"}>
      <p className={accent ? "text-xs font-semibold uppercase tracking-[0.14em] text-paper/80" : "text-xs font-semibold uppercase tracking-[0.14em] text-fog-400"}>{label}</p>
      <p className={accent ? "mt-2 font-display text-5xl text-volt-500" : "mt-2 font-display text-5xl"}>{value.toLocaleString("pt-BR")}</p>
      {hint ? <p className={accent ? "mt-1 text-xs text-paper/80" : "mt-1 text-xs text-fog-500"}>{hint}</p> : null}
    </div>
  );
}

export default async function StatsPage() {
  const viewer = await requireViewerPage("/painel");
  if (!canSeeStats(viewer)) notFound();
  const { totals: t, daily } = await platformStats();
  const n = (k: string) => Number(t[k] ?? 0);
  const max = Math.max(1, ...daily.map((d) => Math.max(d.signups, d.posts)));

  return (
    <Container className="space-y-10 py-10">
      <SectionTitle eyebrow="Só para a equipe" title="Como está o FRAME">
        Números reais do banco de dados, atualizados a cada visita a esta página.
      </SectionTitle>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat accent label="Contas criadas" value={n("accounts")} hint={`+${n("accounts_24h")} em 24h · +${n("accounts_7d")} em 7 dias`} />
        <Stat label="Ativos em 7 dias" value={n("active_7d")} hint={`${n("active_24h")} nas últimas 24h (pessoas logadas)`} />
        <Stat label="Publicações" value={n("posts")} hint={`+${n("posts_7d")} em 7 dias · ${n("drafts")} rascunhos`} />
        <Stat label="Criadores publicando" value={n("creators")} hint={`${n("onboarded")} perfis completos`} />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Curtidas" value={n("likes")} />
        <Stat label="Comentários" value={n("comments")} />
        <Stat label="Seguidores" value={n("follows")} hint="conexões" />
        <Stat label="Salvos" value={n("saves")} />
        <Stat label="Mensagens" value={n("messages")} />
        <Stat label="Em desafios" value={n("submissions")} hint="participações" />
        <Stat label="Comunidades" value={n("communities")} />
        <Stat label="Collab" value={n("collabs")} hint="oportunidades" />
        <Stat label="Denúncias abertas" value={n("open_reports")} />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl">Últimos 14 dias</h2>
        <div className="flex items-center gap-4 text-xs text-fog-400">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-volt-500" aria-hidden /> Cadastros</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-cobalt-400" aria-hidden /> Publicações</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Cadastros e publicações por dia</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-fog-500">
                <th className="py-2 pr-4 font-semibold">Dia</th>
                <th className="py-2 font-semibold">Movimento</th>
                <th className="py-2 pl-4 text-right font-semibold">Cadastros</th>
                <th className="py-2 pl-4 text-right font-semibold">Publicações</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.day} className="border-t border-white/[0.06]">
                  <td className="py-2 pr-4 tabular-nums text-fog-300">{d.day}</td>
                  <td className="w-full py-2">
                    <div className="space-y-1" aria-hidden>
                      <div className="h-2 rounded-full bg-volt-500" style={{ width: `${(d.signups / max) * 100}%`, minWidth: d.signups ? 6 : 0 }} />
                      <div className="h-2 rounded-full bg-cobalt-400" style={{ width: `${(d.posts / max) * 100}%`, minWidth: d.posts ? 6 : 0 }} />
                    </div>
                  </td>
                  <td className="py-2 pl-4 text-right tabular-nums">{d.signups}</td>
                  <td className="py-2 pl-4 text-right tabular-nums">{d.posts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="rounded-[var(--radius-md)] bg-ink-850 p-4 text-sm text-fog-400">
        Visitas de quem não tem conta (páginas vistas, países, aparelhos) ficam no painel <strong className="text-paper">Analytics</strong> da Vercel, que conta a partir do dia em que foi ativado. Visitas anteriores não foram registradas.
      </p>
    </Container>
  );
}
