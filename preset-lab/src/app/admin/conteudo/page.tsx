import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AdminPageHead } from "@/components/admin/page-head";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conteúdo" };

export default async function AdminContent() {
  await requireAdmin();
  const r = repo();
  const [collections, inspiration, banners] = await Promise.all([r.listCollections({ includeUnpublished: true }), r.listInspiration({ includeUnpublished: true }), r.listBanners({ includeInactive: true })]);
  const items = [
    { href: "/admin/conteudo/colecoes", n: "03.1", title: "Coleções", total: collections.length, live: collections.filter((c) => c.status === "published").length, liveLabel: "publicadas", text: "Pacotes de presets, vendidos juntos ou exclusivos do Club." },
    { href: "/admin/conteudo/inspiracoes", n: "03.2", title: "Inspirações", total: inspiration.length, live: inspiration.filter((c) => c.status === "published").length, liveLabel: "publicadas", text: "Referências visuais com paleta e presets relacionados." },
    { href: "/admin/conteudo/banners", n: "03.3", title: "Banners", total: banners.length, live: banners.filter((b) => b.active).length, liveLabel: "ativos", text: "Destaques da home, com link interno." },
  ];
  return (
    <div className="grid grid-cols-1 gap-10">
      <AdminPageHead kicker="Nº 03 — Editorial" title="Conteúdo" description="Tudo o que organiza e apresenta o catálogo." />
      <ul className="grid border-l border-t hairline md:grid-cols-3">
        {items.map((it) => (
          <li key={it.href} className="border-b border-r hairline">
            <Link href={it.href} className="group block p-6 transition hover:bg-bone/[0.03]">
              <p className="lab-label text-smoke">{it.n}</p>
              <p className="display mt-4 text-5xl">{it.total}</p>
              <p className="mt-4 flex items-center gap-2 text-lg">
                {it.title} <ArrowUpRight className="size-4 text-signal transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </p>
              <p className="lab-label mt-1 text-smoke">
                {it.live} {it.liveLabel}
              </p>
              <p className="mt-3 text-sm text-ash">{it.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
