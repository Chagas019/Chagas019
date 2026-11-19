"use client";
import Link from "next/link";
import { useState } from "react";
import { usePoll, brl, fmtDate, fmtNum } from "@/lib/api";
import { Card, PageHeader, Table, Td, StateBadge, Loading, ErrorBox, Input, Select, Button, Badge } from "./ui";

const STATES = ["PENDING", "RESEARCHING", "APPROVED", "COPY_GENERATED", "READY_TO_PUBLISH", "PUBLISHING", "PUBLISHED", "FAILED", "REJECTED"];

export function ProductList({ title, subtitle, fixedStates }: { title: string; subtitle: string; fixedStates?: string[] }) {
  const [state, setState] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(fixedStates ? "score" : "recent");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), sort, ...(fixedStates ? { states: fixedStates.join(",") } : state ? { state } : {}), ...(category ? { category } : {}), ...(search ? { search } : {}) });
  const { data, error, loading } = usePoll<any>(`products?${qs}`, 8000);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={title} subtitle={subtitle} />
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar produto…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
          {!fixedStates && <Select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}><option value="">Todos os estados</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>}
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option value="">Todas as categorias</option>{data?.categories?.map((c: string) => <option key={c}>{c}</option>)}</Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Mais recentes</option><option value="score">Maior nota</option><option value="price">Menor preço</option></Select>
        </div>
      </Card>
      <ErrorBox error={error} />
      <Card>
        {loading && !data ? <Loading /> : (
          <>
            <Table head={["Produto", "Categoria", "Preço", "Nota", "Avaliação", "Vendas", "Estado", "Atualizado"]} empty={!data?.items?.length}>
              {data?.items?.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <Td className="max-w-sm"><Link href={`/products/${p.id}`} className="line-clamp-2 text-zinc-100 hover:text-electric-400">{p.name}</Link>{p.source === "SANDBOX" && <Badge tone="amber">fictício</Badge>}{p.rejectionReason && <p className="mt-0.5 text-[11px] text-zinc-500">{p.rejectionReason}</p>}</Td>
                  <Td className="whitespace-nowrap">{p.category}</Td>
                  <Td className="whitespace-nowrap tabular-nums">{brl(p.currentPrice)}{p.discountRate ? <span className="ml-1 text-[11px] text-success-400">-{p.discountRate}%</span> : null}</Td>
                  <Td className="tabular-nums"><span className={p.score >= 75 ? "text-success-400" : "text-zinc-400"}>{p.score ?? "—"}</span></Td>
                  <Td className="tabular-nums">{p.rating ?? <span className="text-zinc-600">indisp.</span>}</Td>
                  <Td className="tabular-nums">{p.sales !== null ? fmtNum(p.sales) : <span className="text-zinc-600">indisp.</span>}</Td>
                  <Td><StateBadge state={p.state} /></Td>
                  <Td className="whitespace-nowrap text-zinc-500">{fmtDate(p.updatedAt)}</Td>
                </tr>
              ))}
            </Table>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>{data?.total ?? 0} produtos</span>
              <div className="flex gap-2">
                <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button disabled={!data || page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
