/**
 * Aviso de armazenamento (LGPD). O site não usa cookies de publicidade nem de análise.
 * Guardamos no navegador apenas: favoritos, comparação, preferência de movimento (essenciais à função pedida)
 * e, se a pessoa permitir, o histórico de imóveis vistos (opcional).
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TLink } from '@/components/ui/TLink';
import { readJSON, writeJSON } from '@/lib/storage';

const KEY = 'nexora:consent';
export interface Consent { decided: boolean; history: boolean; at?: string }

export const getConsent = () => readJSON<Consent>(KEY, { decided: false, history: false });
export const openCookiePreferences = () => window.dispatchEvent(new Event('nexora:open-consent'));

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(getConsent);
  const [open, setOpen] = useState(!consent.decided);
  const [details, setDetails] = useState(false);
  const [history, setHistory] = useState(consent.history);

  useEffect(() => {
    const on = () => { setDetails(true); setOpen(true); };
    window.addEventListener('nexora:open-consent', on);
    return () => window.removeEventListener('nexora:open-consent', on);
  }, []);

  const save = (c: Omit<Consent, 'decided'>) => {
    const next = { ...c, decided: true, at: new Date().toISOString() };
    writeJSON(KEY, next);
    if (!c.history) writeJSON('nexora:recent', []);
    setConsent(next);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          role="dialog"
          aria-modal="false"
          aria-labelledby="consent-title"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 z-[85] max-w-md rounded-xl border border-white/10 bg-navy/95 p-5 text-paper shadow-float backdrop-blur md:inset-x-auto md:left-6 md:bottom-6"
        >
          <h2 id="consent-title" className="text-sm font-medium">Sua privacidade</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-mist">
            Não usamos cookies de publicidade nem de análise. Guardamos no seu navegador só o necessário para seus favoritos e comparações funcionarem.
            Você pode permitir também o histórico de imóveis vistos. <TLink to="/privacidade" className="text-signal-soft underline-offset-4 hover:underline">Saiba mais</TLink>
          </p>
          {details && (
            <div className="mt-4 space-y-3 rounded-lg border border-white/10 p-3 text-[13px]">
              <label className="flex items-start gap-3 opacity-80">
                <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4 accent-signal" />
                <span><strong className="font-medium">Essenciais</strong> — favoritos, comparação, preferências de acessibilidade e sessão de login.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} className="mt-0.5 h-4 w-4 accent-signal" />
                <span><strong className="font-medium">Histórico de visualização</strong> — lembra os últimos imóveis que você abriu, apenas neste aparelho.</span>
              </label>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {details ? (
              <button type="button" className="btn-primary min-h-[40px] flex-1" onClick={() => save({ history })}>Salvar preferências</button>
            ) : (
              <>
                <button type="button" className="btn-primary min-h-[40px] flex-1" onClick={() => save({ history: true })}>Permitir histórico</button>
                <button type="button" className="btn-ghost min-h-[40px] flex-1 border-white/15" onClick={() => save({ history: false })}>Só o essencial</button>
                <button type="button" className="min-h-[40px] w-full text-xs text-mist underline-offset-4 hover:text-paper hover:underline" onClick={() => setDetails(true)}>Personalizar</button>
              </>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
