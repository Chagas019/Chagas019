import Link from "next/link";
import { Plus, Search, Star } from "lucide-react";
import { deleteProductAction, setProductFeaturedAction, setProductStatusAction } from "@/app/actions/admin";
import { InlineAction } from "@/components/admin/inline-action";
import { AdminPageHead, Empty, Notice } from "@/components/admin/page-head";
import { ProductStatusBadge } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth";
import { normalize } from "@/lib/catalog";
import { repo } from "@/lib/repo";
import type { Product } from "@/lib/types";
import { cn, formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produtos" };

const STATUSES = [
  { value: "", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Rascunhos" },
  { value: "archived", label: "Arquivados" },
];
const ACCESS_LABEL: Record<string, string> = { free: "Grátis", purchase_or_subscription: "Avulso ou Club", purchase_only: "Só avulso", subscription_only: "Exclusivo Club" };

function priceLabel(p: Product) {
  if (p.product_type === "free") return "Grátis";
  if (p.access_mode === "subscription_only") return "Club";
  return formatBRL(p.price_cents);
}

export default async function AdminProducts({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const pick = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const status = ["published", "draft", "archived"].includes(pick("status")) ? pick("status") : "";
  const q = pick("q").trim().slice(0, 80);

  const all = await repo().listProducts({ includeUnpublished: true, sort: "recent" });
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  const products = all.filter((p) => (!status || p.status === status) && terms.every((t) => normalize(p.name).includes(t)));
  const count = (s: string) => (s ? all.filter((p) => p.status === s).length : all.length);

  return (
    <div className="grid grid-cols-1 gap-8">
      <AdminPageHead
        kicker="Nº 01 — Catálogo"
        title="Produtos"
        description={`${all.length} produtos no total · ${count("published")} publicados.`}
        actions={
          <Button asChild>
            <Link href="/admin/produtos/novo">
              <Plus /> Novo produto
            </Link>
          </Button>
        }
      />
      {pick("excluido") === "1" && <Notice>Produto excluído.</Notice>}

      <form method="get" role="search" className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <div>
          <Label htmlFor="busca-produto">Buscar por nome</Label>
          <Input id="busca-produto" name="q" defaultValue={q} placeholder="Ex.: Neon" />
        </div>
        <div>
          <Label htmlFor="filtro-status">Status</Label>
          <Select id="filtro-status" name="status" defaultValue={status}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} ({count(s.value)})
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="outline" className="h-12">
          <Search /> Filtrar
        </Button>
      </form>

      {products.length === 0 ? (
        <Empty>{all.length ? "Nenhum produto com esses filtros." : "Nenhum produto cadastrado. Crie o primeiro."}</Empty>
      ) : (
        <div role="table" aria-label="Produtos" className="border-t hairline">
          <div role="row" className="lab-label hidden grid-cols-[minmax(0,2.4fr)_7rem_8rem_7rem_6rem_minmax(0,2fr)] gap-4 border-b hairline py-3 text-smoke xl:grid">
            <span role="columnheader">Nome</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Tipo</span>
            <span role="columnheader" className="text-right">Preço</span>
            <span role="columnheader" className="text-right">Downloads</span>
            <span role="columnheader" className="text-right">Ações</span>
          </div>
          {products.map((p) => (
            <div key={p.id} role="row" className="grid grid-cols-1 gap-3 border-b hairline py-4 xl:grid-cols-[minmax(0,2.4fr)_7rem_8rem_7rem_6rem_minmax(0,2fr)] xl:items-center xl:gap-4">
              <div role="cell" className="flex min-w-0 items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-graphite-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.cover_image && <img src={p.cover_image} alt="" className="size-full object-cover" loading="lazy" />}
                </div>
                <div className="min-w-0">
                  <Link href={`/admin/produtos/${p.id}`} className="block truncate font-medium hover:text-signal">
                    {p.name}
                  </Link>
                  <p className="truncate font-mono text-xs text-smoke">
                    /{p.slug}
                    {p.featured && (
                      <span className="ml-2 inline-flex items-center gap-1 text-signal">
                        <Star className="size-3 fill-current" aria-hidden /> destaque
                      </span>
                    )}
                    {p.is_demo && <span className="ml-2">· demo</span>}
                  </p>
                </div>
              </div>
              <div role="cell" className="flex flex-wrap items-center gap-2 text-sm xl:contents">
                <span className="xl:block">
                  <ProductStatusBadge status={p.status} />
                </span>
                <span className="text-ash xl:block">{p.product_type === "free" ? "Grátis" : `Premium · ${ACCESS_LABEL[p.access_mode]}`}</span>
                <span className="font-mono tabular-nums xl:block xl:text-right">{priceLabel(p)}</span>
                <span className="font-mono tabular-nums text-ash xl:block xl:text-right">
                  {p.downloads_count} <span className="xl:hidden">downloads</span>
                </span>
              </div>
              <div role="cell" className="flex flex-wrap gap-2 xl:justify-end">
                {p.status === "published" ? (
                  <InlineAction action={setProductStatusAction} fields={{ id: p.id, status: "draft" }}>
                    Despublicar
                  </InlineAction>
                ) : (
                  <InlineAction action={setProductStatusAction} fields={{ id: p.id, status: "published" }} variant="bone">
                    Publicar
                  </InlineAction>
                )}
                {p.status !== "archived" && (
                  <InlineAction action={setProductStatusAction} fields={{ id: p.id, status: "archived" }} variant="ghost">
                    Arquivar
                  </InlineAction>
                )}
                <InlineAction action={setProductFeaturedAction} fields={{ id: p.id, featured: p.featured ? "false" : "true" }} variant="ghost">
                  <Star className={cn(p.featured && "fill-current text-signal")} aria-hidden />
                  {p.featured ? "Tirar destaque" : "Destacar"}
                </InlineAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/produtos/${p.id}`}>Editar</Link>
                </Button>
                <InlineAction action={deleteProductAction} fields={{ id: p.id }} variant="ghost" confirm="Confirmar exclusão" confirmText={`Excluir “${p.name}” e seus arquivos?`}>
                  Excluir
                </InlineAction>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
