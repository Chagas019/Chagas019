import { useCallback, useEffect, useRef, useState } from 'react';
import { AdjustPanel } from './components/AdjustPanel';
import { CompareView } from './components/CompareView';
import { EmptyState } from './components/EmptyState';
import { ExportPanel } from './components/ExportPanel';
import { CompareIcon, EyeIcon, ImageIcon, RedoIcon, ResetIcon, UndoIcon } from './components/Icons';
import { Logo } from './components/Logo';
import { PresetPanel } from './components/PresetPanel';
import { Toasts, type Toast } from './components/Toasts';
import { clampValue, isNeutral } from './engine/adjustments';
import { useEditor } from './hooks/useEditor';
import { useFavorites } from './hooks/useFavorites';
import { ACCEPT_ATTR } from './services/files';
import { createSamplePhoto } from './services/sample';

type Tab = 'presets' | 'ajustes' | 'exportar';
const TABS: { id: Tab; label: string }[] = [
  { id: 'presets', label: 'Presets' },
  { id: 'ajustes', label: 'Ajustes' },
  { id: 'exportar', label: 'Exportar' },
];

export default function App() {
  const ed = useEditor();
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const [tab, setTab] = useState<Tab>('presets');
  const [compare, setCompare] = useState(false);
  const [holdOriginal, setHoldOriginal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastId = useRef(0);

  const notify = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500);
  }, []);

  const openFile = useCallback(
    async (file: File) => {
      try {
        await ed.load(file);
        setTab('presets');
      } catch (e) {
        notify('error', e instanceof Error ? e.message : 'Não foi possível abrir a foto.');
      }
    },
    [ed, notify],
  );

  const openSample = async () => {
    try {
      await openFile(await createSamplePhoto());
    } catch (e) {
      notify('error', e instanceof Error ? e.message : 'Falha ao gerar a foto de exemplo.');
    }
  };

  const pick = () => inputRef.current?.click();
  const ready = ed.status.kind === 'ready' && ed.photo && ed.original;
  const edited = !isNeutral(ed.adjustments);

  // Atalhos de teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'o') {
        e.preventDefault();
        pick();
      } else if (!ready) {
        return;
      } else if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        ed.undo();
      } else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        ed.redo();
      } else if (mod && key === 's') {
        e.preventDefault();
        setTab('exportar');
      } else if (key === '\\' && !(e.target instanceof HTMLInputElement && e.target.type !== 'range')) {
        setCompare((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, ed]);

  // Colar uma foto (Ctrl+V).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) void openFile(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [openFile]);

  return (
    <div className={`app${ready ? ' is-editing' : ''}`}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void openFile(file);
        }}
      />

      <header className="topbar">
        <Logo size={32} />
        {ready && (
          <nav className="toolbar" aria-label="Ações da edição">
            <button type="button" className="icon-btn" onClick={ed.undo} disabled={!ed.canUndo} aria-label="Desfazer (Ctrl+Z)" title="Desfazer (Ctrl+Z)">
              <UndoIcon />
            </button>
            <button type="button" className="icon-btn" onClick={ed.redo} disabled={!ed.canRedo} aria-label="Refazer (Ctrl+Shift+Z)" title="Refazer (Ctrl+Shift+Z)">
              <RedoIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                ed.reset();
                notify('info', 'Foto original restaurada. Use desfazer para voltar.');
              }}
              disabled={!edited}
              aria-label="Restaurar original"
              title="Restaurar original"
            >
              <ResetIcon />
            </button>
            <span className="toolbar-sep" aria-hidden="true" />
            <button type="button" className="icon-btn" onClick={pick} aria-label="Abrir outra foto (Ctrl+O)" title="Abrir outra foto (Ctrl+O)">
              <ImageIcon />
            </button>
          </nav>
        )}
      </header>

      {!ready ? (
        <EmptyState
          loading={ed.status.kind === 'loading'}
          error={ed.status.kind === 'error' ? ed.status.message : null}
          onPick={pick}
          onFile={(f) => void openFile(f)}
          onSample={() => void openSample()}
        />
      ) : (
        <main className="editor">
          <div className="viewer">
            <CompareView
              original={ed.original!}
              rendered={ed.rendered}
              compare={compare}
              showOriginal={holdOriginal}
              busy={ed.rendering || ed.status.kind !== 'ready'}
            />
            <div className="viewer-tools">
              <button
                type="button"
                className={`pill${compare ? ' is-active' : ''}`}
                aria-pressed={compare}
                onClick={() => setCompare((c) => !c)}
                title="Comparar antes e depois (tecla \)"
              >
                <CompareIcon width={16} height={16} /> Antes / Depois
              </button>
              <button
                type="button"
                className="pill"
                aria-pressed={holdOriginal}
                onPointerDown={() => setHoldOriginal(true)}
                onPointerUp={() => setHoldOriginal(false)}
                onPointerLeave={() => setHoldOriginal(false)}
                onPointerCancel={() => setHoldOriginal(false)}
                onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setHoldOriginal(true)}
                onKeyUp={() => setHoldOriginal(false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <EyeIcon width={16} height={16} /> Segure p/ ver original
              </button>
            </div>
          </div>

          <aside className="panel" aria-label="Controles de edição">
            <div className="tabs" role="tablist" aria-label="Seções do editor">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={tab === t.id ? 0 : -1}
                  className={`tab${tab === t.id ? ' is-active' : ''}`}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => {
                    const i = TABS.findIndex((x) => x.id === tab);
                    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                    if (d) {
                      const next = TABS[(i + d + TABS.length) % TABS.length]!;
                      setTab(next.id);
                      document.getElementById(`tab-${next.id}`)?.focus();
                    }
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="panel-body" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {tab === 'presets' && (
                <PresetPanel
                  selectedId={ed.edit.presetId}
                  intensity={ed.edit.intensity}
                  thumbs={ed.thumbs}
                  favorites={favorites}
                  onSelect={(presetId) => ed.setEdit({ ...ed.edit, presetId, intensity: 1 }, `preset:${presetId}`)}
                  onIntensity={(intensity) => ed.setEdit({ ...ed.edit, intensity }, 'intensity')}
                  onToggleFavorite={toggleFavorite}
                />
              )}
              {tab === 'ajustes' && (
                <AdjustPanel
                  manual={ed.edit.manual}
                  onChange={(key, value) =>
                    ed.setEdit(
                      { ...ed.edit, manual: { ...ed.edit.manual, [key]: clampValue(key, value) } },
                      `manual:${key}`,
                    )
                  }
                />
              )}
              {tab === 'exportar' && ed.photo && (
                <ExportPanel photo={ed.photo} exportPhoto={ed.exportPhoto} notify={notify} />
              )}
            </div>
          </aside>
        </main>
      )}

      <footer className="footer">
        © {new Date().getFullYear()} Chagas Color · Todos os direitos reservados
      </footer>

      <Toasts toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
