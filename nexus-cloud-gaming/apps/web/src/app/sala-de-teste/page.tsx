import { PageHeader } from '@/components/Section';
import { TestRoom } from '@/components/TestRoom';

export const metadata = { title: 'Sala de teste', description: 'Teste tela cheia, orientação, toque, controle e conexão do seu aparelho.' };

export default function TestRoomPage() {
  return (
    <>
      <PageHeader eyebrow="Sala de teste" title="Prepare seu aparelho">
        Um padrão de teste desenhado no próprio aparelho, controlado por controle, toque ou teclado. Serve para validar a
        tela cheia, a orientação e os controles antes do streaming. <strong className="text-ink">Nenhum jogo é transmitido aqui.</strong>
      </PageHeader>
      <div className="mt-8">
        <TestRoom />
      </div>
    </>
  );
}
