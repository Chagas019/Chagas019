import { motion } from 'framer-motion';
import { ArrowRight, Box, Dumbbell, Flame, Leaf, Sofa, Sparkles, Sunrise, Users, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { SECTORS, TECH_SHEET, floorLabel } from '../../data/building';
import { garageStats } from '../../data/garage';
import { unitSummary } from '../../data/apartment';
import { useSkyline } from '../../state/store';
import type { GarageView, RooftopSpot, ViewId } from '../../three/camera/views';
import { ApartmentPlan } from '../plans/ApartmentPlan';
import { GaragePlan } from '../plans/GaragePlan';
import { Elevation } from '../plans/Elevation';

function Reveal({ children, className, id, label }: { children: ReactNode; className?: string; id?: string; label?: string }) {
  const reduced = useSkyline((s) => s.reducedMotion);
  return (
    <motion.section
      id={id}
      aria-label={label}
      className={`section ${className ?? ''}`}
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

/** Entra na maquete 3D já no ponto certo (ou, sem 3D, rola até a seção). */
function useOpen3D(has3D: boolean) {
  return (run: (s: ReturnType<typeof useSkyline.getState>) => void) => {
    if (!has3D) return;
    const s = useSkyline.getState();
    window.scrollTo({ top: 0 });
    s.enterExplore();
    setTimeout(() => run(useSkyline.getState()), 60);
  };
}

function Cta({ children, onClick, has3D }: { children: ReactNode; onClick: () => void; has3D: boolean }) {
  if (!has3D) return null;
  return (
    <button type="button" className="btn btn--ghost btn--sm" onClick={onClick}>
      <Box size={15} /> {children} <ArrowRight size={15} />
    </button>
  );
}

const GALLERY: { file: string; title: string; run: (s: ReturnType<typeof useSkyline.getState>) => void }[] = [
  { file: 'fachada-dia.jpg', title: 'Fachada frontal voltada para o mar', run: (s) => s.setView('front' as ViewId) },
  { file: 'noite.jpg', title: 'Coroamento iluminado à noite', run: (s) => { s.setTimeOfDay('night'); s.setView('overview'); } },
  { file: 'cobertura.jpg', title: 'Piscina panorâmica na cobertura', run: (s) => s.openRooftop('pool' as RooftopSpot) },
  { file: 'explodida.jpg', title: 'Vista explodida dos 40 pavimentos', run: (s) => s.toggleExploded(true) },
  { file: 'apartamento.jpg', title: 'Apartamento decorado em corte', run: (s) => s.openApartment() },
  { file: 'garagem.jpg', title: 'Garagem subterrânea G1', run: (s) => s.openGarage(0, 'perspective' as GarageView) },
];

export function Sections({ has3D }: { has3D: boolean }) {
  const open = useOpen3D(has3D);
  const g = garageStats();
  const sum = unitSummary(20);
  return (
    <main className="sections" id="conteudo">
      <Reveal id="conceito" className="section--split" label="Conceito arquitetônico">
        <div>
          <span className="kicker">01 · Conceito arquitetônico</span>
          <h2>Precisão, leveza e horizonte.</h2>
          <p>
            O SKYLINE 40 é uma torre esbelta de quarenta pavimentos implantada diante do mar. As lajes aparentes em branco mineral
            desenham linhas horizontais contínuas; a pele de vidro de controle solar reflete o céu; o núcleo central libera as quatro
            fachadas para a vista.
          </p>
          <p>
            A base se abre para a cidade com uma praça de chegada, espelho d’água e marquise em balanço. No topo, a cobertura se
            transforma num terraço panorâmico com piscina de borda infinita, emoldurado por um coroamento iluminado.
          </p>
          <Cta has3D={has3D} onClick={() => open((s) => s.setView('overview'))}>Ver a maquete</Cta>
        </div>
        <ul className="pillars">
          <li><Sunrise size={20} /><strong>Orientação</strong><span>Living e varandas voltados para o mar e o nascente.</span></li>
          <li><Sparkles size={20} /><strong>Materialidade</strong><span>Vidro, concreto aparente branco, alumínio grafite e madeira.</span></li>
          <li><Leaf size={20} /><strong>Paisagismo integrado</strong><span>Jardins na praça, canteiros na cobertura e alamedas.</span></li>
        </ul>
      </Reveal>

      <Reveal id="fachadas" label="Fachadas">
        <span className="kicker">02 · Fachadas</span>
        <h2>Quatro faces, uma mesma linguagem.</h2>
        <div className="cards cards--3">
          <article className="card"><h3>Frontal e fundos</h3><p>Varandas gourmet com guarda-corpo de vidro e uma lâmina branca vertical que marca o eixo do edifício.</p><Cta has3D={has3D} onClick={() => open((s) => s.setView('front'))}>Fachada frontal</Cta></article>
          <article className="card"><h3>Laterais</h3><p>Brises verticais de alumínio grafite filtram o sol da tarde e dão ritmo às empenas.</p><Cta has3D={has3D} onClick={() => open((s) => s.setView('side'))}>Fachada lateral</Cta></article>
          <article className="card"><h3>Noite</h3><p>Frisos de LED nas quinas, coroamento iluminado e janelas acesas revelam a escala da torre.</p><Cta has3D={has3D} onClick={() => open((s) => { s.setTimeOfDay('night'); s.setView('overview'); })}>Modo noturno</Cta></article>
        </div>
      </Reveal>

      <Reveal id="pavimentos" className="section--split" label="Pavimentos">
        <div>
          <span className="kicker">03 · Pavimentos</span>
          <h2>Organização vertical em quatro setores.</h2>
          <ul className="sectors">
            {SECTORS.map((sec) => (
              <li key={sec.id} style={{ ['--sector' as string]: sec.color }}>
                <strong>{sec.range[0] === sec.range[1] ? `Pavimento ${floorLabel(sec.range[0])}` : `${floorLabel(sec.range[0])} – ${floorLabel(sec.range[1])}`}</strong>
                <span>{sec.name}</span>
                <small>{sec.summary}</small>
              </li>
            ))}
          </ul>
          <p className="note">Distribuição conceitual, ajustável durante a definição arquitetônica.</p>
          <Cta has3D={has3D} onClick={() => open((s) => s.toggleExploded(true))}>Vista explodida</Cta>
        </div>
        <div className="elevation-wrap">
          <Elevation
            onSelect={has3D ? (n) => open((s) => s.selectFloor(n)) : undefined}
            onRoof={has3D ? () => open((s) => s.openRooftop()) : undefined}
            onGarage={has3D ? (l) => open((s) => s.openGarage(l)) : undefined}
          />
        </div>
      </Reveal>

      <Reveal id="apartamentos" className="section--split" label="Apartamentos">
        <div>
          <span className="kicker">04 · Apartamentos</span>
          <h2>Duas suítes, varanda gourmet, vista para o mar.</h2>
          <p>Quatro unidades por andar, organizadas ao redor do núcleo. Living integrado à cozinha com ilha e à varanda; suíte master com closet; lavabo social.</p>
          <dl className="specs specs--lg">
            <div><dt>Dormitórios</dt><dd>{sum.bedrooms}</dd></div>
            <div><dt>Ambientes</dt><dd>{sum.rooms}</dd></div>
            <div><dt>Área</dt><dd>{sum.area}</dd></div>
          </dl>
          <Cta has3D={has3D} onClick={() => open((s) => s.openApartment())}>Visitar o apartamento decorado</Cta>
        </div>
        <ApartmentPlan />
      </Reveal>

      <Reveal id="cobertura" label="Cobertura">
        <span className="kicker">05 · Cobertura</span>
        <h2>Um terraço sobre a cidade.</h2>
        <div className="cards cards--4">
          <article className="card"><Waves size={20} /><h3>Piscina panorâmica</h3><p>Borda infinita voltada para o mar, revestimento em pastilhas e iluminação subaquática.</p></article>
          <article className="card"><Sofa size={20} /><h3>Deck e lounge</h3><p>Espreguiçadeiras, ombrelones, sofás externos e lareira.</p></article>
          <article className="card"><Flame size={20} /><h3>Espaço gourmet</h3><p>Pérgola, churrasqueira, bancada em pedra e mesa para oito pessoas.</p></article>
          <article className="card"><Leaf size={20} /><h3>Jardim e mirante</h3><p>Canteiros elevados, bancos de contemplação e lunetas nas quinas.</p></article>
        </div>
        <div className="row-ctas">
          <Cta has3D={has3D} onClick={() => open((s) => s.openRooftop())}>Explorar cobertura</Cta>
          <Cta has3D={has3D} onClick={() => open((s) => s.playRooftopFilm())}>Apresentação cinematográfica</Cta>
        </div>
      </Reveal>

      <Reveal id="garagem" className="section--split" label="Garagem">
        <div>
          <span className="kicker">06 · Garagem</span>
          <h2>Dois subsolos, acesso direto aos elevadores.</h2>
          <p>Vagas demarcadas, circulação em sentido único, rampas, pilares sinalizados por cor de nível, áreas técnicas e escada de emergência.</p>
          <dl className="specs specs--lg">
            <div><dt>Níveis</dt><dd>{g.levels} (G1, G2)</dd></div>
            <div><dt>Vagas por nível</dt><dd>{g.perLevel} (exemplo)</dd></div>
            <div><dt>Profundidade</dt><dd>≈ {g.depth.toFixed(1).replace('.', ',')} m (exemplo)</dd></div>
          </dl>
          <p className="note">Quantidade de vagas, profundidade e rampas são parâmetros editáveis, sem aprovação técnica.</p>
          <Cta has3D={has3D} onClick={() => open((s) => s.openGarage(0, 'perspective'))}>Descer à garagem</Cta>
        </div>
        <GaragePlan level={0} />
      </Reveal>

      <Reveal id="areas-comuns" label="Áreas comuns">
        <span className="kicker">07 · Áreas comuns</span>
        <h2>Convivência em todos os níveis.</h2>
        <div className="cards cards--4">
          <article className="card"><Users size={20} /><h3>Térreo</h3><p>Lobby com pé-direito duplo, recepção, lounge e praça com espelho d’água.</p></article>
          <article className="card"><Dumbbell size={20} /><h3>Pavimento 02</h3><p>Academia, spa, sauna e sala de massagem.</p></article>
          <article className="card"><Sparkles size={20} /><h3>Pavimento 03</h3><p>Salão de festas, coworking, brinquedoteca e cinema privativo.</p></article>
          <article className="card"><Waves size={20} /><h3>Pavimento 40 e cobertura</h3><p>Sky lounge, adega e o terraço com piscina.</p></article>
        </div>
        <div className="row-ctas">
          <Cta has3D={has3D} onClick={() => open((s) => s.selectFloor(2))}>Ver pavimento 02</Cta>
          <Cta has3D={has3D} onClick={() => open((s) => s.selectFloor(40))}>Ver sky lounge</Cta>
        </div>
      </Reveal>

      <Reveal id="galeria" label="Galeria de imagens">
        <span className="kicker">08 · Galeria</span>
        <h2>Imagens da maquete digital.</h2>
        <p className="note">Capturas reais da cena 3D deste site{has3D ? ' — clique para abrir a vista correspondente.' : '.'}</p>
        <div className="gallery">
          {GALLERY.map((it) => (
            <figure key={it.file} className="gallery__item">
              <button type="button" onClick={() => open(it.run)} disabled={!has3D} aria-label={has3D ? `Abrir em 3D: ${it.title}` : it.title}>
                <img src={`./gallery/${it.file}`} alt={it.title} loading="lazy" width={800} height={500} />
              </button>
              <figcaption>{it.title}</figcaption>
            </figure>
          ))}
        </div>
      </Reveal>

      <Reveal id="ficha" className="section--split" label="Ficha técnica conceitual">
        <div>
          <span className="kicker">09 · Ficha técnica conceitual</span>
          <h2>Números de referência.</h2>
          <p className="note">Todos os valores são exemplos editáveis para a maquete digital e precisam ser definidos e validados por profissionais habilitados.</p>
        </div>
        <dl className="sheet-table">
          {TECH_SHEET.map((r) => (
            <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>
          ))}
        </dl>
      </Reveal>

      <Reveal id="creditos" className="section--credits" label="Créditos e observações">
        <span className="kicker">10 · Créditos e observações</span>
        <div className="credits">
          <p>
            <strong>SKYLINE 40</strong> é um empreendimento <strong>conceitual e ilustrativo</strong>. Não há incorporação, registro ou
            projeto aprovado associado a este material. Imagens, plantas, áreas, alturas, vagas e acabamentos são representações
            artísticas e exemplos editáveis, sujeitos a desenvolvimento e validação por arquitetos e engenheiros habilitados.
          </p>
          <p>
            Maquete digital modelada proceduralmente em tempo real com React, Three.js e React Three Fiber, sem modelos ou imagens de
            terceiros. Ícones: Lucide. Tipografia: Inter e Fraunces (Google Fonts).
          </p>
        </div>
        <footer className="footer">
          <span>© {new Date().getFullYear()} SKYLINE 40 — conceito</span>
          {has3D && <button type="button" className="btn btn--ghost btn--sm" onClick={() => open((s) => s.setTour({ active: true, step: 0, paused: false }))}>Assistir à apresentação guiada <ArrowRight size={15} /></button>}
        </footer>
      </Reveal>
    </main>
  );
}
