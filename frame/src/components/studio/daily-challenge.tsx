import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { dailyPrompt, dailyTag } from "@/lib/creative/daily";
import { dailyPublicCount } from "@/server/services/studio";
import { ButtonLink } from "@/components/ui/button";
import { IconMask } from "./icons";

/** Desafio do dia: tema em rotação, participação por hashtag, pública ou privada. */
export async function DailyChallenge({ signedIn }: { signedIn: boolean }) {
  const p = dailyPrompt();
  const tag = dailyTag(p);
  const count = await dailyPublicCount(tag);
  const text = `${p.hint}\n\n#desafiodiario #${tag}`;
  const href = `/publicar?titulo=${encodeURIComponent(p.title)}&texto=${encodeURIComponent(text)}`;
  return (
    <section aria-labelledby="desafio-dia" className="group relative overflow-hidden rounded-[var(--radius-lg)] bg-[radial-gradient(120%_120%_at_100%_0%,rgb(255_107_44/0.28),transparent_55%),linear-gradient(180deg,#1b1c20,#0e0f11)] p-6 ring-1 ring-inset ring-white/[0.08] sm:p-8">
      <div className="flex items-start gap-5">
        <span className="btn-3d hidden size-16 shrink-0 place-items-center sm:grid">
          <IconMask className="size-10" />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff8f4d]">Desafio do dia</p>
          <h2 id="desafio-dia" className="font-display text-4xl leading-none sm:text-5xl">{p.title}</h2>
          <p className="text-pretty text-fog-300">{p.hint}</p>
          <p className="flex items-center gap-1.5 text-xs text-fog-500">
            <Lock className="size-3.5" aria-hidden /> Pode participar em “Só eu”: conta no seu histórico sem aparecer para ninguém.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ButtonLink href={signedIn ? href : `/entrar?next=${encodeURIComponent(href)}`}>
              Participar <ArrowUpRight className="size-4" aria-hidden />
            </ButtonLink>
            {count > 0 ? (
              <Link href={`/descobrir?q=${encodeURIComponent("#" + tag)}`} className="text-sm text-fog-300 underline-offset-4 hover:text-paper hover:underline">
                Ver {count} {count === 1 ? "participação" : "participações"}
              </Link>
            ) : (
              <span className="text-sm text-fog-500">Seja a primeira pessoa hoje.</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
