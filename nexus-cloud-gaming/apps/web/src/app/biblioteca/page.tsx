import { FavoritesShelf, RecentShelf } from '@/components/LibraryShelf';
import { PageHeader, Section } from '@/components/Section';

export const metadata = { title: 'Biblioteca' };

export default function LibraryPage() {
  return (
    <>
      <PageHeader eyebrow="Biblioteca" title="Sua biblioteca">
        Favoritos e jogos acessados recentemente. Nesta prévia tudo fica salvo apenas neste aparelho; com as contas
        (Fase 3) a biblioteca acompanha você em qualquer tela.
      </PageHeader>
      <Section id="favoritos" eyebrow="Guardados" title="Favoritos">
        <FavoritesShelf />
      </Section>
      <Section id="historico" eyebrow="Histórico" title="Acessados recentemente">
        <RecentShelf showClear />
      </Section>
    </>
  );
}
