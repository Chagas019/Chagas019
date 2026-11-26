"use client";
import { saveBannerAction, saveCollectionAction, saveInspirationAction } from "@/app/actions/admin";
import type { Banner, Collection, InspirationPost } from "@/lib/types";
import { AdminForm, AdminFormMessage, AdminSubmit, CheckboxField, CheckboxGroup, FormSection, SelectField, TextAreaField, TextField } from "./admin-form";
import { PaletteField } from "./palette-field";
import { MediaUrlField } from "./upload-field";

type ProductOption = { value: string; label: string; meta?: string };

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicado" },
];

function Footer({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3 border-t hairline pt-6 sm:flex-row sm:items-center">
      <AdminSubmit>{label}</AdminSubmit>
      <AdminFormMessage className="flex-1" />
    </div>
  );
}

export function CollectionForm({ collection, products }: { collection?: Collection; products: ProductOption[] }) {
  const c = collection;
  return (
    <AdminForm action={saveCollectionAction} id={c ? `col-${c.id}` : "col-nova"}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <FormSection title="Coleção">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField name="title" label="Título" required maxLength={120} defaultValue={c?.title} />
          <TextField name="slug" label="Slug" maxLength={80} defaultValue={c?.slug} hint="Vazio = gerado do título." />
        </div>
        <TextAreaField name="description" label="Descrição" rows={4} defaultValue={c?.description} />
        <MediaUrlField name="cover_image" label="Capa" defaultValue={c?.cover_image} />
      </FormSection>
      <FormSection title="Venda" description="Com preço, a coleção é vendida como pacote. Exclusiva do Club: liberada para assinantes.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField name="price" label="Preço do pacote (R$, opcional)" inputMode="decimal" placeholder="49,90" defaultValue={c?.price_cents ? (c.price_cents / 100).toFixed(2).replace(".", ",") : ""} />
          <CheckboxField name="is_premium" label="Premium Club" hint="Coleção exclusiva para assinantes." defaultChecked={c?.is_premium ?? false} className="self-end" />
        </div>
      </FormSection>
      <FormSection title="Produtos">
        <CheckboxGroup name="product_ids" legend="Produtos da coleção" options={products} defaultValues={c?.product_ids ?? []} />
      </FormSection>
      <FormSection title="Publicação">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <SelectField name="status" label="Status" defaultValue={c?.status ?? "draft"} options={STATUS_OPTIONS} />
          <TextField name="sort_order" label="Ordem" type="number" inputMode="numeric" defaultValue={String(c?.sort_order ?? 0)} />
          <CheckboxField name="featured" label="Destaque" defaultChecked={c?.featured ?? false} className="self-end" />
        </div>
      </FormSection>
      <Footer label={c ? "Salvar coleção" : "Criar coleção"} />
    </AdminForm>
  );
}

export function InspirationForm({ post, products }: { post?: InspirationPost; products: ProductOption[] }) {
  const p = post;
  return (
    <AdminForm action={saveInspirationAction} id={p ? `insp-${p.id}` : "insp-nova"}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <FormSection title="Inspiração">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField name="title" label="Título" required maxLength={120} defaultValue={p?.title} />
          <TextField name="slug" label="Slug" maxLength={80} defaultValue={p?.slug} hint="Vazio = gerado do título." />
        </div>
        <TextField name="style_name" label="Estilo" maxLength={80} defaultValue={p?.style_name} placeholder="Ex.: Cinematic noturno" />
        <MediaUrlField name="image_url" label="Imagem (obrigatória)" defaultValue={p?.image_url} />
        <PaletteField name="palette" label="Paleta" defaultValue={p?.palette ?? []} />
        <TextAreaField name="description" label="Descrição" rows={4} defaultValue={p?.description} />
      </FormSection>
      <FormSection title="Produtos relacionados">
        <CheckboxGroup name="product_ids" legend="Presets usados" options={products} defaultValues={p?.product_ids ?? []} />
      </FormSection>
      <FormSection title="Publicação">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField name="status" label="Status" defaultValue={p?.status ?? "draft"} options={STATUS_OPTIONS} />
          <TextField name="sort_order" label="Ordem" type="number" inputMode="numeric" defaultValue={String(p?.sort_order ?? 0)} />
        </div>
      </FormSection>
      <Footer label={p ? "Salvar inspiração" : "Criar inspiração"} />
    </AdminForm>
  );
}

export function BannerForm({ banner }: { banner?: Banner }) {
  const b = banner;
  return (
    <AdminForm action={saveBannerAction} id={b ? `ban-${b.id}` : "ban-novo"} resetOnSuccess={!b} className="grid grid-cols-1 gap-5">
      {b && <input type="hidden" name="id" value={b.id} />}
      <TextField name="title" label="Título" required maxLength={120} defaultValue={b?.title} />
      <TextAreaField name="subtitle" label="Subtítulo" rows={2} maxLength={300} defaultValue={b?.subtitle} />
      <MediaUrlField name="image_url" label="Imagem" defaultValue={b?.image_url} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField name="link_url" label="Link interno" defaultValue={b?.link_url ?? "/presets"} hint="Precisa começar com / (ex.: /premium)." />
        <TextField name="link_label" label="Rótulo do botão" maxLength={40} defaultValue={b?.link_label ?? "Explorar"} />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField name="position" label="Posição" type="number" inputMode="numeric" defaultValue={String(b?.position ?? 0)} hint="Menor aparece primeiro." />
        <CheckboxField name="active" label="Ativo" hint="Exibido na home." defaultChecked={b?.active ?? true} className="self-end" />
      </div>
      <Footer label={b ? "Salvar banner" : "Criar banner"} />
    </AdminForm>
  );
}
