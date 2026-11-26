import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";
import { BeforeAfter } from "@/components/product/before-after";
import { BuyForm } from "@/components/product/buy-form";
import { DownloadList } from "@/components/product/download-list";
import { FavoriteButton } from "@/components/product/favorite-button";
import { AccessBadge, ProductCard, priceLabel } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { ACCESS_LABEL, canBePurchased, includedInSubscription } from "@/lib/services/access";
import { accessFor, getEntitlements } from "@/lib/services/entitlements";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await repo().getProductBySlug(slug);
  if (!p) return { title: "Preset não encontrado" };
  return { title: p.name, description: p.short_description, openGraph: { images: p.cover_image ? [p.cover_image] : [] } };
}

const DEFAULT_STEPS = [
  { t: "Lightroom Mobile", d: "Abra uma foto › Predefinições › menu ⋯ › Importar predefinições › escolha o .xmp ou o .zip." },
  { t: "Lightroom Classic / Desktop", d: "Arquivo › Importar perfis e predefinições › selecione o .xmp ou o .zip." },
  { t: "Depois de aplicar", d: "Ajuste exposição e temperatura para a sua luz. Presets são ponto de partida, não regra." },
];

export default async function PresetPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const r = repo();
  const product = await r.getProductBySlug(slug, { includeUnpublished: user?.profile.role === "admin" });
  if (!product) notFound();

  const ent = await getEntitlements(user);
  const access = accessFor(product, user, ent);
  const [categories, related, files] = await Promise.all([
    r.listCategories(),
    r.listProducts({ category: product.tags[0], limit: 9 }),
    access.allowed ? r.listProductFiles(product.id) : Promise.resolve([]),
  ]);
  const category = categories.find((c) => c.id === product.category_id);
  const tagNames = product.tags.map((t) => categories.find((c) => c.slug === t)?.name ?? t);
  const relatedList = related.filter((p) => p.id !== product.id).slice(0, 4);
  const gallery = product.gallery.filter((g) => g !== product.after_image);
  const back = `/presets/${product.slug}`;
  const steps = product.install_instructions.trim()
    ? product.install_instructions.split(/\n+/).filter(Boolean).map((line, i) => ({ t: `Passo ${i + 1}`, d: line }))
    : DEFAULT_STEPS;

  return (
    <article>
      <div className="container-lab pt-6">
        <Link href="/presets" className="lab-label inline-flex items-center gap-2 text-smoke hover:text-bone">
          <ArrowLeft className="size-3.5" aria-hidden /> Marketplace
        </Link>
      </div>

      <div className="container-lab mt-6 grid gap-10 lg:grid-cols-12 lg:gap-12">
        {/* mídia */}
        <div className="lg:col-span-7">
          {product.before_image && product.after_image ? (
            <BeforeAfter before={product.before_image} after={product.after_image} alt={product.name} priority className="rounded-[28px]" />
          ) : product.cover_image ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
              <Image src={product.cover_image} alt={product.name} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-cover" />
            </div>
          ) : null}
          {gallery.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {gallery.map((g, i) => (
                <div key={g} className={`relative overflow-hidden rounded-[22px] ${i === 0 && gallery.length % 2 === 1 ? "col-span-2 aspect-[16/10]" : "aspect-[4/5]"}`}>
                  <Image src={g} alt={`${product.name} — exemplo ${i + 1}`} fill sizes="(min-width:1024px) 30vw, 50vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* compra / download */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <div className="flex flex-wrap items-center gap-2">
              <AccessBadge product={product} />
              {product.is_demo && <span className="lab-label rounded-full border border-bone/20 px-2.5 py-1 text-ash">Produto de demonstração</span>}
              {product.status !== "published" && <span className="lab-label rounded-full bg-danger/15 px-2.5 py-1 text-danger">{product.status === "draft" ? "Rascunho" : "Arquivado"} — visível só para admins</span>}
            </div>
            <p className="lab-label mt-6 text-smoke">{category?.name ?? "Preset"}</p>
            <h1 className="display mt-2 text-[clamp(3.2rem,8vw,6.5rem)]">{product.name}</h1>
            <p className="mt-4 font-serif text-2xl italic leading-snug text-ash">{product.short_description}</p>

            <div className="mt-8 flex items-end justify-between border-y hairline py-5">
              <div>
                <p className="lab-label text-smoke">Acesso</p>
                <p className="mt-1 text-sm">{ACCESS_LABEL[product.access_mode]}</p>
              </div>
              <p className="display text-5xl text-signal" data-testid="product-price">
                {priceLabel(product)}
              </p>
            </div>

            <div className="mt-6 grid gap-3" data-testid="access-panel" data-access={access.reason}>
              {access.allowed ? (
                <>
                  <p className="flex items-center gap-2 text-sm text-ok">
                    <Check className="size-4" aria-hidden />
                    {access.reason === "free" ? "Gratuito para sua conta" : access.reason === "owned" ? "Este preset é seu" : access.reason === "subscription" ? "Liberado pela sua assinatura Premium Club" : "Acesso de administrador"}
                  </p>
                  <DownloadList files={files} />
                </>
              ) : access.reason === "login_required" ? (
                <>
                  <Button asChild size="lg" className="w-full">
                    <Link href={`/entrar?next=${encodeURIComponent(back)}`}>{product.product_type === "free" ? "Entrar para baixar grátis" : "Entrar para comprar"}</Link>
                  </Button>
                  <p className="text-center text-sm text-ash">
                    Ainda não tem conta?{" "}
                    <Link href={`/cadastro`} className="text-bone underline underline-offset-4">
                      Crie grátis
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  {canBePurchased(product.access_mode) && <BuyForm type="product" id={product.id} back={back} label={`Comprar por ${formatBRL(product.price_cents)}`} />}
                  {includedInSubscription(product.access_mode) && (
                    <Button asChild size="lg" variant={canBePurchased(product.access_mode) ? "outline" : "signal"} className="w-full">
                      <Link href="/premium">
                        {product.access_mode === "subscription_only" ? (
                          <>
                            <Lock /> Exclusivo do Premium Club
                          </>
                        ) : (
                          "Ou acesse com o Premium Club"
                        )}
                      </Link>
                    </Button>
                  )}
                  {product.access_mode === "purchase_only" && <p className="text-center text-xs text-smoke">Pacote vendido só avulso — não incluso na assinatura.</p>}
                </>
              )}
              <FavoriteButton productId={product.id} initial={ent.favoriteIds.has(product.id)} loggedIn={!!user} variant="full" className="w-full" />
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
              <div>
                <dt className="lab-label text-smoke">Formatos</dt>
                <dd className="mt-1.5">{product.formats.join(" · ") || "—"}</dd>
              </div>
              <div>
                <dt className="lab-label text-smoke">Downloads</dt>
                <dd className="mt-1.5 font-mono">{product.downloads_count}</dd>
              </div>
              <div className="col-span-2">
                <dt className="lab-label text-smoke">Compatível com</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {product.compatibility.map((c) => (
                    <span key={c} className="rounded-full border border-bone/15 px-3 py-1 text-xs text-ash">
                      {c}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="lab-label text-smoke">Estilos</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {product.tags.map((t, i) => (
                    <Link key={t} href={`/presets?categoria=${t}`} className="rounded-full bg-bone/8 px-3 py-1 text-xs hover:bg-signal hover:text-signal-ink">
                      {tagNames[i]}
                    </Link>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      {/* descrição, paleta, instalação, criador */}
      <section className="container-lab mt-20 grid gap-12 border-t hairline pt-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="lab-label text-signal">Sobre o preset</p>
          <div className="mt-5 space-y-5 text-[17px] leading-relaxed text-ash">
            {product.description.split(/\n{2,}/).map((para, i) => (
              <p key={i} className={i === 0 ? "font-serif text-3xl italic leading-snug text-bone" : undefined}>
                {para}
              </p>
            ))}
          </div>
          {product.palette.length > 0 && (
            <div className="mt-12">
              <p className="lab-label text-smoke">Paleta</p>
              <div className="mt-4 flex overflow-hidden rounded-2xl">
                {product.palette.map((c) => (
                  <div key={c} className="h-24 flex-1 p-2" style={{ background: c }}>
                    <span className="font-mono text-[10px] mix-blend-difference">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-10 lg:col-span-5">
          <div>
            <p className="lab-label text-signal">Como instalar</p>
            <ol className="mt-5 space-y-5">
              {steps.map((s, i) => (
                <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-3">
                  <span className="display text-3xl text-smoke">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-medium">{s.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ash">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/ajuda" className="link-underline mt-5 inline-block text-sm">
              Guia completo de instalação
            </Link>
          </div>
          <div className="rounded-[22px] bg-graphite p-6">
            <p className="lab-label text-smoke">Criador</p>
            <p className="mt-3 text-xl font-medium">{product.creator_name || "PRESET LAB"}</p>
            {product.creator_handle && <p className="font-mono text-sm text-signal">{product.creator_handle}</p>}
            {product.creator_bio && <p className="mt-3 text-sm leading-relaxed text-ash">{product.creator_bio}</p>}
            {product.published_at && <p className="lab-label mt-4 text-smoke">Publicado em {formatDate(product.published_at)}</p>}
          </div>
        </div>
      </section>

      {relatedList.length > 0 && (
        <section className="container-lab mt-24">
          <div className="flex items-end justify-between">
            <h2 className="display text-[clamp(2.4rem,6vw,4.5rem)]">
              Do mesmo <span className="serif-accent text-signal">clima</span>
            </h2>
            <Link href={`/presets?categoria=${product.tags[0]}`} className="hidden items-center gap-2 text-sm md:flex">
              Ver mais <ArrowRight className="size-4 text-signal" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {relatedList.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} categoryName={categories.find((c) => c.id === p.category_id)?.name} favorite={ent.favoriteIds.has(p.id)} owned={ent.ownedIds.has(p.id)} loggedIn={!!user} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
