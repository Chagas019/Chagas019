import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { BuyForm } from "@/components/product/buy-form";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { PLANS } from "@/lib/payments/plans";
import { repo } from "@/lib/repo";
import { getEntitlements } from "@/lib/services/entitlements";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Premium Club", description: "Assinatura com presets exclusivos, coleções especiais e novidades antes de todo mundo." };

const FAQ = [
  { q: "Como funciona a cobrança?", a: "O Premium Club é pré-pago: você paga o período (mês ou ano) via Mercado Pago, com PIX ou cartão. Não há cobrança automática — para continuar, é só renovar; o novo período é somado ao atual." },
  { q: "O que fica liberado?", a: "Todos os presets marcados como “Exclusivo Premium Club”, as coleções do Club e os presets premium que estão disponíveis para assinantes. Pacotes marcados como “somente compra avulsa” não entram." },
  { q: "E quando o período acabar?", a: "Os presets exclusivos voltam a ficar bloqueados para novos downloads. O que você comprou avulso continua seu para sempre." },
  { q: "Posso pedir reembolso?", a: "O direito de arrependimento do Código de Defesa do Consumidor (7 dias) vale para compras online. Reembolsos são processados pelo Mercado Pago e removem o acesso ao item reembolsado." },
];

export default async function PremiumPage() {
  const user = await getCurrentUser();
  const r = repo();
  const [products, collections, ent] = await Promise.all([r.listProducts({ access: "premium" }), r.listCollections(), getEntitlements(user)]);
  const exclusive = products.filter((p) => p.access_mode === "subscription_only");
  const included = products.filter((p) => p.access_mode === "purchase_or_subscription");
  const clubCollections = collections.filter((c) => c.is_premium);
  const sub = ent.subscription;

  return (
    <>
      <section className="relative overflow-hidden bg-signal text-signal-ink">
        <div className="container-lab grid gap-10 py-14 md:py-20 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="lab-label">Premium Club</p>
            <h1 className="display mt-4 text-[clamp(3.6rem,12vw,10rem)]">
              O clube
              <br />
              do <span className="serif-accent">estúdio.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg">Presets exclusivos, coleções especiais, pacotes premium e conteúdos de edição — com novidades chegando primeiro para quem é do Club.</p>
            {sub && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-signal-ink px-4 py-2 text-sm text-signal" data-testid="club-active">
                <Check className="size-4" /> Sua assinatura está ativa até {formatDate(sub.current_period_end)}
              </p>
            )}
          </div>
          <div className="grid content-end gap-4 lg:col-span-5">
            {Object.values(PLANS).map((p) => (
              <div key={p.id} className="rounded-[24px] bg-signal-ink p-6 text-bone">
                <div className="flex items-baseline justify-between">
                  <p className="lab-label text-ash">{p.name.replace("Premium Club — ", "")}</p>
                  <p className="text-sm text-ash">{p.note}</p>
                </div>
                <p className="display mt-3 text-6xl">
                  {formatBRL(p.price_cents)}
                  <span className="serif-accent text-2xl text-ash"> /{p.period}</span>
                </p>
                <div className="mt-5">
                  {user ? (
                    <BuyForm type="plan" id={p.id} back="/premium" label={sub ? "Renovar — soma ao período atual" : "Assinar"} testId={`subscribe-${p.id}`} />
                  ) : (
                    <Button asChild size="lg" className="w-full">
                      <Link href="/entrar?next=/premium">Entrar para assinar</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs opacity-75">Pagamento pré-pago via Mercado Pago (PIX ou cartão). Sem renovação automática.</p>
          </div>
        </div>
      </section>

      <section className="container-lab py-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="display text-[clamp(2.6rem,6vw,5rem)]">
            Exclusivos <span className="serif-accent text-signal">do Club</span>
          </h2>
          {!sub && (
            <span className="lab-label hidden items-center gap-2 text-smoke md:flex">
              <Lock className="size-3.5" /> Bloqueados sem assinatura
            </span>
          )}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {exclusive.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} favorite={ent.favoriteIds.has(p.id)} owned={ent.ownedIds.has(p.id)} loggedIn={!!user} />
          ))}
        </div>
        {exclusive.length === 0 && <p className="mt-6 text-ash">Os próximos exclusivos chegam em breve.</p>}
      </section>

      {clubCollections.length > 0 && (
        <section className="container-lab">
          <h2 className="display text-[clamp(2.6rem,6vw,5rem)]">Coleções especiais</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {clubCollections.map((c) => (
              <Link key={c.id} href={`/colecoes/${c.slug}`} className="group relative block aspect-[16/10] overflow-hidden rounded-[26px]">
                {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition duration-1000 group-hover:scale-105" />}
                <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
                <div className="absolute bottom-0 p-6">
                  <p className="lab-label text-signal">{c.product_ids.length} presets</p>
                  <h3 className="display mt-2 text-5xl">{c.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-lab py-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="display text-[clamp(2.6rem,6vw,5rem)]">
              Também <span className="serif-accent text-signal">incluso</span>
            </h2>
            <p className="mt-4 text-ash">Presets premium que você pode comprar avulso — ou usar à vontade enquanto for assinante.</p>
          </div>
          <ul className="border-t hairline lg:col-span-7">
            {included.map((p) => (
              <li key={p.id} className="border-b hairline">
                <Link href={`/presets/${p.slug}`} className="flex items-center justify-between gap-4 py-4 hover:text-signal">
                  <span className="text-lg">{p.name}</span>
                  <span className="font-mono text-sm text-smoke">avulso {formatBRL(p.price_cents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-lab">
        <h2 className="display text-[clamp(2.6rem,6vw,5rem)]">Perguntas</h2>
        <div className="mt-8 divide-y divide-bone/10 border-y hairline">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg">
                {f.q}
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-bone/20 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-ash">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
