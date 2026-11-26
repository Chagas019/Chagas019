import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { setUserRoleAction } from "@/app/actions/admin";
import { InlineAction } from "@/components/admin/inline-action";
import { AdminPageHead, Empty } from "@/components/admin/page-head";
import { PLAN_LABEL, PROVIDER_LABEL, PurchaseStatusBadge, SimulatedBadge, SubscriptionStatusBadge } from "@/components/admin/status";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { formatBRL, formatDate, formatDateTime } from "@/lib/utils";
import { uuidSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuário" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-3">
      <h2 className="lab-label border-b hairline pb-3 text-bone">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const r = repo();
  const profile = await r.getProfile(id);
  if (!profile) notFound();
  const [purchases, subs, downloads] = await Promise.all([r.adminListPurchases({ userId: id }), r.adminListSubscriptions({ userId: id }), r.listDownloads(id)]);
  const productIds = [...new Set(downloads.map((d) => d.product_id))];
  const products = productIds.length ? await r.listProducts({ includeUnpublished: true, ids: productIds }) : [];
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const isSelf = me.id === profile.id;

  return (
    <div className="grid grid-cols-1 gap-10">
      <div className="grid grid-cols-1 gap-2">
        <Link href="/admin/usuarios" className="lab-label inline-flex items-center gap-2 text-smoke hover:text-bone">
          <ArrowLeft className="size-3.5" /> Usuários
        </Link>
        <AdminPageHead
          kicker={`Nº 05 — Conta desde ${formatDate(profile.created_at)}`}
          title={profile.display_name || profile.email}
          description={profile.email}
          actions={profile.role === "admin" ? <Badge tone="premium">Admin</Badge> : <Badge tone="neutral">Usuário</Badge>}
        />
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border hairline p-5 md:flex md:items-center md:justify-between">
        <div>
          <h2 className="lab-label text-bone">Papel</h2>
          <p className="mt-1 text-sm text-smoke">
            {isSelf ? "Você não pode remover o seu próprio acesso de administrador." : profile.role === "admin" ? "Este usuário tem acesso total ao Admin Studio." : "Administradores gerenciam catálogo, vendas e usuários."}
          </p>
        </div>
        {!isSelf &&
          (profile.role === "admin" ? (
            <InlineAction action={setUserRoleAction} fields={{ id: profile.id, role: "user" }} variant="danger" size="md" confirm="Confirmar rebaixamento" showMessage>
              Remover admin
            </InlineAction>
          ) : (
            <InlineAction action={setUserRoleAction} fields={{ id: profile.id, role: "admin" }} variant="bone" size="md" confirm="Confirmar promoção" confirmText="Acesso total ao Admin Studio." showMessage>
              Promover a admin
            </InlineAction>
          ))}
      </section>

      {profile.bio && (
        <Section title="Bio">
          <p className="text-sm leading-relaxed text-ash">{profile.bio}</p>
        </Section>
      )}

      <Section title={`Compras (${purchases.length})`}>
        {purchases.length === 0 ? (
          <Empty>Nenhuma compra.</Empty>
        ) : (
          <ul>
            {purchases.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b hairline py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{o.items.map((i) => i.title).join(", ") || "—"}</p>
                  <p className="lab-label text-smoke">
                    {formatDateTime(o.created_at)} · {PROVIDER_LABEL[o.provider] ?? o.provider}
                  </p>
                </div>
                {o.is_simulated && <SimulatedBadge />}
                <PurchaseStatusBadge status={o.status} />
                <span className="w-24 text-right font-mono text-sm tabular-nums">{formatBRL(o.total_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Assinaturas (${subs.length})`}>
        {subs.length === 0 ? (
          <Empty>Nenhuma assinatura.</Empty>
        ) : (
          <ul>
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b hairline py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{PLAN_LABEL[s.plan] ?? s.plan}</p>
                  <p className="lab-label text-smoke">
                    Até {formatDate(s.current_period_end)}
                    {s.cancel_at_period_end && " · cancela no fim do período"}
                  </p>
                </div>
                {s.is_simulated && <SimulatedBadge />}
                <SubscriptionStatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Downloads (${downloads.length})`}>
        {downloads.length === 0 ? (
          <Empty>Nenhum download.</Empty>
        ) : (
          <ul>
            {downloads.slice(0, 100).map((d) => (
              <li key={d.id} className="flex items-center gap-4 border-b hairline py-3 text-sm">
                <Link href={`/admin/produtos/${d.product_id}`} className="min-w-0 flex-1 truncate hover:text-signal">
                  {productName.get(d.product_id) ?? "Produto removido"}
                </Link>
                <span className="lab-label text-smoke">{formatDateTime(d.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
