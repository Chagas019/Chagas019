import { Heart } from 'lucide-react';
import { PropertyCard } from '@/components/property/PropertyCard';
import { EmptyState, LoadingGrid } from '@/components/ui/States';
import { TLink } from '@/components/ui/TLink';
import { useProperties } from '@/hooks/useData';
import { useCollections } from '@/hooks/useCollections';
import { useAuth } from '@/hooks/useAuth';
import { useSeo } from '@/hooks/useSeo';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function FavoritesPage() {
  const { data, loading } = useProperties();
  const { favorites, synced, recent, clearRecent } = useCollections();
  const { user } = useAuth();
  useSeo({ title: 'Favoritos | NEXORA Real Estate', description: 'Seus imóveis salvos.', path: '/favoritos', noindex: true });
  const items = favorites.map((id) => data?.find((p) => p.id === id)).filter(Boolean);
  const missing = data ? favorites.length - items.length : 0;
  const recentItems = recent.map((id) => data?.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="theme-light min-h-screen bg-bg pb-section pt-[calc(var(--header-h)+2.5rem)] text-fg">
      <div className="container">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Sua seleção</p>
            <h1 className="text-display-lg font-medium">Favoritos</h1>
          </div>
          <p className="max-w-sm text-sm text-muted">
            {synced ? 'Sincronizados com a sua conta.' : 'Salvos neste navegador.'}
            {!user && isSupabaseConfigured && <> <TLink to="/entrar" className="text-signal hover:underline">Entre</TLink> para guardar na sua conta.</>}
          </p>
        </header>
        {loading ? <LoadingGrid n={3} /> : items.length === 0 ? (
          <EmptyState icon={<Heart size={20} />} title="Você ainda não salvou imóveis" text="Toque no coração de um imóvel para guardá-lo aqui." action={<TLink to="/imoveis" className="btn-primary">Explorar imóveis</TLink>} />
        ) : (
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <li key={p!.id}><PropertyCard p={p!} /></li>)}</ul>
        )}
        {missing > 0 && <p className="mt-6 text-sm text-muted">{missing} {missing === 1 ? 'favorito não está mais disponível' : 'favoritos não estão mais disponíveis'} (vendido, alugado ou despublicado).</p>}

        {recentItems.length > 0 && (
          <section aria-labelledby="hist" className="mt-24 border-t pt-10 hairline">
            <div className="mb-6 flex items-center justify-between">
              <h2 id="hist" className="text-xl font-medium">Vistos recentemente</h2>
              <button type="button" onClick={clearRecent} className="text-sm text-muted hover:text-fg">Limpar histórico</button>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{recentItems.slice(0, 8).map((p) => <li key={p!.id}><PropertyCard p={p!} /></li>)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
