'use client';

import { useEffect } from 'react';
import { useRecent } from '@/lib/storage';

/** Registra o jogo no histórico local de "acessados recentemente". */
export function RecordVisit({ slug }: { slug: string }) {
  const { push } = useRecent();
  useEffect(() => push(slug), [slug, push]);
  return null;
}
