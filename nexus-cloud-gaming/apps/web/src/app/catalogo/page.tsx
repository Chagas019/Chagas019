import { Suspense } from 'react';
import { CatalogBrowser } from '@/components/CatalogBrowser';
import { GameCardSkeleton } from '@/components/GameCard';
import { PageHeader } from '@/components/Section';

export const metadata = { title: 'Catálogo', description: 'Pesquise jogos por nome, plataforma, gênero, disponibilidade e tipo de controle.' };

function Loading() {
  return (
    <div className="mx-auto mt-8 grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-5" aria-busy="true" aria-label="Carregando catálogo">
      {Array.from({ length: 5 }, (_, i) => <GameCardSkeleton key={i} />)}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <>
      <PageHeader eyebrow="Catálogo" title="Todos os jogos">
        Jogos de código aberto com licença para streaming e plataformas acessíveis por serviços oficiais. Nenhum título
        está operacional nesta prévia.
      </PageHeader>
      <Suspense fallback={<Loading />}>
        <CatalogBrowser />
      </Suspense>
    </>
  );
}
