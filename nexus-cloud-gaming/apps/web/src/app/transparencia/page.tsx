import { CircleCheck, CircleDashed, FlaskConical } from 'lucide-react';
import { PageHeader, Section } from '@/components/Section';

export const metadata = { title: 'O que já funciona' };

const GROUPS = [
  {
    title: 'Funciona de verdade',
    Icon: CircleCheck,
    tone: 'text-ok',
    items: [
      'Catálogo navegável com pesquisa, filtros e links compartilháveis',
      'Favoritos, histórico e preferências salvos neste aparelho',
      'Detecção e teste de controles Bluetooth (Gamepad API) com mapeamento de botões',
      'Sala de teste: tela cheia quando suportada, orientação, controles de toque e teclado',
      'Medição de latência até o servidor web e reconexão automática dessa medição',
      'Diagnóstico de recursos do navegador (WebRTC, codecs, tela, vibração, PWA)',
      'Instalação como app (PWA) e páginas já abertas disponíveis sem internet',
    ],
  },
  {
    title: 'Demonstrativo',
    Icon: FlaskConical,
    tone: 'text-[#c4b5fd]',
    items: [
      'Lista de jogos: títulos reais de código aberto, mas nenhum está sendo executado',
      'Regiões de servidor: plano de implantação, sem capacidade ativa',
      'Planos: estrutura sem preços e sem cobrança',
    ],
  },
  {
    title: 'Ainda não existe',
    Icon: CircleDashed,
    tone: 'text-warn',
    items: [
      'Contas, login, verificação de e-mail e sessões em vários aparelhos (Fase 3)',
      'Streaming de jogos por WebRTC e servidores com GPU (Fase 4)',
      'Gerenciador de sessões, fila de espera e painel administrativo (Fases 3 a 6)',
      'Conexão de conta Steam pelo login oficial (Fase 5)',
      'Qualquer execução de jogos de console: só por serviços oficiais externos',
    ],
  },
];

export default function TransparencyPage() {
  return (
    <>
      <PageHeader eyebrow="Transparência" title="O que já funciona">
        O NEXUS está em desenvolvimento. Esta página separa o que é real, o que é demonstração e o que ainda falta, para
        que nenhum botão prometa algo que não existe.
      </PageHeader>
      <Section title="Estado atual · Fase 2">
        <div className="grid gap-4 lg:grid-cols-3">
          {GROUPS.map(({ title, Icon, tone, items }) => (
            <section key={title} className="panel p-6" aria-label={title}>
              <h3 className={`flex items-center gap-2 font-semibold ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /> {title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted">
                {items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </Section>
    </>
  );
}
