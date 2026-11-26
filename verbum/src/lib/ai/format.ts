import type { SermonOutline, VerifiedRef } from "./schema";
import { TIPO_LABEL } from "./schema";

const refLine = (r: VerifiedRef) => `- ${r.label}${r.note ? ` — ${r.note}` : ""}${r.status === "nao-verificada" ? " [NÃO VERIFICADA]" : r.status === "capitulo" ? " [versículos a conferir]" : ""}${r.url ? ` (${r.url})` : ""}`;

/** Versão em texto simples do roteiro (para copiar e colar). */
export function outlineToText(o: SermonOutline): string {
  const out: string[] = [];
  out.push(o.titulo.toUpperCase());
  out.push(`${TIPO_LABEL[o.brief.tipo]} · ${o.brief.publico} · ${o.brief.duracao} min`);
  out.push("");
  const sec = (t: string, body: string | string[]) => {
    out.push(`## ${t}`);
    if (Array.isArray(body)) out.push(...body); else out.push(body);
    out.push("");
  };
  sec("Objetivo central", o.objetivo_central);
  sec("Introdução", o.introducao);
  sec("Fundamentação bíblica", o.fundamentacao_biblica.map(refLine));
  sec("Contextualização da passagem", o.contextualizacao);
  out.push("## Desenvolvimento");
  for (const t of o.desenvolvimento) {
    out.push(`### ${t.topico}`, t.conteudo);
    if (t.referencias.length) out.push(`Referências: ${t.referencias.map((r) => r.label).join("; ")}`);
    out.push("");
  }
  if (o.catecismo.length) sec("Catecismo da Igreja Católica", o.catecismo.map(refLine));
  if (o.documentos.length) sec("Documentos da Igreja", o.documentos.map(refLine));
  if (o.santos.length) sec("Santos", o.santos.map(refLine));
  sec("Aplicações práticas", o.aplicacoes_praticas.map((a) => `- ${a}`));
  sec("Perguntas para reflexão", o.perguntas_reflexao.map((p, i) => `${i + 1}. ${p}`));
  sec("Conclusão", o.conclusao);
  if (o.musicas.length) sec("Músicas sugeridas", o.musicas.map(refLine));
  if (o.avisos.length) sec("Avisos", o.avisos.map((a) => `- ${a}`));
  out.push("—", "Roteiro preparado com o VERBUM. Textos explicativos gerados por IA: revise, reze e confira as fontes antes de pregar.");
  return out.join("\n");
}
