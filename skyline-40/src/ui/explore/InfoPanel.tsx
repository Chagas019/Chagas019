import { ArrowLeft, Box, CarFront, ChevronDown, ChevronUp, Clapperboard, DoorOpen, Eye, Layers3, Map, Sofa, Waves, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { FLOOR_COUNT, ROOF_Y, SECTORS, floorLabel, getFloorInfo, isResidential } from '../../data/building';
import { ROOMS, UNITS, getUnit, unitSummary, type UnitId } from '../../data/apartment';
import { GARAGE_CONFIG, garageLevels, garageStats } from '../../data/garage';
import { DEMO_FLOOR, useSkyline } from '../../state/store';
import type { RooftopSpot } from '../../three/camera/views';
import { ApartmentPlan } from '../plans/ApartmentPlan';
import { GaragePlan } from '../plans/GaragePlan';

function Section({ title, kicker, children, onClose }: { title: string; kicker?: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="info__section">
      <div className="info__head">
        <div>
          {kicker && <div className="kicker">{kicker}</div>}
          <h2 className="info__title">{title}</h2>
        </div>
        {onClose && (
          <button type="button" className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Fechar e voltar à visão geral">
            <X size={16} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Action({ icon, children, onClick, primary }: { icon?: ReactNode; children: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" className={`action${primary ? ' action--primary' : ''}`} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

const Note = () => <p className="note">Dados conceituais e ilustrativos — sujeitos a desenvolvimento e validação por profissionais habilitados.</p>;

function Overview() {
  const s = useSkyline.getState;
  return (
    <Section title="SKYLINE 40" kicker="Residencial conceitual">
      <p className="info__lead">Torre residencial de 40 pavimentos voltada para o mar, com cobertura panorâmica e dois subsolos de garagem.</p>
      <dl className="stats">
        <div><dt>Pavimentos</dt><dd>40</dd></div>
        <div><dt>Altura*</dt><dd>≈{Math.round(ROOF_Y)} m</dd></div>
        <div><dt>Subsolos</dt><dd>{GARAGE_CONFIG.levels}</dd></div>
      </dl>
      <div className="actions">
        <Action primary icon={<Waves size={16} />} onClick={() => s().openRooftop()}>Explorar cobertura</Action>
        <Action icon={<Sofa size={16} />} onClick={() => s().openApartment()}>Apartamento decorado</Action>
        <Action icon={<CarFront size={16} />} onClick={() => s().openGarage(0, 'perspective')}>Descer à garagem</Action>
        <Action icon={<Layers3 size={16} />} onClick={() => s().toggleExploded(true)}>Vista explodida</Action>
      </div>
      <h3 className="info__sub">Setores</h3>
      <ul className="legend">
        {SECTORS.map((sec) => (
          <li key={sec.id}>
            <button type="button" onClick={() => s().selectFloor(sec.range[0] === 40 ? 40 : Math.round((sec.range[0] + sec.range[1]) / 2))}>
              <i style={{ background: sec.color }} />
              <span>
                <strong>{sec.name}</strong>
                <small>{sec.range[0] === sec.range[1] ? `Pavimento ${sec.range[0]}` : `Pavimentos ${floorLabel(sec.range[0])}–${floorLabel(sec.range[1])}`} · {sec.summary}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="hint">Dica: clique num andar para isolá-lo; clique de novo para escolher uma unidade.</p>
    </Section>
  );
}

function FloorDetails({ floor }: { floor: number }) {
  const info = getFloorInfo(floor);
  const unit = useSkyline((st) => st.selectedUnit);
  const exploded = useSkyline((st) => st.exploded);
  const s = useSkyline.getState;
  return (
    <Section title={`Pavimento ${info.label}`} kicker={info.sector.name} onClose={() => s().selectFloor(null)}>
      <div className="floor-nav">
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => s().stepFloor(-1)} disabled={floor <= 1} aria-label="Pavimento abaixo"><ChevronDown size={16} /></button>
        <span className="floor-nav__n" style={{ ['--sector' as string]: info.sector.color }}>{info.label}</span>
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => s().stepFloor(1)} disabled={floor >= FLOOR_COUNT} aria-label="Pavimento acima"><ChevronUp size={16} /></button>
        <span className="floor-nav__t">{info.title}</span>
      </div>
      <p className="info__lead">{info.description}</p>
      <ul className="uses">{info.uses.map((u) => <li key={u}>{u}</li>)}</ul>
      {isResidential(floor) && (
        <>
          <h3 className="info__sub">Unidades</h3>
          <div className="units" role="group" aria-label="Unidades do pavimento">
            {UNITS.map((u) => (
              <button key={u.id} type="button" className={`unit${unit === u.id ? ' is-on' : ''} unit--${u.id}`} aria-pressed={unit === u.id} onClick={() => s().selectUnit(floor, u.id)}>
                <strong>{info.label}{u.id}</strong>
                <small>{u.position}</small>
              </button>
            ))}
          </div>
          {unit ? <UnitDetails floor={floor} unitId={unit} /> : <p className="hint">Selecione uma unidade aqui ou clicando nela no modelo.</p>}
        </>
      )}
      {floor === FLOOR_COUNT && <Action primary icon={<Waves size={16} />} onClick={() => s().openRooftop()}>Subir à cobertura</Action>}
      <div className="actions actions--row">
        <Action icon={<Layers3 size={16} />} onClick={() => s().toggleExploded()}>{exploded ? 'Juntar pavimentos' : 'Ver na vista explodida'}</Action>
      </div>
      <Note />
    </Section>
  );
}

function UnitDetails({ floor, unitId }: { floor: number; unitId: UnitId }) {
  const u = getUnit(unitId);
  const sum = unitSummary(floor);
  const s = useSkyline.getState;
  return (
    <div className="unit-card">
      <div className="unit-card__head">
        <strong>Unidade {floorLabel(floor)}{unitId}</strong>
        <span>{u.position} · vista {u.view.toLowerCase()}</span>
      </div>
      <dl className="specs">
        <div><dt>Dormitórios</dt><dd>{sum.bedrooms}</dd></div>
        <div><dt>Ambientes</dt><dd>{sum.rooms}</dd></div>
        <div><dt>Área</dt><dd>{sum.area}</dd></div>
      </dl>
      <ul className="uses">{sum.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
      <Action primary icon={<DoorOpen size={16} />} onClick={() => s().openApartment(floor, unitId)}>Entrar no apartamento decorado</Action>
    </div>
  );
}

function ApartmentDetails() {
  const floor = useSkyline((st) => st.selectedFloor) ?? DEMO_FLOOR;
  const unitId = useSkyline((st) => st.selectedUnit) ?? 'B';
  const view = useSkyline((st) => st.apartmentView);
  const room = useSkyline((st) => st.apartmentRoom);
  const s = useSkyline.getState;
  const sum = unitSummary(floor);
  const u = getUnit(unitId);
  return (
    <Section title={`Apartamento ${floorLabel(floor)}${unitId}`} kicker="Apartamento decorado · demonstrativo" onClose={() => s().selectFloor(floor)}>
      <div className="segmented" role="group" aria-label="Forma de visualização">
        {([['perspective', 'Perspectiva', <Eye key="i" size={15} />], ['plan', 'Planta superior', <Map key="i" size={15} />], ['interior', 'Interior 3D', <Box key="i" size={15} />]] as const).map(([id, label, icon]) => (
          <button key={id} type="button" className={view === id ? 'is-on' : ''} aria-pressed={view === id} onClick={() => s().setApartmentView(id)}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
      <ApartmentPlan activeRoom={view === 'interior' ? room : undefined} onRoom={(id) => s().setApartmentView('interior', id)} compact />
      <h3 className="info__sub">Percorrer ambientes</h3>
      <div className="chips">
        {ROOMS.filter((r) => r.eye).map((r) => (
          <button key={r.id} type="button" className={`chip${view === 'interior' && room === r.id ? ' is-on' : ''}`} onClick={() => s().setApartmentView('interior', r.id)}>
            {r.name}
          </button>
        ))}
      </div>
      {view === 'interior' && <p className="hint">Arraste para olhar ao redor. Escolha outro ambiente para caminhar até ele.</p>}
      <dl className="specs">
        <div><dt>Unidade</dt><dd>{u.position}</dd></div>
        <div><dt>Dormitórios</dt><dd>{sum.bedrooms}</dd></div>
        <div><dt>Área</dt><dd>{sum.area}</dd></div>
      </dl>
      <h3 className="info__sub">Acabamentos (exemplo)</h3>
      <ul className="uses">
        <li>Piso em madeira natural e porcelanato em placas grandes</li>
        <li>Bancadas em pedra mineral clara</li>
        <li>Esquadrias em alumínio grafite com vidro de controle solar</li>
        <li>Iluminação embutida em forro de gesso</li>
      </ul>
      <Action icon={<ArrowLeft size={16} />} onClick={() => s().selectFloor(floor)}>Voltar ao pavimento</Action>
      <Note />
    </Section>
  );
}

const SPOTS: { id: RooftopSpot; label: string }[] = [
  { id: 'overview', label: 'Visão da cobertura' },
  { id: 'pool', label: 'Piscina panorâmica' },
  { id: 'deck', label: 'Deck e espreguiçadeiras' },
  { id: 'lounge', label: 'Lounge com lareira' },
  { id: 'gourmet', label: 'Espaço gourmet' },
  { id: 'garden', label: 'Jardim e contemplação' },
  { id: 'mirante', label: 'Mirante' },
];

function RooftopDetails() {
  const spot = useSkyline((st) => st.rooftopSpot);
  const s = useSkyline.getState;
  return (
    <Section title="Cobertura panorâmica" kicker={`Cota ≈ ${Math.round(ROOF_Y)} m (exemplo)`} onClose={() => s().setView('overview')}>
      <p className="info__lead">Piscina com borda infinita voltada para o mar, deck em madeira, lounge, espaço gourmet sob pérgola e jardim de contemplação.</p>
      <div className="spot-list">
        {SPOTS.map((sp) => (
          <button key={sp.id} type="button" className={`spot${spot === sp.id ? ' is-on' : ''}`} onClick={() => s().openRooftop(sp.id)}>
            {sp.label}
          </button>
        ))}
      </div>
      <Action primary icon={<Clapperboard size={16} />} onClick={() => s().playRooftopFilm()}>Apresentação cinematográfica</Action>
      <p className="hint">Use o modo noturno para ver a iluminação da piscina e do coroamento.</p>
      <Note />
    </Section>
  );
}

function GarageDetails() {
  const level = useSkyline((st) => st.garageLevel);
  const view = useSkyline((st) => st.garageView);
  const s = useSkyline.getState;
  const stats = garageStats();
  return (
    <Section title="Garagem subterrânea" kicker="Configuração paramétrica" onClose={() => s().setView('overview')}>
      <div className="segmented" role="group" aria-label="Nível">
        {garageLevels().map((g) => (
          <button key={g.id} type="button" className={level === g.index ? 'is-on' : ''} aria-pressed={level === g.index} onClick={() => s().openGarage(g.index)}>
            <span>{g.id}</span>
          </button>
        ))}
      </div>
      <div className="segmented" role="group" aria-label="Vista da garagem">
        {([['perspective', 'Perspectiva'], ['top', 'Superior'], ['street', 'Nível do piso']] as const).map(([id, label]) => (
          <button key={id} type="button" className={view === id ? 'is-on' : ''} aria-pressed={view === id} onClick={() => s().openGarage(level, id)}>
            <span>{label}</span>
          </button>
        ))}
      </div>
      {view === 'street' && <p className="hint">Arraste para olhar ao redor, na altura dos olhos.</p>}
      <dl className="stats">
        <div><dt>Vagas/nível</dt><dd>{stats.perLevel}</dd></div>
        <div><dt>Total*</dt><dd>{stats.total}</dd></div>
        <div><dt>Profundidade</dt><dd>{stats.depth.toFixed(1).replace('.', ',')} m</dd></div>
      </dl>
      <GaragePlan level={level} compact />
      <p className="note">Profundidade, número de níveis, vagas e rampas são parâmetros editáveis (src/data/garage.ts) e não foram aprovados em projeto.</p>
    </Section>
  );
}

export function InfoPanel({ embedded }: { embedded?: boolean }) {
  const mode = useSkyline((st) => st.mode);
  const floor = useSkyline((st) => st.selectedFloor);
  let content: ReactNode;
  if (mode === 'apartment') content = <ApartmentDetails />;
  else if (mode === 'rooftop') content = <RooftopDetails />;
  else if (mode === 'garage') content = <GarageDetails />;
  else if (mode === 'floor' && floor) content = <FloorDetails floor={floor} />;
  else content = <Overview />;
  return (
    <aside className={`info${embedded ? ' info--embedded' : ''}`} aria-label="Informações" aria-live="polite">
      {content}
    </aside>
  );
}
