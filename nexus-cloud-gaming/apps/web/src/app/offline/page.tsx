import { WifiOff } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/Section';

export const metadata = { title: 'Sem conexão' };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState icon={<WifiOff className="h-6 w-6" aria-hidden="true" />} title="Você está sem internet">
        <p>As páginas que você já abriu continuam disponíveis. Jogar exige conexão: assim que a rede voltar, é só tentar de novo.</p>
        <Link href="/" className="btn btn-primary mt-6">Tentar novamente</Link>
      </EmptyState>
    </div>
  );
}
