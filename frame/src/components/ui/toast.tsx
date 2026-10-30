"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type Toast = { id: number; tone: "success" | "error" | "info"; text: string };
type Ctx = { show: (text: string, tone?: Toast["tone"]) => void };

const ToastContext = createContext<Ctx>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reduce = useReducedMotion();
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (text: string, tone: Toast["tone"] = "success") => {
      const id = ++seq;
      setToasts((t) => [...t.slice(-2), { id, tone, text }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={reduce ? false : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink-800/95 px-4 py-3 text-sm text-paper shadow-[var(--shadow-pop)] backdrop-blur"
            >
              {t.tone === "error" ? <AlertCircle className="size-4 shrink-0 text-danger-400" aria-hidden /> : <CheckCircle2 className="size-4 shrink-0 text-success-400" aria-hidden />}
              <span>{t.text}</span>
              <button onClick={() => dismiss(t.id)} className="ml-1 rounded-full p-1 text-fog-400 hover:text-paper" aria-label="Fechar aviso">
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
