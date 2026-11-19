import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    credentials: 'same-origin',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(data?.error ?? `Erro ${res.status}`, res.status);
  return data as T;
}

export function useApi<T = any>(path: string | null, deps: unknown[] = [], refreshMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => {
    load();
    if (!refreshMs) return;
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);
  return { data, error, loading, reload: load, setData };
}

// ---------- Toasts ----------
const ToastCtx = createContext<(msg: string, kind?: 'ok' | 'err') => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: string } | null>(null);
  const show = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setT({ msg, kind });
    setTimeout(() => setT(null), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && <div className={`toast ${t.kind === 'err' ? 'alert err' : ''}`}>{t.msg}</div>}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Executa uma ação da API com toast de sucesso/erro. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const r = await fn();
      if (ok) toast(ok);
      return r;
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return { run, busy };
}

// ---------- Formatação ----------
export const fmtNum = (n: number | null | undefined) => (n == null ? '—' : new Intl.NumberFormat('pt-BR', { notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n));
export const fmtPct = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(2)}%`);
export const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso.includes('T') || iso.endsWith('Z') ? iso : iso.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const fmtDate = (d?: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) : '—');

export const FORMAT_LABEL: Record<string, string> = { REELS: 'Reel', CAROUSEL: 'Carrossel', IMAGE: 'Imagem', STORIES: 'Stories' };
export const STATUS: Record<string, [string, string]> = {
  idle: ['Ocioso', ''], running: ['Executando', 'blue running'], error: ['Erro', 'red'], paused: ['Pausado', 'amber'],
  planned: ['Planejado', ''], briefed: ['Pauta pronta', 'violet'], in_production: ['Em produção', 'blue'],
  draft: ['Rascunho', ''], copy_ready: ['Copy pronta', 'violet'], rendering: ['Renderizando', 'blue running'], review: ['Em revisão', 'amber'],
  approved: ['Aprovado', 'green'], rejected: ['Reprovado', 'red'], scheduled: ['Agendado', 'blue'], published: ['Publicado', 'green'],
  failed: ['Falhou', 'red'], blocked: ['Bloqueado', 'red'], cancelled: ['Cancelado', ''], publishing: ['Publicando', 'blue running'], retrying: ['Nova tentativa', 'amber'],
  queued: ['Na fila', ''], done: ['Concluído', 'green'], dead: ['Falhou', 'red'], success: ['Sucesso', 'green'],
  ok: ['OK', 'green'], not_configured: ['Não configurado', ''], degraded: ['Pendências', 'amber'],
};
export function Badge({ s, label }: { s: string; label?: string }) {
  const [l, c] = STATUS[s] ?? [s, ''];
  return <span className={`badge ${c}`}>{label ?? l}</span>;
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {typeof title === 'string' ? <h2>{title}</h2> : title}
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card kpi hover">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function Page({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="topbar">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>
      {children}
    </>
  );
}

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export const mediaUrl = (file: string) => `/api/media/file/${file}`;

export function Loading({ error }: { error?: string | null }) {
  return error ? <div className="alert err">{error}</div> : <div className="dim">Carregando…</div>;
}

// ---------- Gráficos SVG ----------
export function LineChart({ series, height = 180, color = 'var(--blue)', label }: { series: { x: string; y: number }[]; height?: number; color?: string; label?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!series.length) return <div className="empty">Sem dados reais ainda — as métricas aparecem após as primeiras publicações.</div>;
  const w = 600;
  const max = Math.max(1, ...series.map((s) => s.y));
  const pts = series.map((s, i) => [series.length === 1 ? w / 2 : (i / (series.length - 1)) * w, height - 24 - (s.y / max) * (height - 40)] as const);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${pts[pts.length - 1][0]},${height - 24} L${pts[0][0]},${height - 24} Z`;
  const gid = `g${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={w} y1={(height - 24) * f} y2={(height - 24) * f} stroke="var(--border)" strokeDasharray="3 5" />)}
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i} onMouseEnter={() => setHover(i)}>
          <rect x={p[0] - w / series.length / 2} y="0" width={w / series.length} height={height} fill="transparent" />
          {hover === i && <><line x1={p[0]} x2={p[0]} y1="0" y2={height - 24} stroke="var(--border-2)" /><circle cx={p[0]} cy={p[1]} r="4" fill={color} /></>}
        </g>
      ))}
      {hover != null && (
        <text x={Math.min(w - 120, Math.max(4, pts[hover][0] - 50))} y="14" fill="var(--text)" fontSize="12">
          {series[hover].x}: {label ? label(series[hover].y) : series[hover].y}
        </text>
      )}
      <text x="0" y={height - 6} fill="var(--text-3)" fontSize="11">{series[0].x}</text>
      <text x={w} y={height - 6} fill="var(--text-3)" fontSize="11" textAnchor="end">{series[series.length - 1].x}</text>
    </svg>
  );
}

export function Bars({ items, format = (n: number) => String(n) }: { items: { label: string; value: number; note?: string }[]; format?: (n: number) => string }) {
  if (!items.length) return <div className="empty">Sem dados suficientes.</div>;
  const max = Math.max(...items.map((i) => i.value), 0.0001);
  return (
    <div className="list">
      {items.map((i) => (
        <div key={i.label} style={{ display: 'grid', gap: 6 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>{i.label}</span>
            <span className="muted small">{format(i.value)} {i.note && <span className="dim">· {i.note}</span>}</span>
          </div>
          <div className="bar"><i style={{ width: `${(i.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
