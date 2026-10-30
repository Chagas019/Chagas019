import Link from "next/link";
import { recentMembers } from "@/server/services/discovery";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar } from "@/components/ui/misc";

/** "Quem chegou": perfis reais mais recentes, com seguir — para ver os outros usuários desde o começo. */
export async function MembersStrip({ viewerId }: { viewerId: string | null }) {
  const members = await recentMembers(viewerId, 16);
  if (!members.length) return null;
  return (
    <section aria-labelledby="quem-chegou" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="quem-chegou" className="font-mono text-xs uppercase tracking-[0.2em] text-fog-400">
          Quem chegou na FRAME
        </h2>
        <Link href="/descobrir" className="text-sm text-fog-400 hover:text-paper">
          Ver todos
        </Link>
      </div>
      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 pb-1">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 rounded-full bg-[#161715] py-1.5 pl-1.5 pr-2 ring-1 ring-inset ring-white/[0.06]">
              <Link href={`/u/${m.handle}`} className="flex min-w-0 items-center gap-2.5">
                <Avatar mediaId={m.avatarMediaId} name={m.displayName} size={36} />
                <span className="min-w-0">
                  <span className="block max-w-[9rem] truncate text-sm font-medium text-paper">{m.displayName}</span>
                  <span className="block max-w-[9rem] truncate text-xs text-fog-500">
                    {m.specialties[0] ?? `@${m.handle}`} · <span className="dot-num">{m.works}</span>
                  </span>
                </span>
              </Link>
              <FollowButton targetId={m.userId} initial={m.following} signedIn={!!viewerId} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
