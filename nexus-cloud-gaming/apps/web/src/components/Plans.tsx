import { Check } from 'lucide-react';

/**
 * Planos: estrutura pronta para integrar um meio de pagamento (Fase 8).
 * Preços não são definidos antes de medir o custo real por hora de GPU.
 */
const PLANS = [
  {
    id: 'livre',
    name: 'Livre',
    pitch: 'Para conhecer a plataforma.',
    features: ['Jogos gratuitos e de código aberto', 'Até 720p a 30 fps', 'Sessões de até 1 hora', 'Fila padrão'],
  },
  {
    id: 'pro',
    name: 'Pro',
    pitch: 'Para quem joga toda semana.',
    features: ['Tudo do Livre', 'Até 1080p a 60 fps', 'Sessões de até 4 horas', 'Fila prioritária'],
    highlight: true,
  },
  {
    id: 'ultra',
    name: 'Ultra',
    pitch: 'Máxima qualidade, quando houver hardware.',
    features: ['Tudo do Pro', 'Até 1440p a 60 fps, onde houver GPU compatível', 'Sessões de até 6 horas', 'Prioridade máxima'],
  },
];

export function Plans() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {PLANS.map((p) => (
        <li
          key={p.id}
          className={`panel relative flex flex-col p-6 ${p.highlight ? 'border-violet/60 shadow-[0_0_0_1px_rgb(139_92_246/0.4),0_30px_60px_-30px_rgb(139_92_246/0.7)]' : ''}`}
        >
          {p.highlight && <span className="chip absolute right-5 top-5 border-violet/60 text-[#c4b5fd]">Mais escolhido</span>}
          <h3 className="text-xl font-bold">{p.name}</h3>
          <p className="mt-1 text-sm text-muted">{p.pitch}</p>
          <p className="mt-5 font-display text-2xl font-bold">
            Preço a definir
          </p>
          <p className="text-xs text-faint">Depende do custo medido de GPU por hora.</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden="true" /> {f}
              </li>
            ))}
          </ul>
          <button type="button" disabled className={`btn mt-8 ${p.highlight ? 'btn-primary' : 'btn-ghost'}`}>
            Assinaturas em breve
          </button>
        </li>
      ))}
    </ul>
  );
}
