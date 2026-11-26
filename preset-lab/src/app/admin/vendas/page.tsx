import Link from "next/link";
import { AdminPageHead, Empty } from "@/components/admin/page-head";
import { PLAN_LABEL, PROVIDER_LABEL, PURCHASE_LABEL, PurchaseStatusBadge, SimulatedBadge, SubscriptionStatusBadge } from "@/components/admin/status";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";
import type { PurchaseStatus } from "@/lib/types";
import { cn, formatBRL, formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendas" };

const STATUSES: PurchaseStatus[] = ["paid", "pending", "failed", "refunded", "cancelled"];

export default async function AdminSales({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const raw = String((Array.isArray(sp.status) ? sp.status[0] : sp.status) ?? "");
  const status = (STATUSES as string[]).includes(raw) ? (raw as PurchaseStatus) : null;
  const r = repo();
  const [purchases, subs] = await Promise.all([r.adminListPurchases(), r.adminListSubscriptions()]);
  const realPaid = purchases.filter((p) => p.status === "paid" && !p.is_simulated);
  const simPaid = purchases.filter((p) => p.status === "paid" && p.is_simulated);
  const revenue = realPaid.reduce((s, p) => s + p.total_cents, 0);
  const shown = status ? purchases.filter((p) => p.status === status) : purchases;
  const tabs = [{ v: "", label: "Todos", n: purchases.length }, ...STATUSES.map((s) => ({ v: s, label: PURCHASE_LABEL[s], n: purchases.filter((p) => p.status === s).length }))];

  return (
    <div className="grid grid-cols-1 gap-10">
      <AdminPageHead kicker="Nº 04 — Comércio" title="Vendas" description="Receita considera apenas pedidos pagos por provedor real. Pedidos do checkout simulado aparecem com o selo SIMULADO." />

      <div className="grid grid-cols-1 border-l border-t hairline sm:grid-cols-3">
        <div className="border-b border-r hairline p-5 md:p-6">
          <p className="lab-label text-smoke">Receita real</p>
          <p className="display mt-4 text-[clamp(2.25rem,4vw,3.5rem)] text-signal">{formatBRL(revenue)}</p>
          <p className="mt-2 text-xs text-smoke">{realPaid.length} pedidos pagos</p>
        </div>
        <div className="border-b border-r hairline p-5 md:p-6">
          <p className="lab-label text-smoke">Simulados pagos</p>
          <p className="display mt-4 text-[clamp(2.25rem,4vw,3.5rem)]">{simPaid.length}</p>
          <p className="mt-2 text-xs text-smoke">{formatBRL(simPaid.reduce((s, p) => s + p.total_cents, 0))} em teste — não é receita</p>
        </div>
        <div className="border-b border-r hairline p-5 md:p-6">
          <p className="lab-label text-smoke">Assinaturas ativas</p>
          <p className="display mt-4 text-[clamp(2.25rem,4vw,3.5rem)]">{subs.filter((s) => s.status === "active").length}</p>
          <p className="mt-2 text-xs text-smoke">{subs.length} no total</p>
        </div>
      </div>

      <section aria-labelledby="pedidos" className="grid grid-cols-1 gap-4">
        <h2 id="pedidos" className="lab-label text-bone">
          Pedidos
        </h2>
        <nav aria-label="Filtrar por status" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {tabs.map((t) => (
            <Link
              key={t.v}
              href={t.v ? `/admin/vendas?status=${t.v}` : "/admin/vendas"}
              aria-current={(status ?? "") === t.v ? "page" : undefined}
              className={cn("shrink-0 rounded-full border px-4 py-2 text-sm transition", (status ?? "") === t.v ? "border-bone bg-bone text-ink" : "hairline text-ash hover:text-bone")}
            >
              {t.label} <span className="font-mono text-xs opacity-60">{t.n}</span>
            </Link>
          ))}
        </nav>
        {shown.length === 0 ? (
          <Empty>Nenhum pedido.</Empty>
        ) : (
          <div role="table" aria-label="Pedidos" className="border-t hairline">
            <div role="row" className="lab-label hidden grid-cols-[8.5rem_minmax(0,1.3fr)_minmax(0,2fr)_7rem_8rem_minmax(0,9rem)] gap-4 border-b hairline py-3 text-smoke lg:grid">
              <span role="columnheader">Data</span>
              <span role="columnheader">E-mail</span>
              <span role="columnheader">Itens</span>
              <span role="columnheader" className="text-right">Total</span>
              <span role="columnheader">Provedor</span>
              <span role="columnheader">Status</span>
            </div>
            {shown.map((o) => (
              <div key={o.id} role="row" className="grid grid-cols-1 gap-1 border-b hairline py-4 lg:grid-cols-[8.5rem_minmax(0,1.3fr)_minmax(0,2fr)_7rem_8rem_minmax(0,9rem)] lg:items-center lg:gap-4">
                <span role="cell" className="lab-label text-smoke">
                  {formatDateTime(o.created_at)}
                </span>
                <span role="cell" className="truncate text-sm">
                  <Link href={`/admin/usuarios/${o.user_id}`} className="hover:text-signal">
                    {o.user_email}
                  </Link>
                </span>
                <span role="cell" className="truncate text-sm text-ash">
                  {o.items.map((i) => i.title).join(", ") || "—"}
                </span>
                <span role="cell" className="font-mono text-sm tabular-nums lg:text-right">
                  {formatBRL(o.total_cents)}
                </span>
                <span role="cell" className="text-sm text-ash">
                  {PROVIDER_LABEL[o.provider] ?? o.provider}
                </span>
                <span role="cell" className="flex flex-wrap gap-1.5">
                  <PurchaseStatusBadge status={o.status} />
                  {o.is_simulated && <SimulatedBadge />}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="assinaturas" aria-labelledby="assin" className="grid grid-cols-1 gap-4">
        <h2 id="assin" className="lab-label text-bone">
          Assinaturas
        </h2>
        {subs.length === 0 ? (
          <Empty>Nenhuma assinatura.</Empty>
        ) : (
          <ul className="border-t hairline">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b hairline py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/usuarios/${s.user_id}`} className="block truncate text-sm hover:text-signal">
                    {s.user_email}
                  </Link>
                  <p className="lab-label text-smoke">
                    {PLAN_LABEL[s.plan] ?? s.plan} · desde {formatDate(s.created_at)} · até {formatDate(s.current_period_end)}
                    {s.cancel_at_period_end && " · cancela no fim do período"}
                  </p>
                </div>
                <span className="text-sm text-ash">{PROVIDER_LABEL[s.provider] ?? s.provider}</span>
                {s.is_simulated && <SimulatedBadge />}
                <SubscriptionStatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
