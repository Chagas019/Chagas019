import { Compass } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/Section';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState icon={<Compass className="h-6 w-6" aria-hidden="true" />} title="Página não encontrada">
        <p>Este endereço não existe ou o jogo saiu do catálogo.</p>
        <Link href="/catalogo" className="btn btn-primary mt-6">Ir para o catálogo</Link>
      </EmptyState>
    </div>
  );
}
