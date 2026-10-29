import Link from "next/link";
import { Plus } from "lucide-react";
import { getViewer, isModerator } from "@/server/session";
import { listChallenges, type ChallengePhase } from "@/server/services/challenges";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { CATEGORIES, labelOf } from "@/lib/taxonomy";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Creative Battles — desafios criativos" };

const PHASE: Record<ChallengePhase, { label: string; tone: "volt" | "cobalt" | "neutral" | "ember" }> = {
  open: { label: "Recebendo trabalhos", tone: "volt" },
  voting: { label: "Em votação", tone: "cobalt" },
  upcoming: { label: "Em breve", tone: "ember" },
  closed: { label: "Encerrado", tone: "neutral" },
};

export default async function Page() {
  const viewer = await getViewer();
  const all = await listChallenges();
  const groups: { title: string; items: typeof all }[] = [
    { title: "Acontecendo agora", items: all.filter((c) => c.phase === "open" || c.phase === "voting") },
    { title: "Em breve", items: all.filter((c) => c.phase === "upcoming") },
    { title: "Encerrados", items: all.filter((c) => c.phase === "closed") },
  ];
  return (
    <Container className="space-y-12 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionTitle eyebrow="Creative Battles" title="Desafios que fazem você evoluir">
          Desafios semanais e mensais para iniciantes e profissionais. Valorizamos originalidade, evolução e participação — a votação, quando existe, tem regras públicas.
        </SectionTitle>
        {isModerator(viewer) ? (
          <ButtonLink href="/desafios/novo" size="lg">
            <Plus className="size-4" aria-hidden /> Novo desafio
          </ButtonLink>
        ) : null}
      </div>
      {all.length === 0 ? <EmptyState title="Nenhum desafio publicado ainda" /> : null}
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <section key={g.title} className="space-y-5">
            <h2 className="font-display text-3xl">{g.title}</h2>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {g.items.map((c) => (
                <li key={c.id}>
                  <Link href={`/desafios/${c.slug}`} className="group relative flex h-full min-h-64 flex-col overflow-hidden rounded-[var(--radius-lg)] bg-ink-850 p-6 shadow-[var(--shadow-card)]">
                    <div aria-hidden className="absolute inset-x-0 top-0 flex h-1.5">
                      {(c.palette.length ? c.palette : ["#8b5cf6", "#3b82f6"]).map((hex) => (
                        <span key={hex} className="flex-1" style={{ background: hex }} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={PHASE[c.phase].tone}>{PHASE[c.phase].label}</Badge>
                      <Badge>{c.cadence === "mensal" ? "Mensal" : "Semanal"}</Badge>
                      <Badge>{c.level === "todos" ? "Todos os níveis" : c.level === "iniciante" ? "Iniciantes" : "Profissionais"}</Badge>
                    </div>
                    <h3 className="mt-5 font-display text-3xl leading-tight transition-colors group-hover:text-white">{c.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-fog-400">{c.theme}</p>
                    <p className="mt-5 text-xs text-fog-500">
                      {labelOf(CATEGORIES, c.category)} · {c.submissions} participações · {c.phase === "open" ? `até ${formatDate(c.submissionDeadline)}` : c.phase === "upcoming" ? `começa ${formatDate(c.startsAt)}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </Container>
  );
}
