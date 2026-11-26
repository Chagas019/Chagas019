import Link from "next/link";
import { Search } from "lucide-react";
import { AdminPageHead, Empty } from "@/components/admin/page-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth";
import { normalize } from "@/lib/catalog";
import { repo } from "@/lib/repo";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuários" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const pick = (k: string) => String((Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "");
  const q = pick("q").trim().slice(0, 80);
  const role = pick("papel") === "admin" || pick("papel") === "user" ? pick("papel") : "";
  const all = await repo().adminListUsers();
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  const users = all.filter((u) => (!role || u.role === role) && terms.every((t) => normalize(`${u.email ?? ""} ${u.display_name}`).includes(t)));

  return (
    <div className="grid grid-cols-1 gap-8">
      <AdminPageHead kicker="Nº 05 — Pessoas" title="Usuários" description={`${all.length} contas · ${all.filter((u) => u.role === "admin").length} administradores.`} />
      <form method="get" role="search" className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <div>
          <Label htmlFor="busca-usuario">Buscar por e-mail ou nome</Label>
          <Input id="busca-usuario" name="q" defaultValue={q} />
        </div>
        <div>
          <Label htmlFor="filtro-papel">Papel</Label>
          <Select id="filtro-papel" name="papel" defaultValue={role}>
            <option value="">Todos</option>
            <option value="admin">Administradores</option>
            <option value="user">Usuários</option>
          </Select>
        </div>
        <Button type="submit" variant="outline" className="h-12">
          <Search /> Filtrar
        </Button>
      </form>

      {users.length === 0 ? (
        <Empty>Nenhum usuário encontrado.</Empty>
      ) : (
        <ul className="border-t hairline">
          {users.map((u) => (
            <li key={u.id}>
              <Link href={`/admin/usuarios/${u.id}`} className="grid grid-cols-1 gap-1 border-b hairline py-4 transition hover:bg-bone/[0.03] md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_7rem_8rem] md:items-center md:gap-4 md:px-2">
                <span className="truncate text-sm">
                  {u.email}
                  {u.id === me.id && <span className="lab-label ml-2 text-smoke">você</span>}
                </span>
                <span className="truncate text-sm text-ash">{u.display_name || "—"}</span>
                <span>{u.role === "admin" ? <Badge tone="premium">Admin</Badge> : <Badge tone="neutral">Usuário</Badge>}</span>
                <span className="lab-label text-smoke md:text-right">{formatDate(u.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
