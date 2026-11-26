import type { Metadata } from "next";
import { Check } from "lucide-react";
import { BuyForm } from "@/components/product/buy-form";
import { LabSectionTitle, SubscriptionStatusBadge } from "@/components/lab/lab-ui";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { PLANS } from "@/lib/payments/plans";
import { repo } from "@/lib/repo";
import { getEntitlements } from "@/lib/services/entitlements";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Assinatura" };

const PERKS = ["Todos os presets exclusivos do Club", "Presets premium marcados como incluídos na assinatura", "Coleções especiais e lançamentos antecipados"];

export default async function SubscriptionPage() {
  const user = await requireUser("/lab/assinatura");
  const [ent, history] = await Promise.all([getEntitlements(user), repo().listSubscriptions(user.id)]);
  const sub = ent.subscription;

  return (
    <div className="space-y-16 md:space-y-20">
      {sub && (
        <section aria-labelledby="assinatura-atual">
          <div className="relative overflow-hidden rounded-[28px] bg-signal p-6 text-signal-ink md:p-10">
            <p className="lab-label">Assinatura atual</p>
            <h2 id="assinatura-atual" className="display mt-4 text-[clamp(2.6rem,7vw,5.5rem)]">
              {PLANS[sub.plan]?.name.replace("Premium Club — ", "Club ") ?? sub.plan}
            </h2>
            <p className="mt-6 text-xl font-medium md:text-2xl" data-testid="subscription-valid-until">
              Seu acesso vale até {formatDate(sub.current_period_end)}.
            </p>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed opacity-80">Pagamento pré-pago por período: não há cobrança automática. Quando o período terminar, o acesso ao Club se encerra — presets comprados avulso continuam na sua biblioteca.</p>
            {sub.is_simulated && <p className="lab-label mt-6 inline-block rounded-full bg-signal-ink px-3 py-1.5 text-signal">Assinatura simulada · ambiente de desenvolvimento</p>}
          </div>
        </section>
      )}

      <section aria-labelledby="planos">
        <LabSectionTitle
          kicker={sub ? "Renovação antecipada" : "Sem assinatura ativa"}
          title={<span id="planos">{sub ? <>Renovar <span className="serif-accent text-signal">período</span></> : <>Premium <span className="serif-accent text-signal">Club</span></>}</span>}
          aside={<p className="max-w-xs text-sm text-smoke">{sub ? "O novo período é somado ao fim do período atual — você não perde nenhum dia." : "Pagamento pré-pago por período, com PIX ou cartão. Sem cobrança automática."}</p>}
        />
        {!sub && (
          <ul className="mt-6 space-y-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] text-ash">
                <Check className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden /> {p}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-6">
          {Object.values(PLANS).map((plan) => {
            const yearly = plan.id === "premium_yearly";
            return (
              <div key={plan.id} className={yearly ? "relative flex flex-col rounded-[28px] bg-bone p-6 text-ink md:p-8" : "relative flex flex-col rounded-[28px] border hairline bg-graphite p-6 md:p-8"}>
                <div className="flex items-center justify-between gap-3">
                  <p className="lab-label">{yearly ? "Anual" : "Mensal"}</p>
                  {yearly && <Badge tone="premium">Melhor valor</Badge>}
                </div>
                <p className="display mt-6 text-[clamp(3rem,7vw,4.75rem)]">
                  {formatBRL(plan.price_cents)}
                  <span className="serif-accent ml-2 text-[0.4em] opacity-70">/{plan.period}</span>
                </p>
                <p className={yearly ? "mt-3 text-sm text-ink/70" : "mt-3 text-sm text-ash"}>{plan.note}</p>
                <div className="mt-auto pt-8">
                  <BuyForm type="plan" id={plan.id} back="/lab/assinatura" label={sub ? "Renovar — soma ao período atual" : `Assinar ${yearly ? "anual" : "mensal"}`} variant={yearly ? "signal" : "bone"} testId={`subscribe-${plan.id}`} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {history.length > 0 && (
        <section aria-labelledby="historico">
          <LabSectionTitle kicker={`${history.length} ${history.length === 1 ? "registro" : "registros"}`} title={<span id="historico">Histórico</span>} />
          <ol className="mt-8 border-t hairline">
            {history.map((s) => (
              <li key={s.id} className="grid gap-2 border-b hairline py-5 sm:grid-cols-12 sm:items-center sm:gap-6">
                <p className="text-[17px] font-medium tracking-tight sm:col-span-4">{PLANS[s.plan]?.name ?? s.plan}</p>
                <p className="lab-label text-smoke sm:col-span-3">Desde {formatDate(s.created_at)}</p>
                <p className="lab-label text-smoke sm:col-span-3">Até {formatDate(s.current_period_end)}</p>
                <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
                  <SubscriptionStatusBadge status={s.status} />
                  {s.is_simulated && <Badge tone="danger">Simulada</Badge>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
