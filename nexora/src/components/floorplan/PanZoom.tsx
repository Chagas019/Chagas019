import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export interface PanZoomHandle { zoomIn: () => void; zoomOut: () => void; fit: () => void; focus: (x: number, y: number, zoom?: number) => void }

/**
 * Área com zoom e movimentação: roda do mouse (no ponto do cursor), arrastar, pinça com dois dedos,
 * teclado (setas, + e −) e botões externos via ref. O conteúdo tem tamanho intrínseco (width × height px).
 */
export const PanZoom = forwardRef<PanZoomHandle, { width: number; height: number; children: ReactNode; label: string; className?: string }>(function PanZoom({ width, height, children, label, className = '' }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0, k: 1 });
  const fitK = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const pinch = useRef<{ d: number; k: number; cx: number; cy: number; x: number; y: number } | null>(null);

  const clampK = (k: number) => Math.min(fitK.current * 8, Math.max(fitK.current * 0.6, k));

  const fit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const k = Math.min(cw / width, ch / height) * 0.92;
    fitK.current = k;
    setT({ k, x: (cw - width * k) / 2, y: (ch - height * k) / 2 });
  }, [width, height]);

  useLayoutEffect(() => { fit(); }, [fit]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = cx ?? r.width / 2, py = cy ?? r.height / 2;
    setT((s) => {
      const k = clampK(s.k * factor);
      const f = k / s.k;
      return { k, x: px - (px - s.x) * f, y: py - (py - s.y) * f };
    });
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomAt(1.4),
    zoomOut: () => zoomAt(1 / 1.4),
    fit,
    focus: (x, y, zoom = 2.2) => {
      const el = box.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const k = clampK(fitK.current * zoom);
      setT({ k, x: r.width / 2 - x * k, y: r.height / 2 - y * k });
    },
  }), [zoomAt, fit]);

  // roda do mouse: listener não passivo para impedir a rolagem da página só dentro da planta
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0018), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  }, [zoomAt]);

  const onDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const r = box.current!.getBoundingClientRect();
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: t.k, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, x: t.x, y: t.y };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current += Math.abs(dx) + Math.abs(dy);
    if (moved.current > 4 && !box.current!.hasPointerCapture(e.pointerId)) box.current!.setPointerCapture(e.pointerId);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const p = pinch.current;
      const k = clampK(p.k * (Math.hypot(a.x - b.x, a.y - b.y) / p.d));
      const f = k / p.k;
      setT({ k, x: p.cx - (p.cx - p.x) * f, y: p.cy - (p.cy - p.y) * f });
    } else if (pointers.current.size === 1) {
      setT((s) => ({ ...s, x: s.x + dx, y: s.y + dy }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  // arrastar não conta como clique em um cômodo
  const onClickCapture = (e: React.MouseEvent) => { if (moved.current > 6) { e.stopPropagation(); e.preventDefault(); } };

  const onKey = (e: React.KeyboardEvent) => {
    const step = 40;
    const map: Record<string, () => void> = {
      ArrowLeft: () => setT((s) => ({ ...s, x: s.x + step })),
      ArrowRight: () => setT((s) => ({ ...s, x: s.x - step })),
      ArrowUp: () => setT((s) => ({ ...s, y: s.y + step })),
      ArrowDown: () => setT((s) => ({ ...s, y: s.y - step })),
      '+': () => zoomAt(1.25), '=': () => zoomAt(1.25), '-': () => zoomAt(0.8), '0': fit,
    };
    if (map[e.key]) { e.preventDefault(); map[e.key](); }
  };

  return (
    <div
      ref={box}
      tabIndex={0}
      role="application"
      aria-label={`${label}. Use as setas para mover, + e − para aproximar e 0 para ajustar à tela.`}
      className={`relative touch-none select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-signal ${className}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClickCapture={onClickCapture}
      onKeyDown={onKey}
      style={{ cursor: pointers.current.size ? 'grabbing' : 'grab' }}
    >
      <div style={{ width, height, transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})`, transformOrigin: '0 0', willChange: 'transform' }}>
        {children}
      </div>
    </div>
  );
});
