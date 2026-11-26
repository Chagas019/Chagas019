"use client";
import { saveCategoryAction } from "@/app/actions/admin";
import type { Category } from "@/lib/types";
import { AdminForm, AdminFormMessage, AdminSubmit, SelectField, TextAreaField, TextField } from "./admin-form";
import { MediaUrlField } from "./upload-field";

export function CategoryForm({ category }: { category?: Category }) {
  const c = category;
  return (
    <AdminForm action={saveCategoryAction} id={c ? `cat-${c.id}` : "cat-nova"} resetOnSuccess={!c} className="grid grid-cols-1 gap-5">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField name="name" label="Nome" required maxLength={60} defaultValue={c?.name} />
        <TextField name="slug" label="Slug" maxLength={80} defaultValue={c?.slug} hint="Vazio = gerado do nome." />
      </div>
      <TextAreaField name="description" label="Descrição" rows={3} maxLength={500} defaultValue={c?.description} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SelectField
          name="kind"
          label="Tipo"
          defaultValue={c?.kind ?? "style"}
          options={[
            { value: "style", label: "Estilo" },
            { value: "subject", label: "Assunto" },
          ]}
        />
        <TextField name="sort_order" label="Ordem" type="number" inputMode="numeric" defaultValue={String(c?.sort_order ?? 0)} />
      </div>
      <MediaUrlField name="cover_image" label="Capa" defaultValue={c?.cover_image} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSubmit>{c ? "Salvar categoria" : "Criar categoria"}</AdminSubmit>
        <AdminFormMessage className="flex-1" />
      </div>
    </AdminForm>
  );
}
