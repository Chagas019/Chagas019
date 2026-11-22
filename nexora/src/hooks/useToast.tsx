import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export interface ToastOptions { description?: string; tone?: 'default' | 'success' | 'error'; action?: { label: string; href?: string; onClick?: () => void }; duration?: number }
export interface ToastItem extends ToastOptions { id: number; title: string }

const Ctx = createContext<{ show: (title: string, o?: ToastOptions) => void; dismiss: (id: number) => void; items: ToastItem[] } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const show = useCallback((title: string, o: ToastOptions = {}) => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-2), { id, title, ...o }]);
    setTimeout(() => dismiss(id), o.duration ?? 4200);
  }, [dismiss]);
  const value = useMemo(() => ({ show, dismiss, items }), [show, dismiss, items]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast fora do provider');
  return v;
}
