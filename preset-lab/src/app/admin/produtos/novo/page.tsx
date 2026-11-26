import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHead } from "@/components/admin/page-head";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await repo().listCategories();
  return (
    <div className="grid grid-cols-1 gap-2">
      <Link href="/admin/produtos" className="lab-label inline-flex items-center gap-2 text-smoke hover:text-bone">
        <ArrowLeft className="size-3.5" /> Produtos
      </Link>
      <AdminPageHead kicker="Nº 01 — Catálogo" title="Novo produto" description="Depois de criar, você poderá enviar os arquivos do preset (.xmp, .dng, .zip...)." />
      <ProductForm categories={categories} />
    </div>
  );
}
