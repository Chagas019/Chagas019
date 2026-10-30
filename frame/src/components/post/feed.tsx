"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ImageOff, Plus, RefreshCw } from "lucide-react";
import { InviteButton } from "@/components/home/invite-button";
import type { FeedPage } from "@/server/services/posts";
import { loadFeedAction } from "@/server/actions/posts";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { PostGrid, PostGridSkeleton } from "./post-card";
import { EditorialGrid, EditorialSkeleton } from "./editorial-grid";

export function Feed({ filter, initial, signedIn, viewerId = null, variant = "grid" }: { filter: string; initial: FeedPage; signedIn: boolean; viewerId?: string | null; variant?: "grid" | "editorial" }) {
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
      <GrowthPanel signedIn={signedIn} empty />
    );
  }

  return (
    <>
      {variant === "editorial" ? (
        <EditorialGrid cards={items} signedIn={signedIn} viewerId={viewerId} onHide={(authorId) => setItems((prev) => prev.filter((p) => p.authorId !== authorId))} />
      ) : (
        <PostGrid cards={items} signedIn={signedIn} viewerId={viewerId} onHide={(authorId) => setItems((prev) => prev.filter((p) => p.authorId !== authorId))} />
      )}
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
          {variant === "editorial" ? <EditorialSkeleton /> : <PostGridSkeleton count={4} />}
        </div>
      ) : cursor ? (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={loadMore}>
            Carregar mais
          </Button>
        </div>
      ) : items.length < 8 ? (
        <GrowthPanel signedIn={signedIn} />
      ) : (
        <p className="mt-10 text-center text-sm text-fog-500">Você chegou ao fim. Volte mais tarde para novas inspirações.</p>
      )}
    </>
  );
}

/** A comunidade está começando: convite claro para criar conta, publicar e chamar mais gente. */
function GrowthPanel({ signedIn, empty }: { signedIn: boolean; empty?: boolean }) {
  return (
    <section className="tile mt-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8" style={{ ["--glow" as string]: "rgb(212 255 54 / 0.35)" }}>
      <div className="max-w-xl space-y-1.5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-volt-500">{empty ? "Feed vazio por enquanto" : "A comunidade está começando"}</p>
        <h3 className="text-pretty text-2xl font-medium text-paper">
          {signedIn ? "Publique seu trabalho e chame quem cria com você — cada nova conta enche este feed." : "Crie sua conta grátis e publique o que você cria. Cada pessoa tem o próprio perfil e portfólio."}
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {signedIn ? (
          <Link href="/publicar" className="inline-flex h-11 items-center gap-2 rounded-full bg-volt-500 px-5 font-semibold text-ink-950">
            <Plus className="size-4" aria-hidden /> Publicar
          </Link>
        ) : (
          <Link href="/cadastro" className="inline-flex h-11 items-center gap-2 rounded-full bg-volt-500 px-5 font-semibold text-ink-950">
            Criar minha conta
          </Link>
        )}
        <InviteButton />
      </div>
    </section>
  );
}
