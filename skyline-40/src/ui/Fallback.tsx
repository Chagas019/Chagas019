import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { floorLabel, getFloorInfo, isResidential } from '../data/building';
import { UNITS, unitSummary } from '../data/apartment';
import { garageStats } from '../data/garage';
import { Elevation } from './plans/Elevation';
import { ApartmentPlan } from './plans/ApartmentPlan';
import { GaragePlan } from './plans/GaragePlan';

/**
 * Experiência alternativa para dispositivos sem WebGL (ou quando a cena 3D falha):
 * corte clicável dos 40 pavimentos, planta do apartamento, planta da garagem e galeria.
 */
export function Fallback({ reason, onRetry }: { reason: string; onRetry?: () => void }) {
  const [floor, setFloor] = useState(24);
  const [garage, setGarage] = useState<number | null>(null);
  const [roof, setRoof] = useState(false);
  const info = getFloorInfo(floor);
  const g = garageStats();
  return (
    <section className="fallback" aria-labelledby="fb-title">
      <div className="fallback__notice" role="status">
        <AlertTriangle size={18} />
        <div>
          <strong>Modo alternativo sem 3D.</strong> {reason} Você ainda pode explorar o edifício pelos desenhos interativos abaixo.
        </div>
        {onRetry && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            <RotateCcw size={15} /> Tentar 3D novamente
          </button>
        )}
      </div>
      <h2 id="fb-title" className="fallback__title">Explore os pavimentos</h2>
      <div className="fallback__grid">
        <div className="elevation-wrap">
          <Elevation
            selected={roof || garage !== null ? null : floor}
            onSelect={(n) => { setFloor(n); setGarage(null); setRoof(false); }}
            onGarage={(l) => { setGarage(l); setRoof(false); }}
            onRoof={() => { setRoof(true); setGarage(null); }}
            height={560}
          />
        </div>
        <div className="fallback__panel" aria-live="polite">
          {roof ? (
            <>
              <span className="kicker">Cobertura</span>
              <h3>Piscina panorâmica e terraço</h3>
              <ul className="uses">
                <li>Piscina com borda infinita voltada para o mar</li>
                <li>Deck em madeira com espreguiçadeiras e ombrelones</li>
                <li>Lounge com lareira, espaço gourmet sob pérgola</li>
                <li>Jardim de contemplação e mirante com lunetas</li>
              </ul>
              <img className="fallback__img" src="./gallery/cobertura.jpg" alt="Cobertura com piscina panorâmica" loading="lazy" />
            </>
          ) : garage !== null ? (
            <>
              <span className="kicker">Garagem · G{garage + 1}</span>
              <h3>{g.perLevel} vagas por nível (exemplo)</h3>
              <GaragePlan level={garage} />
            </>
          ) : (
            <>
              <span className="kicker">{info.sector.name}</span>
              <h3>Pavimento {floorLabel(floor)} · {info.title}</h3>
              <p>{info.description}</p>
              <ul className="uses">{info.uses.map((u) => <li key={u}>{u}</li>)}</ul>
              {isResidential(floor) && (
                <>
                  <p className="note">
                    Unidades {UNITS.map((u) => `${floorLabel(floor)}${u.id}`).join(', ')} · {unitSummary(floor).bedrooms} · {unitSummary(floor).area}
                  </p>
                  <ApartmentPlan />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
