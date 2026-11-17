// Peças estáticas da marca: logo, foto de perfil, board de identidade, capas e templates.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F, SLOGAN} from './tokens';
import {Emblem, Wordmark} from './Logo';
import {FilmFinish, LightRays, Particles} from '../core/cinema';
import {Chibi, KOLBE_PRISIONEIRO, OUT, Sparkle} from '../characters/Chibi';
import {Sunburst} from '../scenes/ep001/Props';

const BG: React.FC<{glow?: number}> = ({glow = 0.3}) => (
  <AbsoluteFill style={{background: `radial-gradient(circle at 50% 38%, rgba(212,162,76,${glow}), ${C.carvao} 62%)`, backgroundColor: C.carvao}} />
);

export const LogoStill: React.FC = () => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <BG />
    <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <Emblem size={420} />
      <div style={{marginTop: 70}}><Wordmark size={130} /></div>
    </div>
  </AbsoluteFill>
);

export const ProfilePic: React.FC = () => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: C.carvao}}>
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, ${C.terra}, ${C.carvao} 60%)`}} />
    <Particles n={40} seed="pp" size={[2, 5]} speed={0} opacity={0.5} />
    <div style={{position: 'relative'}}><Emblem size={470} mono /></div>
    <FilmFinish vignette={0.4} grain={0.05} />
  </AbsoluteFill>
);

const Swatch: React.FC<{c: string; n: string; h: string}> = ({c, n, h}) => (
  <div style={{width: 210, margin: 12}}>
    <div style={{height: 150, background: c, borderRadius: 10, border: `1px solid ${C.sepia}`}} />
    <div style={{fontFamily: F.titulo, fontSize: 24, color: C.pergaminho, marginTop: 10}}>{n}</div>
    <div style={{fontFamily: F.legenda, fontSize: 20, color: C.ocre}}>{h}</div>
  </div>
);

export const BrandBoard: React.FC = () => (
  <AbsoluteFill style={{background: C.carvao, padding: 70, color: C.pergaminho}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
      <Emblem size={170} />
      <div><Wordmark size={64} slogan={false} /><div style={{fontFamily: F.serifa, fontStyle: 'italic', fontSize: 32, color: C.ouroClaro, marginTop: 10}}>{SLOGAN}</div></div>
    </div>
    <div style={{fontFamily: F.titulo, color: C.ouro, fontSize: 30, letterSpacing: 8, marginTop: 70}}>PALETA</div>
    <div style={{display: 'flex', flexWrap: 'wrap', marginLeft: -12, marginTop: 10}}>
      <Swatch c={C.carvao} n="Carvão" h={C.carvao} /><Swatch c={C.sepia} n="Sépia" h={C.sepia} /><Swatch c={C.terra} n="Terra" h={C.terra} /><Swatch c={C.ocre} n="Ocre" h={C.ocre} />
      <Swatch c={C.ouro} n="Ouro" h={C.ouro} /><Swatch c={C.ouroClaro} n="Ouro claro" h={C.ouroClaro} /><Swatch c={C.pergaminho} n="Pergaminho" h={C.pergaminho} /><Swatch c={C.martirio} n="Martírio" h={C.martirio} />
    </div>
    <div style={{fontFamily: F.titulo, color: C.ouro, fontSize: 30, letterSpacing: 8, marginTop: 50}}>TIPOGRAFIA</div>
    <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 64, marginTop: 16}}>Cinzel — Títulos</div>
    <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 600, fontSize: 56, color: C.ouroClaro}}>Cormorant Garamond — citações</div>
    <div style={{fontFamily: F.legenda, fontWeight: 800, fontSize: 50, marginTop: 6}}>Inter ExtraBold — <span style={{color: C.ouroClaro}}>legendas</span></div>
    <div style={{fontFamily: F.titulo, color: C.ouro, fontSize: 30, letterSpacing: 8, marginTop: 50}}>ELEMENTOS</div>
    <div style={{display: 'flex', gap: 40, alignItems: 'center', marginTop: 20}}>
      <Emblem size={110} />
      <svg width={260} height={120}><line x1={0} y1={60} x2={110} y2={60} stroke={C.ouro} strokeWidth={2} /><rect x={124} y={40} width={6} height={40} fill={C.ouro} /><rect x={112} y={52} width={30} height={6} fill={C.ouro} /><line x1={150} y1={60} x2={260} y2={60} stroke={C.ouro} strokeWidth={2} /></svg>
      <div style={{fontFamily: F.titulo, fontSize: 40, color: C.pergaminho, border: `2px solid ${C.ouro}`, padding: '10px 26px'}}>EP. 001</div>
    </div>
    <div style={{fontFamily: F.serifa, fontSize: 30, color: C.ocre, marginTop: 40, lineHeight: 1.35}}>
      Ilustração 2D cinematográfica · texturas de pintura digital · luz dramática dourada · granulação de película ·
      parallax em camadas · arco ogival como moldura recorrente.
    </div>
    <FilmFinish vignette={0.4} />
  </AbsoluteFill>
);

/** Capa do episódio (Reels 9:16, área segura central 1080x1350 para o grid). */
export const Cover: React.FC<{ep?: string; title?: string; saint?: string}> = ({ep = 'EPISÓDIO 001', title = 'O HOMEM QUE ESCOLHEU MORRER POR AMOR', saint = 'São Maximiliano Maria Kolbe'}) => (
  <AbsoluteFill style={{background: C.carvao}}>
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      <Sunburst cx={540} cy={700} a="#E9B44C" b="#F2C766" n={22} speed={0} />
      <Chibi {...KOLBE_PRISIONEIRO} x={540} y={1500} h={1150} arms="pray" eyesClosed halo={1} seed="cover" />
      <Sparkle x={220} y={520} r={44} phase={1.2} /><Sparkle x={870} y={430} r={36} phase={1.4} />
    </svg>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(14,11,8,0.0) 55%, rgba(14,11,8,0.9) 70%, #0E0B08 100%)'}} />
    <AbsoluteFill style={{alignItems: 'center', top: 170}}>
      <div style={{fontFamily: F.titulo, fontWeight: 600, fontSize: 30, letterSpacing: 12, color: C.carvao, background: C.ouro, padding: '8px 22px'}}>SANTORAMA · {ep}</div>
    </AbsoluteFill>
    <AbsoluteFill style={{alignItems: 'center', top: 1260, padding: '0 80px'}}>
      <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 92, lineHeight: 1.04, color: C.pergaminho, textAlign: 'center', textShadow: '0 6px 30px #000'}}>
        {title.split(' ').map((w, i) => <span key={i} style={{color: w === 'AMOR' ? C.ouroClaro : undefined}}>{w} </span>)}
      </div>
      <div style={{width: 220, height: 2, background: C.ouro, margin: '30px 0 20px'}} />
      <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 600, fontSize: 46, color: C.ouroClaro}}>{saint}</div>
    </AbsoluteFill>
    <FilmFinish vignette={0.6} />
  </AbsoluteFill>
);

/** Post de feed 4:5 para divulgar o episódio. */
export const FeedPost: React.FC = () => (
  <AbsoluteFill style={{overflow: 'hidden'}}>
    <div style={{position: 'absolute', top: -285, left: 0, width: 1080, height: 1920}}><Cover /></div>
  </AbsoluteFill>
);

/** Template de Stories: moldura, caixa de enquete/pergunta e chamada para o episódio. */
export const StoryTemplate: React.FC = () => (
  <AbsoluteFill style={{background: C.carvao}}>
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 30%, ${C.sepia}, ${C.carvao} 70%)`}} />
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      <path d="M90,1700 L90,620 Q90,250 540,170 Q990,250 990,620 L990,1700 Z" fill="none" stroke={C.ouro} strokeWidth={3} />
    </svg>
    <AbsoluteFill style={{alignItems: 'center', top: 300}}>
      <Emblem size={130} />
      <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 40, letterSpacing: 10, color: C.pergaminho, marginTop: 30}}>NOVO EPISÓDIO</div>
      <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontSize: 72, color: C.ouroClaro, marginTop: 30, textAlign: 'center', padding: '0 140px', lineHeight: 1.1}}>[Nome do santo]</div>
      <div style={{width: 760, height: 560, marginTop: 50, border: `2px dashed ${C.ocre}`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.legenda, fontSize: 30, color: C.ocre}}>
        área do frame do episódio / figurinha
      </div>
      <div style={{marginTop: 50, fontFamily: F.legenda, fontWeight: 800, fontSize: 40, color: C.carvao, background: C.ouro, padding: '18px 40px', borderRadius: 60}}>ASSISTA NO REELS ↗</div>
    </AbsoluteFill>
    <FilmFinish vignette={0.5} />
  </AbsoluteFill>
);

