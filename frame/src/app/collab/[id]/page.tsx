import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, Lock, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { getViewer } from "@/server/session";
import { getListing, listApplications } from "@/server/services/collab";
import { ApplyForm, DecisionButtons, OwnerListingControls } from "@/components/collab/collab-actions";
import { ReportButton } from "@/components/social/report-dialog";
import { ShareButton } from "@/components/post/post-actions";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Container } from "@/components/ui/misc";
import { COLLAB_MODES, COLLAB_PROJECT_TYPES } from "@/lib/validation";
import { labelOf } from "@/lib/taxonomy";
import { formatDate, timeAgo } from "@/lib/utils";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ codigo?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await getListing(null, id);
  if (!d) return { title: "Oportunidade", robots: { index: false } };
  return { title: `${d.listing.title} — Collab`, description: d.listing.description.slice(0, 160) };
}

const APP_STATUS = { pending: "Aguardando", accepted: "Aceita", declined: "Recusada" } as const;

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { codigo } = await searchParams;
  const viewer = await getViewer();
  const d = await getListing(viewer, id, codigo);
  if (!d) notFound();
  const { listing: l } = d;
  const applications = d.isAuthor && viewer ? await listApplications(viewer, l.id) : [];
  const canApply = viewer && !d.isAuthor && !d.myApplication && d.acceptingApplications;

  return (
    <Container className="max-w-5xl py-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="volt">{labelOf(COLLAB_PROJECT_TYPES, l.projectType)}</Badge>
            <Badge>{labelOf(COLLAB_MODES, l.mode)}</Badge>
            {l.access === "private" ? (
              <Badge>
                <Lock className="size-3" aria-hidden /> Privada
              </Badge>
            ) : null}
            {l.status !== "open" ? <Badge tone="danger">{l.status === "closed" ? "Candidaturas encerradas" : "Removida"}</Badge> : null}
          </div>
          <h1 className="font-display text-4xl leading-[1.05] text-balance sm:text-5xl">{l.title}</h1>
          <p className="whitespace-pre-line text-pretty text-lg leading-relaxed text-fog-300">{l.description}</p>
          <div className="flex flex-wrap gap-2">
            {l.skills.map((s) => (
              <Badge key={s}>{s}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-y border-ink-700 py-2">
            <ShareButton title={l.title} path={`/collab/${l.id}`} />
            {viewer && !d.isAuthor ? <ReportButton targetType="collab" targetId={l.id} label="Denunciar oferta" /> : null}
          </div>

          {d.isAuthor ? (
            <section className="space-y-4">
              <h2 className="font-display text-3xl">Candidaturas ({applications.length})</h2>
              {applications.length ? (
                <ul className="space-y-3">
                  {applications.map((a) => (
                    <li key={a.id} className="space-y-3 rounded-[var(--radius-md)] bg-ink-850 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link href={`/u/${a.handle}`} className="flex items-center gap-3">
                          <Avatar mediaId={a.avatar} name={a.displayName} size={36} />
                          <span>
                            <span className="block text-sm font-medium">{a.displayName}</span>
                            <span className="text-xs text-fog-500">{a.specialties.slice(0, 2).join(" · ") || `@${a.handle}`} · {timeAgo(a.createdAt)}</span>
                          </span>
                        </Link>
                        {a.status === "pending" ? (
                          <DecisionButtons applicationId={a.id} />
                        ) : a.status === "accepted" ? (
                          <span className="flex items-center gap-2">
                            <Badge tone="mint">{APP_STATUS[a.status]}</Badge>
                            <ButtonLink href={`/mensagens/nova?para=${a.handle}`} size="sm" variant="outline">
                              Mensagem
                            </ButtonLink>
                          </span>
                        ) : (
                          <Badge tone="neutral">{APP_STATUS[a.status]}</Badge>
                        )}
                      </div>
                      <p className="whitespace-pre-line text-sm text-fog-300">{a.message}</p>
                      {a.portfolioUrl ? (
                        <a href={a.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1.5 text-sm text-cobalt-400 hover:underline">
                          Portfólio <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fog-500">Ainda não há candidaturas. Compartilhe o link para alcançar mais gente.</p>
              )}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-[var(--radius-lg)] bg-ink-850 p-5 text-sm">
            <Link href={`/u/${l.authorHandle}`} className="flex items-center gap-3">
              <Avatar mediaId={l.authorAvatar} name={l.authorName} size={40} />
              <span>
                <span className="block font-medium">{l.authorName}</span>
                <span className="text-xs text-fog-500">publicado {timeAgo(l.createdAt)}</span>
              </span>
            </Link>
            <p className="flex items-center gap-2 text-fog-300">
              <Wallet className="size-4 text-fog-500" aria-hidden /> {l.isVolunteer ? "Voluntário / permuta" : l.compensation}
            </p>
            {l.location ? (
              <p className="flex items-center gap-2 text-fog-300">
                <MapPin className="size-4 text-fog-500" aria-hidden /> {l.location}
              </p>
            ) : null}
            {l.deadline ? (
              <p className="flex items-center gap-2 text-fog-300">
                <CalendarClock className="size-4 text-fog-500" aria-hidden /> Prazo: {formatDate(l.deadline)}
              </p>
            ) : null}
          </div>

          <div className="rounded-[var(--radius-lg)] bg-ink-850 p-5">
            {d.isAuthor ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-fog-500">Seu contato (visível só para aceitos)</p>
                  <p className="mt-1 break-words text-sm text-paper">{d.contact}</p>
                </div>
                <OwnerListingControls id={l.id} status={l.status} shareCode={d.shareCode} />
              </div>
            ) : d.myApplication ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Sua candidatura: <Badge tone={d.myApplication.status === "accepted" ? "mint" : d.myApplication.status === "declined" ? "neutral" : "ember"}>{APP_STATUS[d.myApplication.status]}</Badge>
                </p>
                {d.contact ? (
                  <div className="rounded-[var(--radius-sm)] bg-mint-400/10 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-mint-400">Contato liberado</p>
                    <p className="mt-1 break-words text-sm text-paper">{d.contact}</p>
                    <ButtonLink href={`/mensagens/nova?para=${l.authorHandle}`} size="sm" variant="outline" className="mt-3">
                      Mandar mensagem no FRAME
                    </ButtonLink>
                  </div>
                ) : (
                  <p className="text-xs text-fog-500">O contato aparece aqui se a candidatura for aceita.</p>
                )}
              </div>
            ) : canApply ? (
              <ApplyForm listingId={l.id} code={codigo} />
            ) : !viewer ? (
              <ButtonLink href={`/entrar?next=${encodeURIComponent(`/collab/${l.id}${codigo ? `?codigo=${codigo}` : ""}`)}`}>Entrar para se candidatar</ButtonLink>
            ) : (
              <p className="text-sm text-fog-500">Esta oportunidade não está recebendo candidaturas.</p>
            )}
          </div>

          <p className="flex gap-2 text-xs text-fog-500">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            Nunca pague para participar de um trabalho nem envie documentos pessoais. Denuncie ofertas suspeitas.
          </p>
        </aside>
      </div>
    </Container>
  );
}
