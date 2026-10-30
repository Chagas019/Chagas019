"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setFollowerApprovalAction } from "@/server/actions/social";

type Follower = { userId: string; approved: boolean; handle: string; displayName: string; avatar: string | null };

export function FollowersList({ followers }: { followers: Follower[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!followers.length) return <p className="text-sm text-fog-500">Ninguém segue você ainda.</p>;
  const waiting = followers.filter((f) => !f.approved).length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-fog-500">
        {waiting ? `${waiting} ${waiting === 1 ? "seguidor aguarda" : "seguidores aguardam"} aprovação.` : "Todos os seguidores estão aprovados."} Aprovar libera as publicações “Seguidores aprovados”.
      </p>
      <ul className="divide-y divide-ink-700">
        {followers.map((f) => (
          <li key={f.userId} className="flex items-center justify-between gap-3 py-2.5">
            <Link href={`/u/${f.handle}`} className="flex min-w-0 items-center gap-3 text-sm">
              <Avatar mediaId={f.avatar} name={f.displayName} size={32} />
              <span className="truncate">
                {f.displayName} <span className="text-fog-500">@{f.handle}</span>
              </span>
            </Link>
            <Button
              size="sm"
              variant={f.approved ? "ghost" : "secondary"}
              disabled={pending}
              aria-label={f.approved ? `Revogar acesso de @${f.handle}` : `Aprovar @${f.handle}`}
              onClick={() =>
                start(async () => {
                  const r = await setFollowerApprovalAction(f.userId, !f.approved);
                  toast.show(r.ok ? (r.message ?? "Feito.") : r.error, r.ok ? "success" : "error");
                  router.refresh();
                })
              }
            >
              {f.approved ? "Revogar" : "Aprovar"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
