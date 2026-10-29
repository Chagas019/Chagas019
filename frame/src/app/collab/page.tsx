import Link from "next/link";
import { Briefcase, MapPin, Plus, Users } from "lucide-react";
import { getViewer } from "@/server/session";
import { listListings, myApplications } from "@/server/services/collab";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { COLLAB_MODES, COLLAB_PROJECT_TYPES } from "@/lib/validation";
import { SPECIALTIES, labelOf } from "@/lib/taxonomy";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export const metadata = { title: "Collab — encontre parceiros criativos" };

type SP = { habilidade?: string; modo?: string; tipo?: string; aba?: string };

const APP_STATUS = { pending: "Aguardando", accepted: "Aceita", declined: "Recusada" } as const;

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const skill = SPECIALTIES.find((s) => s === sp.habilidade);
  const mode = COLLAB_MODES.find((m) => m.slug === sp.modo)?.slug;
  const type = COLLAB_PROJECT_TYPES.find((t) => t.slug === sp.tipo)?.slug;
  const tab = viewer && (sp.aba === "minhas" || sp.aba === "candidaturas") ? sp.aba : "abertas";
  const [listings, applications] = await Promise.all([
    tab === "candidaturas" ? Promise.resolve([]) : listListings(viewer?.id ?? null, { skill, mode, type, mine: tab === "minhas" }),
    tab === "candidaturas" && viewer ? myApplications(viewer.id) : Promise.resolve([]),
  ]);
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    Object.entries({ habilidade: skill, modo: mode, tipo: type, ...patch }).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `/collab?${s}` : "/collab";
  };
  const chip = (active: boolean) => cn("shrink-0 rounded-full px-3 py-1.5 text-sm", active ? "bg-volt-500 text-ink-950" : "bg-ink-850 text-fog-400 hover:text-paper");

  return (
    <Container className="space-y-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionTitle eyebrow="Collab" title="Encontre gente para criar junto">
          Fotógrafos, videomakers, editores, coloristas e designers procurando parceiros. O contato só é liberado quando a candidatura é aceita.
        </SectionTitle>
        {viewer ? (
          <ButtonLink href="/collab/nova" size="lg">
            <Plus className="size-4" aria-hidden /> Publicar oportunidade
          </ButtonLink>
        ) : null}
      </div>

      {viewer ? (
        <nav aria-label="Seções do Collab" className="scrollbar-none flex gap-1 overflow-x-auto border-b border-ink-700">
          {[
            { slug: "abertas", label: "Oportunidades" },
            { slug: "minhas", label: "Minhas oportunidades" },
            { slug: "candidaturas", label: "Minhas candidaturas" },
          ].map((t) => (
            <Link key={t.slug} href={t.slug === "abertas" ? "/collab" : `/collab?aba=${t.slug}`} aria-current={tab === t.slug ? "page" : undefined} className={cn("-mb-px shrink-0 border-b-2 px-4 py-3 text-sm", tab === t.slug ? "border-volt-500 text-paper" : "border-transparent text-fog-500 hover:text-paper")}>
              {t.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {tab === "abertas" ? (
        <div className="space-y-2">
          <nav aria-label="Habilidade" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <Link href={qs({ habilidade: undefined })} className={chip(!skill)}>Todas as habilidades</Link>
            {SPECIALTIES.filter((s) => s !== "Aprendendo").map((s) => (
              <Link key={s} href={qs({ habilidade: s })} className={chip(skill === s)}>{s}</Link>
            ))}
          </nav>
          <nav aria-label="Modalidade e tipo" className="flex flex-wrap gap-2">
            <Link href={qs({ modo: undefined })} className={chip(!mode)}>Qualquer modalidade</Link>
            {COLLAB_MODES.map((m) => (
              <Link key={m.slug} href={qs({ modo: m.slug })} className={chip(mode === m.slug)}>{m.label}</Link>
            ))}
            <span className="mx-1 w-px bg-ink-700" aria-hidden />
            <Link href={qs({ tipo: undefined })} className={chip(!type)}>Qualquer projeto</Link>
            {COLLAB_PROJECT_TYPES.map((t) => (
              <Link key={t.slug} href={qs({ tipo: t.slug })} className={chip(type === t.slug)}>{t.label}</Link>
            ))}
          </nav>
        </div>
      ) : null}

      {tab === "candidaturas" ? (
        applications.length ? (
          <ul className="divide-y divide-ink-700">
            {applications.map((a) => (
              <li key={a.id}>
                <Link href={`/collab/${a.listingId}`} className="flex items-center justify-between gap-4 py-4 hover:bg-white/[0.02]">
                  <span>
                    <span className="block font-medium">{a.title}</span>
                    <span className="text-xs text-fog-500">Enviada {timeAgo(a.createdAt)}{a.listingStatus !== "open" ? " · oportunidade encerrada" : ""}</span>
                  </span>
                  <Badge tone={a.status === "accepted" ? "mint" : a.status === "declined" ? "neutral" : "ember"}>{APP_STATUS[a.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Briefcase className="size-6" />} title="Nenhuma candidatura ainda" action={<ButtonLink href="/collab">Ver oportunidades</ButtonLink>} />
        )
      ) : listings.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((l) => (
            <li key={l.id}>
              <Link href={`/collab/${l.id}`} className="flex h-full flex-col rounded-[var(--radius-lg)] bg-ink-850 p-6 shadow-[var(--shadow-card)] transition-colors hover:bg-ink-800">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="volt">{labelOf(COLLAB_PROJECT_TYPES, l.projectType)}</Badge>
                  <Badge>{labelOf(COLLAB_MODES, l.mode)}</Badge>
                  {l.isVolunteer ? <Badge tone="ember">Voluntário</Badge> : <Badge tone="mint">Remunerado</Badge>}
                  {l.access === "private" ? <Badge>Privada</Badge> : null}
                  {l.status !== "open" ? <Badge tone="danger">{l.status === "closed" ? "Encerrada" : "Removida"}</Badge> : null}
                </div>
                <h2 className="mt-4 font-display text-2xl leading-tight">{l.title}</h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-fog-400">{l.description}</p>
                <p className="mt-4 text-xs text-fog-500">{l.skills.join(" · ")}</p>
                <div className="mt-4 flex items-center justify-between gap-2 text-xs text-fog-500">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar mediaId={l.authorAvatar} name={l.authorName} size={22} />
                    <span className="truncate">{l.authorName}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {l.location ? (
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden /> {l.location}</span>
                    ) : null}
                    <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {l.applications}</span>
                  </span>
                </div>
                {l.deadline ? <p className="mt-2 text-xs text-fog-500">Prazo: {formatDate(l.deadline)}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Briefcase className="size-6" />} title={tab === "minhas" ? "Você ainda não publicou oportunidades" : "Nenhuma oportunidade com esses filtros"} action={viewer ? <ButtonLink href="/collab/nova">Publicar oportunidade</ButtonLink> : <ButtonLink href="/cadastro">Criar conta</ButtonLink>}>
          Procurando modelo, editor, colorista ou fotógrafo? Publique e receba candidaturas.
        </EmptyState>
      )}
    </Container>
  );
}
