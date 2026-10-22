import { AnimatePresence, motion } from 'framer-motion';
import { Building, Info, SlidersHorizontal } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSkyline } from '../../state/store';
import { useIsMobile } from '../../hooks/useEnvironmentSync';
import { TopBar } from './TopBar';
import { FloorRail } from './FloorRail';
import { InfoPanel } from './InfoPanel';
import { Dock, LayersPanel } from './Dock';
import { TourPlayer } from './TourPlayer';
import { HelpOverlay, ShowUiButton } from './Overlays';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

type Tab = 'floors' | 'info' | 'layers';

/** Interface da área de exploração (desktop: painéis laterais; celular: painel inferior recolhível). */
export function ExploreUI() {
  const hidden = useSkyline((s) => s.uiHidden);
  const tour = useSkyline((s) => s.tour.active);
  const mode = useSkyline((s) => s.mode);
  const mobile = useIsMobile();
  const [infoOpen, setInfoOpen] = useState(true);
  const [sheet, setSheet] = useState<Tab | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() => window.innerWidth);
  useKeyboardShortcuts();
  useEffect(() => {
    const on = () => setWidth(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // primeira visita: mostra a ajuda uma vez
  useEffect(() => {
    try {
      if (!localStorage.getItem('skyline40-help') && !new URLSearchParams(location.search).has('nohelp')) {
        localStorage.setItem('skyline40-help', '1');
        setTimeout(() => useSkyline.getState().setHelpOpen(true), 2600);
      }
    } catch {
      /* armazenamento indisponível: segue sem a ajuda automática */
    }
  }, []);

  // ao mudar de modo no celular, abre as informações do contexto
  useEffect(() => {
    if (mobile && mode !== 'overview') setSheet('info');
  }, [mode, mobile]);
  useEffect(() => {
    if (!mobile && mode !== 'overview') setInfoOpen(true);
  }, [mode, mobile]);

  // informa à câmera quanto espaço os painéis ocupam (o edifício fica centralizado na área livre)
  useLayoutEffect(() => {
    const s = useSkyline.getState();
    if (hidden || tour) {
      s.setInsets({ left: 0, right: 0, bottom: 0 });
      return;
    }
    if (mobile) {
      const h = sheet && sheetRef.current ? sheetRef.current.offsetHeight : 0;
      s.setInsets({ left: 0, right: 0, bottom: Math.round(h * 0.9) });
    } else {
      s.setInsets({ left: 92, right: infoOpen ? (width < 1180 ? 314 : 372) : 0, bottom: 0 });
    }
  });

  if (hidden) return <ShowUiButton />;

  if (mobile) {
    return (
      <div className="ui ui--mobile">
        <TopBar />
        {tour ? (
          <TourPlayer />
        ) : (
          <>
            <AnimatePresence>
              {sheet && (
                <motion.div
                  ref={sheetRef}
                  className="sheet"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={(_, info) => info.offset.y > 80 && setSheet(null)}
                >
                  <div className="sheet__grip" aria-hidden="true" />
                  <div className="sheet__body">
                    {sheet === 'floors' && <FloorRail embedded />}
                    {sheet === 'info' && <InfoPanel embedded />}
                    {sheet === 'layers' && <LayersPanel embedded />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mobile-tabs" role="tablist" aria-label="Painéis">
              {([['floors', 'Pavimentos', Building], ['info', 'Informações', Info], ['layers', 'Camadas', SlidersHorizontal]] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" role="tab" aria-selected={sheet === id} className={sheet === id ? 'is-on' : ''} onClick={() => setSheet(sheet === id ? null : id)}>
                  <Icon size={17} strokeWidth={1.7} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <Dock />
          </>
        )}
        <HelpOverlay />
      </div>
    );
  }

  return (
    <div className="ui">
      <TopBar />
      {!tour && <FloorRail />}
      {!tour && (
        <>
          <AnimatePresence initial={false}>
            {infoOpen && (
              <motion.div className="info-wrap" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <InfoPanel />
              </motion.div>
            )}
          </AnimatePresence>
          <button type="button" className={`info-toggle${infoOpen ? ' is-open' : ''}`} onClick={() => setInfoOpen((o) => !o)} aria-expanded={infoOpen} aria-label={infoOpen ? 'Recolher painel de informações' : 'Abrir painel de informações'}>
            <Info size={16} />
          </button>
          <Dock />
        </>
      )}
      {tour && <TourPlayer />}
      <HelpOverlay />
    </div>
  );
}
