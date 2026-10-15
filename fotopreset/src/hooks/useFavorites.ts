import { useCallback, useState } from 'react';

const KEY = 'chagas-color:favoritos';

function read(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Guarda só os ids dos presets favoritos (nunca fotos). */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(read);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // armazenamento indisponível (aba privada): mantém só nesta sessão
      }
      return next;
    });
  }, []);

  return { favorites, toggle };
}
