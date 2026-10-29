import Link from "next/link";
import { Globe, Lock, Mail, Plus, Users } from "lucide-react";
import { getViewer } from "@/server/session";
import { listCommunities } from "@/server/services/communities";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { CATEGORIES, labelOf } from "@/lib/taxonomy";

export const metadata = { title: "Comunidades criativas" };

const ACCESS = {
  public: { label: "Pública", icon: Globe },
  private: { label: "Privada", icon: Lock },
  invite: { label: "Por convite", icon: Mail },
} as const;

export default async function Page() {
  const viewer = await getViewer();
  const [all, mine] = await Promise.all([listCommunities(viewer?.id ?? null), viewer ? listCommunities(viewer.id, { mine: true }) : Promise.resolve([])]);
  const mineIds = new Set(mine.map((m) => m.id));
  return (
    <Container className="space-y-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionTitle eyebrow="Comunidades" title="Grupos para trocar, aprender e criar junto">
          Fotografia mobile, casamentos, color grading, equipamentos acessíveis… Encontre sua turma ou crie uma.
        </SectionTitle>
        {viewer ? (
          <ButtonLink href="/comunidades/nova" size="lg">
            <Plus className="size-4" aria-hidden /> Criar comunidade
          </ButtonLink>
        ) : null}
      </div>

      {mine.length ? (
        <section className="space-y-4">
          <h2 className="font-display text-3xl">Suas comunidades</h2>
          <ul className="flex flex-wrap gap-2">
            {mine.map((c) => (
              <li key={c.id}>
                <Link href={`/comunidades/${c.slug}`} className="inline-flex rounded-full bg-ink-850 px-4 py-2 text-sm hover:bg-ink-800">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {all.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((c) => {
            const A = ACCESS[c.access];
            return (
              <li key={c.id}>
                <Link href={`/comunidades/${c.slug}`} className="group flex h-full flex-col rounded-[var(--radius-lg)] bg-ink-850 p-6 shadow-[var(--shadow-card)] transition-colors hover:bg-ink-800">
                  <div className="mb-4 flex items-center gap-2">
                    <Badge>
                      <A.icon className="size-3" aria-hidden /> {A.label}
                    </Badge>
                    {mineIds.has(c.id) ? <Badge tone="mint">Participando</Badge> : c.memberStatus === "pending" ? <Badge tone="ember">Pedido enviado</Badge> : null}
                  </div>
                  <h2 className="font-display text-2xl leading-tight group-hover:text-white">{c.name}</h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm text-fog-400">{c.description}</p>
                  <div className="mt-5 flex items-center justify-between text-xs text-fog-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" aria-hidden /> {c.memberCount} participantes
                    </span>
                    <span>{c.categories.slice(0, 2).map((x) => labelOf(CATEGORIES, x)).join(" · ")}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Nenhuma comunidade ainda" action={viewer ? <ButtonLink href="/comunidades/nova">Criar a primeira</ButtonLink> : undefined} />
      )}
    </Container>
  );
}
