import { GamepadTester } from '@/components/GamepadTester';
import { PageHeader, Section } from '@/components/Section';

export const metadata = { title: 'Controle', description: 'Conecte, teste e mapeie seu controle Bluetooth pelo navegador.' };

const NOTES = [
  {
    title: 'Android (Chrome)',
    text: 'Controles de Xbox, DualShock 4, DualSense e a maioria dos controles Bluetooth genéricos funcionam pela Gamepad API. Vibração depende do modelo.',
  },
  {
    title: 'iPhone e iPad (Safari)',
    text: 'O Safari reconhece controles compatíveis com o iOS (Xbox, DualShock 4, DualSense e controles MFi). Controles genéricos podem não aparecer. Vibração do controle não é exposta ao navegador.',
  },
  {
    title: 'Privacidade',
    text: 'O navegador só revela um controle depois que você aperta um botão nesta página. O nome do controle não é enviado a nenhum servidor.',
  },
];

export default function ControllerPage() {
  return (
    <>
      <PageHeader eyebrow="Controle" title="Conectar controle Bluetooth">
        Teste botões, analógicos e gatilhos em tempo real e ajuste o mapeamento. O mapeamento fica salvo neste aparelho e
        será usado nas sessões de jogo.
      </PageHeader>
      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <GamepadTester />
      </div>
      <Section id="compatibilidade" eyebrow="Compatibilidade" title="O que esperar de cada aparelho">
        <ul className="grid gap-4 md:grid-cols-3">
          {NOTES.map((n) => (
            <li key={n.title} className="panel p-6">
              <h3 className="font-semibold">{n.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{n.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-faint">Compatibilidade baseada na documentação dos navegadores; a validação em aparelhos reais faz parte da Fase 4.</p>
      </Section>
    </>
  );
}
