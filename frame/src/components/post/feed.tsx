"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ImageOff, RefreshCw } from "lucide-react";
import type { FeedPage } from "@/server/services/posts";
import { loadFeedAction } from "@/server/actions/posts";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { PostGrid, PostGridSkeleton } from "./post-card";

export function Feed({ filter, initial, signedIn, viewerId = null }: { filter: string; initial: FeedPage; signedIn: boolean; viewerId?: string | null }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!cursor || pending) return;
    start(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setError("Sem conexão com a internet.");
        return;
      }
      const r = await loadFeedAction(filter, cursor).catch(() => null);
      if (!r || !r.ok) {
        setError(r && !r.ok ? r.error : "Não foi possível carregar mais trabalhos.");
        return;
      }
      setError(null);
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return prev.concat(r.data.items.filter((p) => !seen.has(p.id)));
      });
      setCursor(r.data.nextCursor);
    });
  }, [cursor, filter, pending]);

  // Carregamento progressivo: busca a próxima página quando o fim da grade se aproxima.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || error) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, error, loadMore]);

  if (items.length === 0) {
    return filter === "seguindo" ? (
      <EmptyState icon={<ImageOff className="size-6" />} title="Seu feed de seguidos está vazio" action={<ButtonLink href="/descobrir">Descobrir criadores</ButtonLink>}>
        Siga criadores para ver os trabalhos deles aqui, em ordem cronológica.
      </EmptyState>
    ) : (
      <EmptyState icon={<ImageOff className="size-6" />} title="Nada por aqui ainda" action={signedIn ? <ButtonLink href="/publicar">Publicar o primeiro</ButtonLink> : <ButtonLink href="/cadastro">Criar conta</ButtonLink>}>
        Ainda não há trabalhos nesta seleção. Que tal ser a primeira pessoa a publicar?
      </EmptyState>
    );
  }

  return (
    <>
      <PostGrid cards={items} signedIn={signedIn} viewerId={viewerId} onHide={(authorId) => setItems((prev) => prev.filter((p) => p.authorId !== authorId))} />
      <div ref={sentinel} aria-hidden />
      {error ? (
        <div role="alert" className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-fog-400">{error}</p>
          <Button variant="outline" onClick={() => { setError(null); loadMore(); }}>
            <RefreshCw className="size-4" aria-hidden /> Tentar de novo
          </Button>
        </div>
      ) : pending ? (
        <div className="mt-5" aria-live="polite">
          <PostGridSkeleton count={4} />
        </div>
      ) : cursor ? (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={loadMore}>
            Carregar mais
          </Button>
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-fog-500">Você chegou ao fim. Volte mais tarde para novas inspirações.</p>
      )}
    </>
  );
}
