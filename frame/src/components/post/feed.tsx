"use client";

import { useState, useTransition } from "react";
import { ImageOff } from "lucide-react";
import type { FeedPage } from "@/server/services/posts";
import { loadFeedAction } from "@/server/actions/posts";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { PostGrid } from "./post-card";

export function Feed({ filter, initial, signedIn }: { filter: string; initial: FeedPage; signedIn: boolean }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, start] = useTransition();
  const toast = useToast();

  if (items.length === 0) {
    return filter === "seguindo" ? (
      <EmptyState icon={<ImageOff className="size-6" />} title="Seu feed de seguidos está vazio" action={<ButtonLink href="/descobrir">Descobrir talentos</ButtonLink>}>
        Siga criadores para ver os trabalhos deles aqui, em ordem cronológica.
      </EmptyState>
    ) : (
      <EmptyState icon={<ImageOff className="size-6" />} title="Nada por aqui ainda" action={signedIn ? <ButtonLink href="/publicar">Publicar o primeiro</ButtonLink> : <ButtonLink href="/cadastro">Criar conta</ButtonLink>}>
        Ainda não há trabalhos nesta categoria. Que tal ser a primeira pessoa a publicar?
      </EmptyState>
    );
  }

  return (
    <>
      <PostGrid cards={items} signedIn={signedIn} />
      {cursor ? (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await loadFeedAction(filter, cursor);
                if (!r.ok) return toast.show(r.error, "error");
                setItems((prev) => {
                  const seen = new Set(prev.map((p) => p.id));
                  return prev.concat(r.data.items.filter((p) => !seen.has(p.id)));
                });
                setCursor(r.data.nextCursor);
              })
            }
          >
            Carregar mais
          </Button>
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-fog-500">Você chegou ao fim. Volte mais tarde para novas inspirações.</p>
      )}
    </>
  );
}
