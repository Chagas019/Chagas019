import { TLink } from '@/components/ui/TLink';
import { useSeo } from '@/hooks/useSeo';

export default function NotFoundPage() {
  useSeo({ title: 'Página não encontrada | NEXORA', description: 'A página que você procura não existe.', path: location.pathname, noindex: true });
  return (
    <div className="blueprint-grid flex min-h-[90vh] flex-col items-center justify-center bg-ink px-6 text-center text-paper">
      <p className="font-mono text-sm text-mist">ERRO 404 · AMBIENTE NÃO ENCONTRADO NA PLANTA</p>
      <h1 className="mt-6 text-display-lg font-medium">Esta porta não leva a lugar nenhum.</h1>
      <p className="mt-4 max-w-md text-paper/70">O endereço pode ter mudado ou o imóvel saiu do ar.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <TLink to="/" className="btn-light">Voltar ao início</TLink>
        <TLink to="/imoveis" className="btn-ghost border-white/15">Ver imóveis</TLink>
      </div>
    </div>
  );
}