/** Template de Reels: zonas seguras do Instagram + posição de legenda e marca d'água. */
export const ReelFrameTemplate: React.FC = () => (
  <AbsoluteFill style={{background: C.noite}}>
    <AbsoluteFill style={{top: 0, height: 220, background: 'rgba(142,42,32,0.25)'}} />
    <AbsoluteFill style={{top: 1600, height: 320, background: 'rgba(142,42,32,0.25)'}} />
    <AbsoluteFill style={{left: 900, width: 180, top: 900, height: 700, background: 'rgba(142,42,32,0.25)'}} />
    <div style={{position: 'absolute', top: 1340, left: 70, right: 70, height: 170, border: `2px dashed ${C.ouro}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.legenda, fontWeight: 800, fontSize: 56, color: C.pergaminho}}>
      Legenda <span style={{color: C.ouroClaro, marginLeft: 14}}>destaque</span>
    </div>
    <div style={{position: 'absolute', top: 150, width: '100%', textAlign: 'center', fontFamily: F.titulo, fontSize: 30, letterSpacing: 12, color: C.ouro}}>SANTORAMA · EPISÓDIO 000</div>
    <div style={{position: 'absolute', top: 700, width: '100%', textAlign: 'center', fontFamily: F.legenda, fontSize: 32, color: C.ocre, lineHeight: 1.5}}>
      ÁREA SEGURA DE ARTE<br />vermelho = interface do Instagram<br />(topo 220px · base 320px · lateral direita)
    </div>
  </AbsoluteFill>
);
