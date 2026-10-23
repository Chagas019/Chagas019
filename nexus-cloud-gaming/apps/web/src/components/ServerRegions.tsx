import { MapPin } from 'lucide-react';

/**
 * Regiões de servidores. Nenhuma está ativa: a lista mostra o plano de
 * implantação, não capacidade existente.
 */
export const REGIONS = [
  { id: 'poc', name: 'Servidor de prova de conceito', place: 'Máquina única com GPU', status: 'Fase 4', note: 'Primeira medição real de latência no celular.' },
  { id: 'sao', name: 'São Paulo', place: 'Brasil · Sudeste', status: 'Planejado', note: 'Região principal: menor latência para a maior parte do país.' },
  { id: 'nor', name: 'Nordeste', place: 'Brasil · Fortaleza ou Recife', status: 'Em avaliação', note: 'Depende de provedor com GPU na região.' },
  { id: 'sul', name: 'Sul', place: 'Brasil · Porto Alegre', status: 'Em avaliação', note: 'Avaliar após medir demanda.' },
];

export function ServerRegions() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {REGIONS.map((r) => (
        <li key={r.id} className="panel p-5">
          <div className="flex items-start justify-between gap-3">
            <MapPin className="h-5 w-5 text-cyan" aria-hidden="true" />
            <span className="chip text-muted">{r.status}</span>
          </div>
          <p className="mt-4 font-semibold">{r.name}</p>
          <p className="text-xs text-faint">{r.place}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{r.note}</p>
          <p className="mt-4 text-xs text-faint">Capacidade: 0 sessões</p>
        </li>
      ))}
    </ul>
  );
}
