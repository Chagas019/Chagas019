import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/types";
import { cn, formatBRL } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";

export function priceLabel(p: Pick<Product, "product_type" | "access_mode" | "price_cents">) {
  if (p.product_type === "free") return "Grátis";
  if (p.access_mode === "subscription_only") return "Premium Club";
  return formatBRL(p.price_cents);
}

export function AccessBadge({ product }: { product: Pick<Product, "product_type" | "access_mode"> }) {
  if (product.product_type === "free") return <Badge tone="free">Free</Badge>;
  if (product.access_mode === "subscription_only") return <Badge tone="club">Club</Badge>;
  return <Badge tone="premium">Premium</Badge>;
}

/**
 * Card de produto com personalidade: número de série, paleta extraída, rótulo técnico.
 * `layout` muda a proporção para criar ritmo no grid editorial.
 */
export function ProductCard({ product, index, categoryName, favorite, loggedIn, owned, layout = "portrait", priority }: { product: Product; index?: number; categoryName?: string; favorite?: boolean; loggedIn: boolean; owned?: boolean; layout?: "portrait" | "tall" | "square"; priority?: boolean }) {
  const ratio = layout === "tall" ? "aspect-[3/4.4]" : layout === "square" ? "aspect-square" : "aspect-[4/5]";
  return (
    <article className="group relative" data-testid="product-card">
      <Link href={`/presets/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className={cn("relative overflow-hidden rounded-[22px] bg-graphite", ratio)}>
          {product.cover_image && (
            <Image src={product.cover_image} alt={`Foto editada com o preset ${product.name}`} fill priority={priority} sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover transition duration-[1.2s] ease-[var(--ease-lab)] group-hover:scale-[1.045]" />
          )}
          {product.before_image && (
            <Image src={product.before_image} alt="" aria-hidden fill sizes="(min-width: 1280px) 25vw, 50vw" className="object-cover opacity-0 transition-opacity duration-700 [clip-path:inset(0_50%_0_0)] group-hover:opacity-100" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex gap-1.5">
            <AccessBadge product={product} />
            {owned && <Badge tone="ok">Na biblioteca</Badge>}
          </div>
          {typeof index === "number" && <span className="lab-label absolute right-14 top-4 hidden text-bone/70 sm:inline">Nº {String(index + 1).padStart(3, "0")}</span>}
          <div className="absolute bottom-3 left-3 flex gap-1" aria-hidden>
            {product.palette.slice(0, 4).map((c) => (
              <span key={c} className="size-3.5 rounded-full ring-1 ring-ink/40" style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-medium tracking-tight">{product.name}</h3>
            <p className="lab-label mt-1 truncate text-smoke">{categoryName ?? product.tags[0]}</p>
          </div>
          <p className={cn("shrink-0 font-mono text-sm", product.product_type === "free" ? "text-bone" : "text-signal")}>{priceLabel(product)}</p>
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteButton productId={product.id} initial={!!favorite} loggedIn={loggedIn} />
      </div>
    </article>
  );
}
