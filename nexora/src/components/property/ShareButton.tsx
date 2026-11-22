import { Share2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

/** Web Share API no celular; nos demais, copia o link */
export function ShareButton({ title, path, className = '' }: { title: string; path: string; className?: string }) {
  const toast = useToast();
  const share = async () => {
    const url = location.origin + path;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.show('Link copiado', { description: url, tone: 'success' });
    } catch {
      window.prompt('Copie o link do imóvel:', url);
    }
  };
  return (
    <button type="button" onClick={share} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded border px-4 text-sm transition hairline hover:bg-fg/5 ${className}`}>
      <Share2 size={16} /> Compartilhar
    </button>
  );
}
