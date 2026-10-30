"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell, BellOff, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { joinCommunityAction, leaveCommunityAction, moderateMemberAction, regenerateInviteAction, removeCommunityPostAction, setCommunityNotifyAction } from "@/server/actions/community";

export function JoinButton({ communityId, slug, status, access, inviteCode, signedIn }: { communityId: string; slug: string; status: string | null; access: string; inviteCode?: string; signedIn: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!signedIn) return <Button onClick={() => router.push(`/entrar?next=/comunidades/${slug}${inviteCode ? `?convite=${inviteCode}` : ""}`)}>Entrar para participar</Button>;
  if (status === "active")
    return (
      <Button
        variant="outline"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await leaveCommunityAction(communityId, slug);
            toast.show(r.ok ? (r.message ?? "Feito.") : r.error, r.ok ? "success" : "error");
            router.refresh();
          })
        }
      >
        Sair da comunidade
      </Button>
    );
  if (status === "pending") return <Button variant="secondary" disabled>Pedido enviado</Button>;
  if (status === "banned") return null;
  if (access === "invite" && !inviteCode) return <p className="text-sm text-fog-500">Entrada apenas por link de convite.</p>;
  return (
    <Button
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await joinCommunityAction(communityId, slug, inviteCode);
          if (!r.ok) return toast.show(r.error, "error");
          toast.show(r.data.status === "active" ? "Bem-vindo à comunidade!" : "Pedido enviado à administração.");
          router.refresh();
        })
      }
    >
      {access === "private" ? "Pedir para entrar" : "Participar"}
    </Button>
  );
}

export function NotifyToggle({ communityId, slug, notify }: { communityId: string; slug: string; notify: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      aria-pressed={notify}
      onClick={() =>
        start(async () => {
          const r = await setCommunityNotifyAction(communityId, slug, !notify);
          toast.show(r.ok ? (r.message ?? "Feito.") : r.error, r.ok ? "success" : "error");
          router.refresh();
        })
      }
    >
      {notify ? <Bell className="size-4" aria-hidden /> : <BellOff className="size-4" aria-hidden />}
      {notify ? "Notificações ativas" : "Notificações desativadas"}
    </Button>
  );
}

export function InviteLink({ communityId, slug, code }: { communityId: string; slug: string; code: string }) {
  const [current, setCurrent] = useState(code);
  const [pending, start] = useTransition();
  const toast = useToast();
  const path = `/comunidades/${slug}?convite=${current}`;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fog-200">Link de convite</p>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 truncate rounded-[var(--radius-xs)] bg-ink-900 px-3 py-2 text-xs text-fog-300">{path}</code>
        <Button
          size="icon"
          variant="secondary"
          aria-label="Copiar link de convite"
          onClick={async () => {
            await navigator.clipboard.writeText(`${window.location.origin}${path}`);
            toast.show("Link copiado.");
          }}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Gerar novo link"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await regenerateInviteAction(communityId, slug);
              if (!r.ok) return toast.show(r.error, "error");
              setCurrent(r.data.code);
              toast.show(r.message ?? "Novo link gerado.");
            })
          }
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function MemberControls({ communityId, slug, userId, status, role }: { communityId: string; slug: string; userId: string; status: string; role: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const act = (a: "approve" | "reject" | "ban" | "promote" | "demote") =>
    start(async () => {
      const r = await moderateMemberAction(communityId, slug, userId, a);
      toast.show(r.ok ? (r.message ?? "Feito.") : r.error, r.ok ? "success" : "error");
      router.refresh();
    });
  if (role === "owner") return null;
  return (
    <div className="flex gap-1">
      {status === "pending" ? (
        <>
          <Button size="sm" disabled={pending} onClick={() => act("approve")}>Aprovar</Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("reject")}>Recusar</Button>
        </>
      ) : (
        <>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(role === "admin" ? "demote" : "promote")}>
            {role === "admin" ? "Remover admin" : "Tornar admin"}
          </Button>
          <Button size="sm" variant="ghost" className="text-danger-400" disabled={pending} onClick={() => confirm("Banir esta pessoa da comunidade?") && act("ban")}>
            Banir
          </Button>
        </>
      )}
    </div>
  );
}

export function RemovePostButton({ communityId, slug, postId }: { communityId: string; slug: string; postId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      className="text-xs text-fog-500 hover:text-danger-400"
      onClick={() =>
        confirm("Remover esta publicação da comunidade?") &&
        start(async () => {
          const r = await removeCommunityPostAction(communityId, slug, postId);
          toast.show(r.ok ? (r.message ?? "Removida.") : r.error, r.ok ? "success" : "error");
          router.refresh();
        })
      }
    >
      Remover
    </button>
  );
}
