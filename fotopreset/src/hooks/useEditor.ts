import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { NEUTRAL, combine } from '../engine/adjustments';
import { createEngine, type Engine } from '../engine/client';
import type { ExportFormat, LoadInfo } from '../engine/core';
import {
  createHistory,
  effectiveAdjustments,
  historyReducer,
  type EditState,
} from '../engine/history';
import { PRESETS } from '../presets/presets';
import { validateFile } from '../services/files';

export interface Photo {
  name: string;
  size: number;
  info: LoadInfo;
}

export type Status =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

export function useEditor() {
  const engineRef = useRef<Engine | null>(null);
  const engine = (): Engine => (engineRef.current ??= createEngine());

  const [status, setStatus] = useState<Status>({ kind: 'empty' });
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [history, dispatch] = useReducer(historyReducer, undefined, () => createHistory());
  const [original, setOriginal] = useState<ImageData | null>(null);
  const [rendered, setRendered] = useState<ImageData | null>(null);
  const [rendering, setRendering] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const loadToken = useRef(0);

  const edit = history.present;
  const adjustments = useMemo(() => effectiveAdjustments(edit), [edit]);

  // Libera o worker ao sair.
  useEffect(() => () => void engineRef.current?.dispose(), []);

  const revokeThumbs = useCallback(() => {
    setThumbs((prev) => {
      Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
      return {};
    });
  }, []);

  const load = useCallback(
    async (file: File) => {
      const invalid = validateFile(file);
      if (invalid) {
        setStatus((s) => (photo ? s : { kind: 'error', message: invalid }));
        throw new Error(invalid);
      }
      const token = ++loadToken.current;
      setStatus({ kind: 'loading' });
      try {
        const info = await engine().load(file);
        const before = await engine().original();
        if (token !== loadToken.current) return;
        setPhoto({ name: file.name, size: file.size, info });
        setOriginal(before);
        setRendered(null);
        dispatch({ type: 'clear' });
        setStatus({ kind: 'ready' });

        // Miniaturas reais de cada preset sobre a própria foto.
        revokeThumbs();
        const items = [{ id: '__original', adjustments: null }, ...PRESETS];
        for (const p of items) {
          const blob = await engine().thumbnail(combine(p.adjustments, 1, NEUTRAL));
          const url = URL.createObjectURL(blob);
          if (token !== loadToken.current) {
            URL.revokeObjectURL(url);
            return;
          }
          setThumbs((prev) => ({ ...prev, [p.id]: url }));
        }
      } catch (e) {
        if (token !== loadToken.current) return;
        const message = e instanceof Error ? e.message : 'Não foi possível abrir a foto.';
        setStatus(photo ? { kind: 'ready' } : { kind: 'error', message });
        throw new Error(message);
      }
    },
    [photo, revokeThumbs],
  );

  // Renderização "a mais recente vence": enquanto uma prévia é processada,
  // só o último estado pedido fica na fila.
  const pendingRef = useRef<typeof adjustments | null>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    if (status.kind !== 'ready') return;
    pendingRef.current = adjustments;
    if (busyRef.current) return;
    busyRef.current = true;
    setRendering(true);
    void (async () => {
      try {
        while (pendingRef.current) {
          const next = pendingRef.current;
          pendingRef.current = null;
          const img = await engine().render(next);
          if (!pendingRef.current) setRendered(img);
        }
      } catch {
        // prévia falhou: mantém a última imagem válida
      } finally {
        busyRef.current = false;
        setRendering(false);
      }
    })();
  }, [adjustments, status.kind, original]);

  const setEdit = useCallback((state: EditState, key: string) => {
    dispatch({ type: 'set', state, key, at: performance.now() });
  }, []);

  const exportPhoto = useCallback(
    (format: ExportFormat, quality: number, onProgress: (f: number) => void) =>
      engine().export({ format, quality, adjustments }, onProgress),
    [adjustments],
  );

  return {
    status,
    photo,
    edit,
    adjustments,
    original,
    rendered,
    rendering,
    thumbs,
    engineMode: engineRef.current?.mode ?? null,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    load,
    setEdit,
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    reset: () => dispatch({ type: 'reset', at: performance.now() }),
    exportPhoto,
  };
}
