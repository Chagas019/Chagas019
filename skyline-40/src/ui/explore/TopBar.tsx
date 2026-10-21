import { Building2, CarFront, CircleHelp, EyeOff, Home, Maximize, Minimize, Play, Sofa, Waves } from 'lucide-react';
import { useSkyline, type Mode } from '../../state/store';
import { useFullscreen, useIsMobile } from '../../hooks/useEnvironmentSync';
import { floorLabel } from '../../data/building';

const MODE_LABEL: Record<Mode, string> = {
  overview: 'Edifício',
  floor: 'Pavimento',
  apartment: 'Apartamento decorado',
  rooftop: 'Cobertura',
  garage: 'Garagem',
};

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className={`logo${small ? ' logo--small' : ''}`} aria-label="SKYLINE 40">
      <svg viewBox="0 0 24 32" aria-hidden="true">
        <rect x="6" y="1" width="12" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 9h12M6 15h12M6 21h12" stroke="var(--accent-2)" strokeWidth="1.2" />
      </svg>
      <span className="logo__word">SKYLINE<b>40</b></span>
    </span>
  );
}

export function TopBar() {
  const mode = useSkyline((s) => s.mode);
  const floor = useSkyline((s) => s.selectedFloor);
  const tour = useSkyline((s) => s.tour.active);
  const { active: fs, toggle } = useFullscreen();
  const mobile = useIsMobile();
  const s = useSkyline.getState;

  const crumb = mode === 'floor' && floor ? `Pavimento ${floorLabel(floor)}` : mode === 'apartment' && floor ? `Apartamento decorado · ${floorLabel(floor)}` : MODE_LABEL[mode];

  const modes: { id: Mode; label: string; icon: typeof Building2; run: () => void }[] = [
    { id: 'overview', label: 'Edifício', icon: Building2, run: () => s().setView('overview') },
    { id: 'rooftop', label: 'Cobertura', icon: Waves, run: () => s().openRooftop() },
    { id: 'apartment', label: 'Apartamento', icon: Sofa, run: () => s().openApartment() },
    { id: 'garage', label: 'Garagem', icon: CarFront, run: () => s().openGarage(0, 'perspective') },
  ];

  return (
    <header className="topbar" role="banner">
      <div className="topbar__left">
        <button type="button" className="ghost-btn" onClick={() => s().goHome()} aria-label="Voltar ao início">
          <Logo small={mobile} />
        </button>
        {!mobile && <span className="topbar__crumb" aria-live="polite">{crumb}</span>}
      </div>
      {!mobile && !tour && (
        <nav className="modes" aria-label="Ambientes">
          {modes.map((m) => {
            const Icon = m.icon;
            const on = mode === m.id || (m.id === 'overview' && mode === 'floor');
            return (
              <button key={m.id} type="button" className={`modes__btn${on ? ' is-on' : ''}`} aria-pressed={on} onClick={m.run}>
                <Icon size={16} strokeWidth={1.6} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      <div className="topbar__right">
        {!tour && (
          <button type="button" className="pill-btn pill-btn--accent" onClick={() => s().setTour({ active: true, step: 0, paused: false })}>
            <Play size={15} strokeWidth={1.8} />
            {!mobile && <span>Apresentação guiada</span>}
          </button>
        )}
        <button type="button" className="icon-btn" onClick={() => s().setHelpOpen(true)} aria-label="Ajuda" title="Ajuda (?)">
          <CircleHelp size={18} strokeWidth={1.6} />
        </button>
        <button type="button" className="icon-btn" onClick={() => s().setUiHidden(true)} aria-label="Ocultar interface" title="Ocultar interface (H)">
          <EyeOff size={18} strokeWidth={1.6} />
        </button>
        <button type="button" className="icon-btn" onClick={toggle} aria-label={fs ? 'Sair da tela cheia' : 'Tela cheia'} title="Tela cheia (F)">
          {fs ? <Minimize size={18} strokeWidth={1.6} /> : <Maximize size={18} strokeWidth={1.6} />}
        </button>
        {!mobile && (
          <button type="button" className="icon-btn" onClick={() => s().goHome()} aria-label="Página inicial" title="Página inicial">
            <Home size={18} strokeWidth={1.6} />
          </button>
        )}
      </div>
    </header>
  );
}

export { MODE_LABEL };
