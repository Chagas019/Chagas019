import { useEffect } from 'react';
import { useSkyline } from '../../state/store';
import type { ViewId } from '../../three/camera/views';

const VIEWS: Record<string, ViewId> = { '1': 'overview', '2': 'top', '3': 'bottom', '4': 'front', '5': 'side' };

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useSkyline.getState();
      const k = e.key;
      if (k === 'Escape') {
        if (s.helpOpen) s.setHelpOpen(false);
        else if (s.uiHidden) s.setUiHidden(false);
        else if (s.tour.active) s.setTour({ active: false, step: 0, paused: false });
        else if (s.mode === 'apartment' && s.selectedFloor) s.selectFloor(s.selectedFloor);
        else if (s.mode !== 'overview') s.setView('overview');
        else if (s.exploded) s.toggleExploded(false);
        return;
      }
      if (s.helpOpen) return;
      if (VIEWS[k]) return s.setView(VIEWS[k]);
      switch (k.toLowerCase()) {
        case 'e': return s.toggleExploded();
        case 'n': return s.cycleTimeOfDay();
        case 'h': return s.setUiHidden(!s.uiHidden);
        case 'r': return s.resetCamera();
        case 'c': return s.openRooftop();
        case 'a': return s.openApartment();
        case 'g': return s.openGarage(0);
        case 't': return s.setTour({ active: !s.tour.active, step: 0, paused: false });
        case '?': return s.setHelpOpen(true);
        case 'f': {
          if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
          else document.documentElement.requestFullscreen?.().catch(() => undefined);
          return;
        }
        case ' ':
          if (s.tour.active) {
            e.preventDefault();
            s.setTour({ paused: !s.tour.paused });
          }
          return;
      }
      if (k === 'ArrowUp' || k === 'PageUp') {
        e.preventDefault();
        s.stepFloor(1);
      } else if (k === 'ArrowDown' || k === 'PageDown') {
        e.preventDefault();
        s.stepFloor(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
