"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chips";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { updateProfileAction } from "@/server/actions/profile";
import { CATEGORIES, SPECIALTIES, type CategorySlug } from "@/lib/taxonomy";
import type { ProfileLink } from "@/server/db/schema";

type ProfileData = {
  handle: string;
  displayName: string;
  bio: string;
  specialties: string[];
  interests: string[];
  location: string | null;
  showLocation: boolean;
  links: ProfileLink[];
  gear: string;
  tools: string[];
  availableForWork: boolean;
  contactEmail: string | null;
  contactVisibility: "nobody" | "members" | "following";
  isIndexable: boolean;
  autoApproveFollowers: boolean;
  accentColor: "violet" | "blue" | "ember" | "mint";
};

const specialtyOptions = SPECIALTIES.map((s) => ({ slug: s, label: s }));

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const toast = useToast();
  const [specialties, setSpecialties] = useState(profile.specialties);
  const [interests, setInterests] = useState(profile.interests as CategorySlug[]);
  const [links, setLinks] = useState(profile.links);
  const [flags, setFlags] = useState({ showLocation: profile.showLocation, availableForWork: profile.availableForWork, isIndexable: profile.isIndexable, autoApproveFollowers: profile.autoApproveFollowers });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await updateProfileAction({
            handle: fd.get("handle"),
            displayName: fd.get("displayName"),
            bio: fd.get("bio"),
            specialties,
            interests,
            location: fd.get("location"),
            gear: fd.get("gear"),
            tools: String(fd.get("tools") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
            links: links.filter((l) => l.label || l.url),
            contactEmail: fd.get("contactEmail"),
            contactVisibility: fd.get("contactVisibility"),
            accentColor: fd.get("accentColor"),
            ...flags,
          });
          if (!r.ok) {
            setErrors(r.fields ?? {});
            return toast.show(r.error, "error");
          }
          setErrors({});
          toast.show(r.message ?? "Salvo.");
          router.refresh();
        });
      }}
    >
      <section className="space-y-5">
        <h2 className="font-display text-3xl">Perfil</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome de exibição" id="displayName" error={errors.displayName}>
            <Input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={60} />
          </Field>
          <Field label="Identificador" id="handle" error={errors.handle}>
            <Input id="handle" name="handle" defaultValue={profile.handle} autoCapitalize="none" spellCheck={false} />
          </Field>
        </div>
        <Field label="Biografia" id="bio" optional error={errors.bio}>
          <Textarea id="bio" name="bio" defaultValue={profile.bio} maxLength={500} rows={4} />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium text-fog-200">Especialidades</p>
          <ChipGroup label="Especialidades" options={specialtyOptions} value={specialties} onChange={setSpecialties} max={6} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-fog-200">Interesses (moldam seu feed)</p>
          <ChipGroup label="Interesses" options={CATEGORIES} value={interests} onChange={setInterests} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Equipamento" id="gear" optional>
            <Textarea id="gear" name="gear" defaultValue={profile.gear} rows={3} maxLength={500} />
          </Field>
          <Field label="Ferramentas" id="tools" optional hint="Separe por vírgula">
            <Input id="tools" name="tools" defaultValue={profile.tools.join(", ")} />
          </Field>
        </div>
        <Field label="Cor de destaque do portfólio" id="accentColor">
          <Select id="accentColor" name="accentColor" defaultValue={profile.accentColor}>
            <option value="violet">Violeta</option>
            <option value="blue">Azul</option>
            <option value="ember">Âmbar</option>
            <option value="mint">Menta</option>
          </Select>
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium text-fog-200">Links externos</p>
          {links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <Input aria-label="Rótulo do link" placeholder="Instagram, site…" value={l.label} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Input aria-label="Endereço do link" placeholder="https://" value={l.url} invalid={!!errors[`links.${i}.url`]} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remover link" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {Object.entries(errors).filter(([k]) => k.startsWith("links")).map(([k, v]) => (
            <p key={k} className="text-sm text-danger-400">{v}</p>
          ))}
          {links.length < 6 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setLinks((ls) => [...ls, { label: "", url: "" }])}>
              <Plus className="size-4" aria-hidden /> Adicionar link
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl">Trabalho e contato</h2>
        <Switch checked={flags.availableForWork} onChange={(v) => setFlags((f) => ({ ...f, availableForWork: v }))} label="Disponível para trabalhos" description="Mostra um selo no portfólio e na descoberta." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail de contato" id="contactEmail" optional error={errors.contactEmail} hint="Pode ser diferente do e-mail da conta.">
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={profile.contactEmail ?? ""} />
          </Field>
          <Field label="Quem vê o contato" id="contactVisibility">
            <Select id="contactVisibility" name="contactVisibility" defaultValue={profile.contactVisibility}>
              <option value="nobody">Ninguém</option>
              <option value="members">Pessoas logadas no FRAME</option>
              <option value="following">Só quem eu sigo</option>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl">Privacidade</h2>
        <Field label="Localização" id="location" optional hint="Cidade ou região. Nunca pedimos localização precisa.">
          <Input id="location" name="location" defaultValue={profile.location ?? ""} maxLength={80} />
        </Field>
        <Switch checked={flags.showLocation} onChange={(v) => setFlags((f) => ({ ...f, showLocation: v }))} label="Mostrar localização no perfil" description="Desligado por padrão." />
        <Switch checked={flags.isIndexable} onChange={(v) => setFlags((f) => ({ ...f, isIndexable: v }))} label="Permitir que buscadores indexem meu portfólio" description="Seu perfil e trabalhos públicos poderão aparecer no Google e outros buscadores." />
        <Switch checked={flags.autoApproveFollowers} onChange={(v) => setFlags((f) => ({ ...f, autoApproveFollowers: v }))} label="Aprovar novos seguidores automaticamente" description="Desligado: quem segue você só vê publicações “Seguidores aprovados” depois que você aprovar." />
      </section>

      <Button type="submit" size="lg" loading={pending}>
        Salvar alterações
      </Button>
    </form>
  );
}
