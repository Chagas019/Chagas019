"use client";
import { useState } from "react";
import { saveProductAction } from "@/app/actions/admin";
import type { Category, Product } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { AdminForm, AdminFormMessage, AdminSubmit, CheckboxField, CheckboxGroup, FormSection, SelectField, TextAreaField, TextField } from "./admin-form";
import { PaletteField } from "./palette-field";
import { GalleryField, MediaUrlField } from "./upload-field";

const ACCESS_OPTIONS = [
  { value: "purchase_or_subscription", label: "Compra avulsa ou Premium Club" },
  { value: "purchase_only", label: "Somente compra avulsa" },
  { value: "subscription_only", label: "Exclusivo Premium Club" },
];

const priceText = (cents: number) => (cents > 0 ? (cents / 100).toFixed(2).replace(".", ",") : "");

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const p = product;
  const [type, setType] = useState<"free" | "premium">(p?.product_type ?? "premium");
  const [access, setAccess] = useState(p && p.access_mode !== "free" ? p.access_mode : "purchase_or_subscription");
  const [name, setName] = useState(p?.name ?? "");
  const [slugTouched, setSlugTouched] = useState(!!p);
  const [slug, setSlug] = useState(p?.slug ?? "");

  const priceRequired = type === "premium" && access !== "subscription_only";

  return (
    <AdminForm action={saveProductAction} id={p ? `produto-${p.id}` : "produto-novo"}>
      {p && <input type="hidden" name="id" value={p.id} />}

      <FormSection title="Identificação" description="Nome e endereço público do preset.">
        <TextField
          name="name"
          label="Nome"
          required
          maxLength={120}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
        <TextField
          name="slug"
          label="Slug"
          hint="Gerado a partir do nome se ficar vazio. Só letras minúsculas, números e hífens."
          maxLength={80}
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          placeholder="neon-noir"
        />
        <TextField name="short_description" label="Descrição curta" maxLength={200} defaultValue={p?.short_description} hint="Até 200 caracteres. Aparece nos cards." />
        <TextAreaField name="description" label="Descrição" rows={6} defaultValue={p?.description} />
      </FormSection>

      <FormSection title="Venda e acesso" description="Grátis é sempre livre e sem preço. Premium pode ser vendido avulso, liberado pelo Club, ou ambos.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField
            name="product_type"
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as "free" | "premium")}
            options={[
              { value: "free", label: "Grátis" },
              { value: "premium", label: "Premium" },
            ]}
          />
          {type === "premium" ? (
            <SelectField name="access_mode" label="Modo de acesso" value={access} onChange={(e) => setAccess(e.target.value as typeof access)} options={ACCESS_OPTIONS} />
          ) : (
            <div>
              <input type="hidden" name="access_mode" value="free" />
              <p className="lab-label mb-2 text-ash">Modo de acesso</p>
              <p className="flex h-12 items-center rounded-xl border hairline px-4 text-sm text-smoke">Download livre</p>
            </div>
          )}
        </div>
        {type === "premium" && (
          <TextField
            name="price"
            label={priceRequired ? "Preço (R$)" : "Preço de referência (R$, opcional)"}
            inputMode="decimal"
            placeholder="29,90"
            defaultValue={priceText(p?.price_cents ?? 0)}
            hint={priceRequired ? "Obrigatório para venda avulsa. Ex.: 29,90" : "Produtos exclusivos do Club não são vendidos avulsos."}
            className="sm:max-w-xs"
          />
        )}
      </FormSection>

      <FormSection title="Classificação">
        <SelectField name="category_id" label="Categoria principal" defaultValue={p?.category_id ?? ""} options={[{ value: "", label: "Sem categoria" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
        <CheckboxGroup name="tags" legend="Tags" options={categories.map((c) => ({ value: c.slug, label: c.name }))} defaultValues={p?.tags ?? []} hint="Usadas nos filtros do marketplace e no Style Explorer." />
        <PaletteField name="palette" label="Paleta" defaultValue={p?.palette ?? []} />
      </FormSection>

      <FormSection title="Imagens" description="Envie JPEG, PNG, WebP ou AVIF (até 10 MB) ou cole uma URL.">
        <MediaUrlField name="cover_image" label="Capa" defaultValue={p?.cover_image} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <MediaUrlField name="before_image" label="Antes" defaultValue={p?.before_image} />
          <MediaUrlField name="after_image" label="Depois" defaultValue={p?.after_image} />
        </div>
        <GalleryField name="gallery" label="Galeria" defaultValue={p?.gallery ?? []} />
      </FormSection>

      <FormSection title="Técnico">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField name="formats" label="Formatos" defaultValue={(p?.formats ?? ["XMP", "DNG"]).join(", ")} hint="Separados por vírgula. Ex.: XMP, DNG" />
          <TextField name="compatibility" label="Compatibilidade" defaultValue={(p?.compatibility ?? []).join(", ")} hint="Separados por vírgula. Ex.: Lightroom Mobile, Lightroom Classic" />
        </div>
        <TextAreaField name="install_instructions" label="Instruções de instalação" rows={5} defaultValue={p?.install_instructions} />
      </FormSection>

      <FormSection title="Criador">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField name="creator_name" label="Nome" maxLength={80} defaultValue={p?.creator_name ?? "PRESET LAB Studio"} />
          <TextField name="creator_handle" label="@ do criador" maxLength={40} defaultValue={p?.creator_handle ?? "@presetlab"} />
        </div>
        <TextAreaField name="creator_bio" label="Bio" rows={3} maxLength={500} defaultValue={p?.creator_bio} />
      </FormSection>

      <FormSection title="Publicação">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField
            name="status"
            label="Status"
            defaultValue={p?.status ?? "draft"}
            options={[
              { value: "draft", label: "Rascunho" },
              { value: "published", label: "Publicado" },
              { value: "archived", label: "Arquivado" },
            ]}
          />
          <CheckboxField name="featured" label="Destaque" hint="Aparece na vitrine da home." defaultChecked={p?.featured ?? false} className="self-end" />
        </div>
      </FormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t hairline bg-ink/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:mx-0 md:px-0">
        <AdminFormMessage className="sm:max-w-xl" />
        <AdminSubmit className="sm:ml-auto">{p ? "Salvar alterações" : "Criar produto"}</AdminSubmit>
      </div>
    </AdminForm>
  );
}
