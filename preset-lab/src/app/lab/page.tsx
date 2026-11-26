import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import { AccessBadge } from "@/components/product/product-card";
import { EmptyState, LabSectionTitle, Notice } from "@/components/lab/lab-ui";
import { requireUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { getEntitlements } from "@/lib/services/entitlements";
import { includedInSubscription } from "@/lib/services/access";
import type { Product, ProductFile } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Minha biblioteca" };

type Origin = "owned" | "free" | "club";
const GROUPS: { origin: Origin; kicker: string; title: string; note: string }[] = [
  { origin: "owned", kicker: "Compra avulsa", title: "Comprados", note: "Seus para sempre — continuam aqui mesmo sem assinatura." },
  { origin: "club", kicker: "Assinatura ativa", title: "Premium Club", note: "Disponíveis enquanto a sua assinatura estiver ativa." },
  { origin: "free", kicker: "Grátis", title: "Gratuitos", note: "Presets gratuitos que você já baixou." },
];

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ senha?: string; "bem-vindo"?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/lab");
  const r = repo();
  const [ent, downloads, products] = await Promise.all([getEntitlements(user), r.listDownloads(user.id), r.listProducts()]);

  const downloadedIds = new Set(downloads.map((d) => d.product_id));
  const items: { product: Product; origin: Origin }[] = [];
  for (const p of products) {
    if (ent.ownedIds.has(p.id)) items.push({ product: p, origin: "owned" });
    else if (ent.subscription && includedInSubscription(p.access_mode)) items.push({ product: p, origin: "club" });
    else if (p.access_mode === "free" && downloadedIds.has(p.id)) items.push({ product: p, origin: "free" });
  }
  const files = new Map<string, ProductFile[]>(await Promise.all(items.map(async ({ product }) => [product.id, await r.listProductFiles(product.id)] as const)));

  return (
    <div className="space-y-16 md:space-y-20">
      {(sp.senha === "atualizada" || sp["bem-vindo"] === "1") && (
        <div className="space-y-3">
          {sp["bem-vindo"] === "1" && <Notice>E-mail confirmado. Bem-vindo ao PRESET LAB — este é o seu laboratório.</Notice>}
          {sp.senha === "atualizada" && <Notice>Senha atualizada com sucesso.</Notice>}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState number="00" title={<>Biblioteca <span className="serif-accent text-signal">vazia</span></>} text="Comece pelos presets gratuitos: baixe um e ele passa a morar aqui, junto com tudo o que você comprar ou liberar no Premium Club." href="/presets?acesso=free" cta="Explorar presets gratuitos" />
      ) : (
        GROUPS.map((g) => {
          const list = items.filter((i) => i.origin === g.origin);
          if (list.length === 0) return null;
          return (
            <section key={g.origin} aria-labelledby={`grupo-${g.origin}`}>
              <LabSectionTitle kicker={`${g.kicker} · ${list.length} ${list.length === 1 ? "preset" : "presets"}`} title={<span id={`grupo-${g.origin}`}>{g.title}</span>} aside={<p className="max-w-xs text-sm text-smoke">{g.note}</p>} />
              <ul className="mt-8 border-t hairline">
                {list.map(({ product }) => (
                  <LibraryRow key={product.id} product={product} files={files.get(product.id) ?? []} origin={g.origin} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

const ORIGIN_LABEL: Record<Origin, string> = { owned: "Comprado", free: "Gratuito", club: "Premium Club" };

function LibraryRow({ product, files, origin }: { product: Product; files: ProductFile[]; origin: Origin }) {
  return (
    <li className="grid grid-cols-[72px_1fr] gap-4 border-b hairline py-5 md:grid-cols-[96px_1fr_auto] md:items-center md:gap-6" data-testid="library-item">
      <Link href={`/presets/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-[14px] bg-graphite" tabIndex={-1} aria-hidden>
        {product.cover_image && <Image src={product.cover_image} alt="" fill sizes="96px" className="object-cover" />}
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <AccessBadge product={product} />
          <span className="lab-label text-smoke">{ORIGIN_LABEL[origin]}</span>
        </div>
        <h3 className="mt-2 truncate text-[19px] font-medium tracking-tight">
          <Link href={`/presets/${product.slug}`} className="link-underline">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-ash">{product.short_description}</p>
      </div>
      <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1 md:justify-end">
        {files.length === 0 ? (
          <p className="text-sm text-smoke">Arquivos em preparação.</p>
        ) : (
          files.map((f) => (
            <form key={f.id} method="post" action={`/api/download/${f.id}`}>
              <button type="submit" data-testid="download-button" title={`${f.file_name} · ${formatBytes(f.size_bytes)}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-bone/25 px-5 text-sm font-medium transition hover:border-signal hover:bg-signal hover:text-signal-ink">
                <Download className="size-4" aria-hidden />
                Baixar .{f.format.toUpperCase()}
                <span className="font-mono text-[11px] opacity-60">{formatBytes(f.size_bytes)}</span>
              </button>
            </form>
          ))
        )}
      </div>
    </li>
  );
}
