import Link from "next/link";
import { getViewer } from "@/server/session";
import { activeCreators24h, platformStats } from "@/server/services/stats";
import { dailyPublicCount, projectProgress } from "@/server/services/studio";
import { dailyPrompt, dailyTag } from "@/lib/creative/daily";
import { LAB_CHALLENGES } from "@/lib/creative/lab-challenges";
import { IconMask, IconSparks, IconStudio, IconVault, IconNodes } from "@/components/studio/icons";
import { IdeaLauncher } from "@/components/studio/idea-launcher";
import { HeroToggle } from "./hero-toggle";
import { InviteButton } from "./invite-button";

const pad = (n: number) => String(Math.max(0, Math.min(n, 999))).padStart(2, "0");

/**
 * Abertura da home no tom de um assistente: uma frase feita de dados reais com etiquetas
 * clicáveis + quatro blocos "acesos" (luz saindo de baixo, números em matriz de pontos).
 */
export async function Assistant({ minimized }: { minimized: boolean }) {
  const viewer = await getViewer();
  const daily = dailyPrompt();
  const [active, participants, progress, stats] = await Promise.all([
    activeCreators24h(),
    dailyPublicCount(dailyTag(daily)),
    viewer ? projectProgress(viewer.id) : Promise.resolve(null),
    viewer ? Promise.resolve(null) : platformStats(),
  ]);
  const first = viewer?.displayName.split(" ")[0];
  const open = progress ? progress.total - progress.done : 0;
  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section aria-labelledby="assistente" className="space-y-4">
      <div className="flex items-start gap-3">
        <h1 id="assistente" className="flex-1 text-pretty text-[clamp(1.25rem,2.6vw,2rem)] font-medium leading-[1.55] text-paper">
          {first ? <>Oi, {first}. </> : null}
          {active > 0 ? (
            <>
              <Link href="/descobrir?ordem=recentes" className="chip-mono">
                {active} {active === 1 ? "criador" : "criadores"}
              </Link>{" "}
              {active === 1 ? "publicou" : "publicaram"} hoje.{" "}
            </>
          ) : null}
          O desafio do dia é{" "}
          <Link href="/desafios" className="chip-mono">
            {daily.title}
          </Link>
          {viewer ? (
            open > 0 ? (
              <>
                , e você tem{" "}
                <Link href="/estudio?aba=tarefas" className="chip-mono">
                  {open} {open === 1 ? "tarefa" : "tarefas"}
                </Link>{" "}
                no estúdio.
              </>
            ) : (
              <>
                {" "}— que tal começar um{" "}
                <Link href="/publicar" className="chip-mono">
                  projeto
                </Link>
                ?
              </>
            )
          ) : (
            <>
              . Seu próximo projeto começa na{" "}
              <Link href="/cadastro" className="chip-mono">
                FRAME
              </Link>
              .
            </>
          )}
        </h1>
        <HeroToggle minimized={minimized} />
      </div>
      <div className="flex flex-wrap gap-2">
        {viewer ? null : (
          <>
            <Link href="/cadastro" className="inline-flex h-11 items-center rounded-full bg-volt-500 px-5 font-semibold text-ink-950 transition-transform hover:-translate-y-0.5">
              Criar minha conta grátis
            </Link>
            <Link href="/entrar" className="inline-flex h-11 items-center rounded-full px-5 text-paper ring-1 ring-inset ring-white/20 hover:bg-white/[0.06]">
              Já tenho conta
            </Link>
          </>
        )}
        {viewer ? <InviteButton label="Convidar para a FRAME" /> : null}
      </div>

      {minimized ? null : (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <li>
            <Link href="/desafios" className="tile group flex aspect-square flex-col items-center justify-between p-4 sm:aspect-[5/4] lg:aspect-auto lg:h-44" style={{ ["--glow" as string]: "rgb(255 90 31 / 0.95)" }}>
              <span className="self-start font-mono text-[11px] uppercase tracking-[0.18em] text-fog-400">Desafio do dia</span>
              <IconMask className="size-16 transition-transform duration-500 group-hover:-translate-y-1 sm:size-20 lg:size-16" />
              <span className="flex w-full items-end justify-between gap-2">
                <span className="line-clamp-1 text-left text-sm text-paper">{daily.title}</span>
                <span className="dot-num text-2xl text-paper" title="Participações públicas hoje">{pad(participants)}</span>
              </span>
            </Link>
          </li>
          <li>
            <div className="tile group flex aspect-square flex-col items-center justify-between p-4 sm:aspect-[5/4] lg:aspect-auto lg:h-44" style={{ ["--glow" as string]: "rgb(212 255 54 / 0.7)" }}>
              <span className="self-start font-mono text-[11px] uppercase tracking-[0.18em] text-fog-400">Ideia</span>
              <IconSparks className="size-16 sm:size-20 lg:size-16" />
              <IdeaLauncher signedIn={!!viewer} variant="pill" />
            </div>
          </li>
          <li>
            {viewer ? (
              <Link href="/estudio" className="tile group flex aspect-square flex-col items-center justify-between p-4 sm:aspect-[5/4] lg:aspect-auto lg:h-44" style={{ ["--glow" as string]: "rgb(107 116 255 / 0.8)" }}>
                <span className="self-start font-mono text-[11px] uppercase tracking-[0.18em] text-fog-400">Meu estúdio</span>
                <IconStudio className="size-16 transition-transform duration-500 group-hover:-translate-y-1 sm:size-20 lg:size-16" />
                <span className="flex w-full items-end justify-between gap-2">
                  <span className="text-sm text-paper">{progress && progress.total ? "Progresso" : "Projetos"}</span>
                  <span className="dot-num text-2xl text-paper">{progress && progress.total ? `${pct}%` : "--"}</span>
                </span>
              </Link>
            ) : (
              <Link href="/descobrir" className="tile group flex aspect-square flex-col items-center justify-between p-4 sm:aspect-[5/4] lg:aspect-auto lg:h-44" style={{ ["--glow" as string]: "rgb(107 116 255 / 0.8)" }}>
                <span className="self-start font-mono text-[11px] uppercase tracking-[0.18em] text-fog-400">Explorar</span>
                <IconNodes className="size-16 transition-transform duration-500 group-hover:-translate-y-1 sm:size-20 lg:size-16" />
                <span className="flex w-full items-end justify-between gap-2">
                  <span className="text-sm text-paper">Trabalhos</span>
                  <span className="dot-num text-2xl text-paper">{pad(Number(stats?.totals.posts ?? 0))}</span>
                </span>
              </Link>
            )}
          </li>
          <li>
            <Link href="/lab" className="tile group flex aspect-square flex-col items-center justify-between p-4 sm:aspect-[5/4] lg:aspect-auto lg:h-44" style={{ ["--glow" as string]: "rgb(255 170 60 / 0.8)" }}>
              <span className="self-start font-mono text-[11px] uppercase tracking-[0.18em] text-fog-400">LAB</span>
              <IconVault className="size-16 transition-transform duration-500 group-hover:-translate-y-1 sm:size-20 lg:size-16" />
              <span className="flex w-full items-end justify-between gap-2">
                <span className="text-sm text-paper">Missões</span>
                <span className="dot-num text-2xl text-paper">{pad(LAB_CHALLENGES.length)}</span>
              </span>
            </Link>
          </li>
        </ul>
      )}
    </section>
  );
}
