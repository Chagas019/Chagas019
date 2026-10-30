"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { deleteAccountAction, updateNotificationPrefsAction } from "@/server/actions/profile";
import { authClient } from "@/lib/auth-client";
import type { NotificationPrefs } from "@/server/db/schema";

const PREF_LABELS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "follow", label: "Novos seguidores", description: "Quando alguém começa a seguir você." },
  { key: "comment", label: "Comentários", description: "Comentários nos seus trabalhos." },
  { key: "reply", label: "Respostas", description: "Respostas aos seus comentários." },
  { key: "mention", label: "Menções e marcações", description: "Quando alguém cita você com @ ou marca você nos créditos." },
  { key: "like", label: "Curtidas", description: "Desligado por padrão para evitar ruído." },
  { key: "challenge", label: "Desafios", description: "Início da votação e resultados dos desafios em que você participa." },
  { key: "community", label: "Comunidades", description: "Pedidos de entrada e aprovações." },
  { key: "collab", label: "Collab", description: "Candidaturas às suas oportunidades e respostas às suas." },
];

export function NotificationPrefsForm({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <section className="space-y-3">
      <h2 className="font-display text-3xl">Notificações</h2>
      <p className="text-sm text-fog-500">O FRAME não envia notificações artificiais para aumentar seu tempo de tela.</p>
      <div className="divide-y divide-ink-700">
        {PREF_LABELS.map((p) => (
          <Switch key={p.key} checked={prefs[p.key] ?? true} onChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))} label={p.label} description={p.description} />
        ))}
      </div>
      <Button
        variant="secondary"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await updateNotificationPrefsAction(prefs);
            toast.show(r.ok ? (r.message ?? "Salvo.") : r.error, r.ok ? "success" : "error");
          })
        }
      >
        Salvar preferências
      </Button>
    </section>
  );
}

export function PasswordForm() {
  const [pending, setPending] = useState(false);
  const toast = useToast();
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const newPassword = String(fd.get("newPassword"));
        if (newPassword.length < 8) return toast.show("A nova senha precisa de 8+ caracteres.", "error");
        setPending(true);
        const { error } = await authClient.changePassword({ currentPassword: String(fd.get("currentPassword")), newPassword, revokeOtherSessions: true });
        setPending(false);
        if (error) return toast.show("Senha atual incorreta.", "error");
        form.reset();
        toast.show("Senha alterada. Outras sessões foram encerradas.");
      }}
    >
      <h3 className="text-lg font-medium">Alterar senha</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Senha atual" id="currentPassword">
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="Nova senha" id="newPassword">
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <Button type="submit" variant="secondary" loading={pending}>
        Alterar senha
      </Button>
    </form>
  );
}

export function DataControls() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Exportar meus dados</h3>
        <p className="text-sm text-fog-500">Baixe um arquivo JSON com seu perfil, publicações, comentários, conexões e preferências (LGPD, art. 18).</p>
        <a href="/api/conta/exportar" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink-750 px-4 text-sm hover:bg-ink-700">
          <Download className="size-4" aria-hidden /> Baixar meus dados
        </a>
      </div>
      <form
        className="space-y-4 rounded-[var(--radius-md)] bg-danger-500/[0.06] p-5 ring-1 ring-danger-500/20"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const r = await deleteAccountAction({ password: String(fd.get("password")), confirmation: String(fd.get("confirmation")) });
            if (!r.ok) return setError(r.error);
            router.push("/?conta=excluida");
            router.refresh();
          });
        }}
      >
        <h3 className="text-lg font-medium text-danger-400">Excluir conta</h3>
        <p className="text-sm text-fog-400">Apaga definitivamente seu perfil, publicações, arquivos, comentários e conexões. Comunidades que você criou passam para outro administrador. Isso não pode ser desfeito.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha" id="del-password">
            <Input id="del-password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Field label='Digite "EXCLUIR"' id="confirmation">
            <Input id="confirmation" name="confirmation" required autoComplete="off" />
          </Field>
        </div>
        {error ? <p role="alert" className="text-sm text-danger-400">{error}</p> : null}
        <Button type="submit" variant="danger" loading={pending}>
          Excluir minha conta
        </Button>
      </form>
    </div>
  );
}
