"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { startConversationAction } from "@/server/actions/messages";

export function NewConversationForm({ defaultTo }: { defaultTo: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [to, setTo] = useState(defaultTo);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const isGroup = to.split(/[,\s]+/).filter(Boolean).length > 1;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await startConversationAction({ handles: to.split(/[,\s]+/), title: String(fd.get("title") ?? ""), body: String(fd.get("body") ?? "") });
          if (!r.ok) {
            setErrors(r.fields ?? {});
            return toast.show(r.error, "error");
          }
          router.push(`/mensagens/${r.data.id}`);
        });
      }}
    >
      <Field label="Para" id="to" error={errors.handles} hint="@identificador. Separe por vírgula para criar um grupo (até 10 pessoas).">
        <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} autoCapitalize="none" spellCheck={false} placeholder="@lia.luz" />
      </Field>
      {isGroup ? (
        <Field label="Nome do grupo" id="title" optional>
          <Input id="title" name="title" maxLength={80} />
        </Field>
      ) : null}
      <Field label="Mensagem" id="body" error={errors.body}>
        <Textarea id="body" name="body" rows={4} maxLength={4000} />
      </Field>
      <Button type="submit" loading={pending}>
        Enviar
      </Button>
    </form>
  );
}
