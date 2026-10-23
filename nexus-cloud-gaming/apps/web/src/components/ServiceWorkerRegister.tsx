'use client';

import { useEffect } from 'react';

/** Registra o service worker do PWA (só em produção, para não cachear o modo de desenvolvimento). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Sem service worker o site continua funcionando, só sem modo offline.
    });
  }, []);
  return null;
}
