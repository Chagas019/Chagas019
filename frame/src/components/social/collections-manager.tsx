"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createCollectionAction, deleteCollectionAction } from "@/server/actions/social";

export function CollectionsManager({ activeId }: { activeId: string | null }) {
  const [open, setOpen] = useState(false);
  const [isPublic, setPublic] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FolderPlus className="size-4" aria-hidden /> Nova coleção
      </Button>
      {activeId ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger-400"
          loading={pending}
          onClick={() =>
            confirm("Excluir esta coleção? Os itens continuam salvos.") &&
            start(async () => {
              const r = await deleteCollectionAction(activeId);
              toast.show(r.ok ? (r.message ?? "Excluída.") : r.error, r.ok ? "success" : "error");
              router.push("/salvos");
            })
          }
        >
          <Trash2 className="size-4" aria-hidden /> Excluir coleção
        </Button>
      ) : null}
      <Dialog open={open} onClose={() => setOpen(false)} title="Nova coleção">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name") ?? "");
            start(async () => {
              const r = await createCollectionAction({ name, isPublic });
              if (!r.ok) return toast.show(r.error, "error");
              setOpen(false);
              router.push(`/salvos?colecao=${r.data.id}`);
            });
          }}
        >
          <Field label="Nome" id="col-name">
            <Input id="col-name" name="name" maxLength={60} required />
          </Field>
          <Switch checked={isPublic} onChange={setPublic} label="Coleção pública" description="Aparece na aba Coleções do seu portfólio." />
          <Button type="submit" loading={pending}>Criar</Button>
        </form>
      </Dialog>
    </>
  );
}
