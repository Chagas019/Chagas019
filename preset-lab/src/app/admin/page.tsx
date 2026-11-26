import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { AdminPageHead, Empty } from "@/components/admin/page-head";
import { ProductStatusBadge, PurchaseStatusBadge, SimulatedBadge } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { cn, formatBRL, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel" };

const nf = new Intl.NumberFormat("pt-BR");

function Stat({ label, value, note, accent, href }: { label: string; value: string; note?: string; accent?: boolean; href?: string }) {
  const body = (
    <>
      <p className="lab-label text-smoke">{label}</p>
      <p className={cn("display mt-4 break-words text-[clamp(1.6rem,4vw,3.5rem)]", accent && "text-signal")}>{value}</p>
      {note && <p className="mt-2 text-xs text-smoke">{note}</p>}
    </>
  );
  return (
    <div className="min-w-0 border-b border-r hairline p-4 md:p-6">
      {href ? (
        <Link href={href} className="block transition hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

export default async function AdminDashboard() {
  await requireAdmin();
  const r = repo();
  const [stats, popular, purchases] = await Promise.all([r.adminStats(), r.listProducts({ includeUnpublished: true, sort: "popular", limit: 5 }), r.adminListPurchases()]);
  const recent = purchases.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-12">
      <AdminPageHead
        kicker="Nº 00 — Painel"
        title="Visão geral"
        description="Números reais do banco. Pedidos do checkout simulado aparecem separados e nunca entram na receita."
        actions={
          <Button asChild>
            <Link href="/admin/produtos/novo">
              <Plus /> Novo produto
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="metricas">
        <h2 id="metricas" className="sr-only">
          Métricas
        </h2>
        <div className="grid grid-cols-2 border-l border-t hairline lg:grid-cols-4">
          <Stat label="Receita real" value={formatBRL(stats.revenue_cents)} note="Pedidos pagos, sem simulados" accent href="/admin/vendas" />
          <Stat label="Pedidos pagos" value={nf.format(stats.paid_orders)} note="Pagamentos reais confirmados" href="/admin/vendas?status=paid" />
          <Stat label="Assinaturas ativas" value={nf.format(stats.active_subscriptions)} note="Premium Club" href="/admin/vendas#assinaturas" />
          <Stat label="Pedidos simulados" value={nf.format(stats.simulated_orders)} note="Checkout de teste — não é receita" />
          <Stat label="Usuários" value={nf.format(stats.users)} href="/admin/usuarios" />
          <Stat label="Produtos" value={nf.format(stats.products)} note={`${nf.format(stats.products - stats.published_products)} fora do ar`} href="/admin/produtos" />
          <Stat label="Publicados" value={nf.format(stats.published_products)} href="/admin/produtos?status=published" />
          <Stat label="Downloads" value={nf.format(stats.downloads)} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-12 xl:grid-cols-2">
        <section aria-labelledby="populares">
          <div className="flex items-baseline justify-between border-b hairline pb-3">
            <h2 id="populares" className="lab-label text-bone">
              Produtos populares
            </h2>
            <Link href="/admin/produtos" className="lab-label text-smoke hover:text-bone">
              Todos <ArrowUpRight className="inline size-3" />
            </Link>
          </div>
          {popular.length === 0 ? (
            <Empty>Nenhum produto cadastrado.</Empty>
          ) : (
            <ol>
              {popular.map((p, i) => (
                <li key={p.id} className="flex items-center gap-4 border-b hairline py-4">
                  <span className="lab-label w-6 text-smoke">{String(i + 1).padStart(2, "0")}</span>
                  <Link href={`/admin/produtos/${p.id}`} className="min-w-0 flex-1 truncate hover:text-signal">
                    {p.name}
                  </Link>
                  <ProductStatusBadge status={p.status} />
                  <span className="w-24 text-right font-mono text-sm tabular-nums">
                    {nf.format(p.downloads_count)} <span className="text-smoke">dl</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="ultimos">
          <div className="flex items-baseline justify-between border-b hairline pb-3">
            <h2 id="ultimos" className="lab-label text-bone">
              Últimos pedidos
            </h2>
            <Link href="/admin/vendas" className="lab-label text-smoke hover:text-bone">
              Vendas <ArrowUpRight className="inline size-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <Empty>Nenhum pedido ainda.</Empty>
          ) : (
            <ul>
              {recent.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b hairline py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{o.user_email}</p>
                    <p className="truncate text-xs text-smoke">
                      {formatDateTime(o.created_at)} · {o.items.map((it) => it.title).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.is_simulated && <SimulatedBadge />}
                    <PurchaseStatusBadge status={o.status} />
                    <span className="w-24 text-right font-mono text-sm tabular-nums">{formatBRL(o.total_cents)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
