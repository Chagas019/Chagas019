// Grafismos editoriais minimalistas: fios, marcadores, colchetes/molduras e a assinatura do versículo.
// Dono: agente PEÇAS. Todos com entrada embutida (`entradaEm`, frame local) e nada renderizado antes dela.
import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {curvas, mola, springs} from '../movimento/curvas';

const prog = (frame: number, de: number, dur: number, easing = curvas.entrada) =>
  interpolate(frame, [de, de + dur], [0, 1], {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Saída opcional: some suavemente a partir de `saidaEm`. */
const fade = (frame: number, saidaEm?: number, dur = 30) =>
  saidaEm === undefined ? 1 : interpolate(frame, [saidaEm, saidaEm + dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: curvas.suave});

// ------------------------------------------------------------------ Fio
export type FioProps = {
  /** Comprimento em px. */
  comprimento: number;
  cor: string;
  entradaEm: number;
  /** Duração do desenho em frames (padrão 40). */
  duracao?: number;
  /** Espessura em px (padrão 1.5 × unidade). */
  espessura?: number;
  orientacao?: 'horizontal' | 'vertical';
  /** De onde o fio nasce (padrão 'centro'). */
  origem?: 'centro' | 'inicio' | 'fim';
  /** Pontas que se dissolvem (fio editorial afinado). Padrão true. */
  pontasSuaves?: boolean;
  saidaEm?: number;
  style?: React.CSSProperties;
};

export const Fio: React.FC<FioProps> = ({comprimento, cor, entradaEm, duracao = 40, espessura, orientacao = 'horizontal', origem = 'centro', pontasSuaves = true, saidaEm, style}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  if (frame < entradaEm) return null;
  const u = Math.min(width, height) / 1080;
  const e = espessura ?? 1.5 * u;
  const s = prog(frame, entradaEm, duracao);
  const h = orientacao === 'horizontal';
  const dir = h ? '90deg' : '180deg';
  const fundo = pontasSuaves ? `linear-gradient(${dir}, transparent 0%, ${cor} 22%, ${cor} 78%, transparent 100%)` : cor;
  const origemCss = origem === 'centro' ? 'center' : origem === 'inicio' ? (h ? 'left' : 'top') : h ? 'right' : 'bottom';
  return (
    <div
      style={{
        width: h ? comprimento : e,
        height: h ? e : comprimento,
        background: fundo,
        transform: h ? `scaleX(${s})` : `scaleY(${s})`,
        transformOrigin: origemCss,
        flexShrink: 0,
        opacity: fade(frame, saidaEm),
        ...style,
      }}
    />
  );
};

// ------------------------------------------------------------------ Marcador
export type MarcadorProps = {
  /** Lado do losango em px. */
  tamanho: number;
  cor: string;
  entradaEm: number;
  /** 'losango' (padrão), 'ponto' ou 'cruzeta' (mira fina +). */
  tipo?: 'losango' | 'ponto' | 'cruzeta';
  /** Preenchido (padrão) ou só contorno. */
  preenchido?: boolean;
  /** Halo de luz suave em volta (0..1, padrão 0). */
  brilho?: number;
  saidaEm?: number;
  style?: React.CSSProperties;
};

export const Marcador: React.FC<MarcadorProps> = ({tamanho, cor, entradaEm, tipo = 'losango', preenchido = true, brilho = 0, saidaEm, style}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  if (frame < entradaEm) return null;
  const u = Math.min(width, height) / 1080;
  const s = mola(frame, fps, entradaEm, springs.natural);
  const halo = brilho > 0 ? `0 0 ${tamanho * 1.2}px color-mix(in srgb, ${cor} ${Math.round(brilho * 47)}%, transparent)` : 'none';
  const linha = Math.max(1, 1.5 * u);
  const caixa: React.CSSProperties = {width: tamanho, height: tamanho, position: 'relative', opacity: Math.min(1, s) * fade(frame, saidaEm), ...style};
  if (tipo === 'cruzeta') {
    return (
      <div style={{...caixa, transform: `scale(${s}) rotate(${(1 - s) * 90}deg)`}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: (tamanho - linha) / 2, height: linha, background: cor, boxShadow: halo}} />
        <div style={{position: 'absolute', top: 0, bottom: 0, left: (tamanho - linha) / 2, width: linha, background: cor, boxShadow: halo}} />
      </div>
    );
  }
  return (
    <div style={caixa}>
      <div
        style={{
          position: 'absolute',
          inset: tipo === 'losango' ? tamanho * 0.15 : 0,
          borderRadius: tipo === 'ponto' ? '50%' : 0,
          background: preenchido ? cor : 'transparent',
          border: preenchido ? 'none' : `${linha}px solid ${cor}`,
          boxShadow: halo,
          transform: `${tipo === 'losango' ? `rotate(${45 + (1 - s) * 90}deg) ` : ''}scale(${s})`,
        }}
      />
    </div>
  );
};

// ------------------------------------------------------------------ Colchetes (moldura de cantos)
export type ColchetesProps = {
  largura: number;
  altura: number;
  cor: string;
  entradaEm: number;
  /** Comprimento de cada perna do canto, fração do menor lado (padrão 0.14). */
  canto?: number;
  /** Espessura em px (padrão 1.5 × unidade). */
  espessura?: number;
  /** Duração do desenho (padrão 36 frames). */
  duracao?: number;
  /** 'cantos' = 4 cantos · 'laterais' = colchetes [ ] · 'moldura' = retângulo fino que se fecha. */
  estilo?: 'cantos' | 'laterais' | 'moldura';
  /** Respiro: os cantos entram de fora para a posição (px, padrão 24 × unidade). */
  aproximacao?: number;
  saidaEm?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

export const Colchetes: React.FC<ColchetesProps> = ({largura, altura, cor, entradaEm, canto = 0.14, espessura, duracao = 36, estilo = 'cantos', aproximacao, saidaEm, children, style}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  if (frame < entradaEm) return null;
  const u = Math.min(width, height) / 1080;
  const e = espessura ?? 1.5 * u;
  const s = prog(frame, entradaEm, duracao);
  const ap = (aproximacao ?? 24 * u) * (1 - s);
  const perna = Math.min(largura, altura) * canto * s;
  const op = Math.min(1, s * 1.6) * fade(frame, saidaEm);

  const cantos: React.ReactNode[] = [];
  if (estilo === 'moldura') {
    const ph = (largura / 2) * s;
    const pv = (altura / 2) * s;
    // quatro meias-arestas crescem de cada canto em direção ao centro dos lados
    const b = (k: string, st: React.CSSProperties) => <div key={k} style={{position: 'absolute', background: cor, ...st}} />;
    cantos.push(
      b('t1', {left: 0, top: 0, width: ph, height: e}),
      b('t2', {right: 0, top: 0, width: ph, height: e}),
      b('b1', {left: 0, bottom: 0, width: ph, height: e}),
      b('b2', {right: 0, bottom: 0, width: ph, height: e}),
      b('l1', {left: 0, top: 0, width: e, height: pv}),
      b('l2', {left: 0, bottom: 0, width: e, height: pv}),
      b('r1', {right: 0, top: 0, width: e, height: pv}),
      b('r2', {right: 0, bottom: 0, width: e, height: pv}),
    );
  } else {
    const lista: [v: 'top' | 'bottom', hz: 'left' | 'right', dx: number, dy: number][] = [
      ['top', 'left', -1, -1],
      ['top', 'right', 1, -1],
      ['bottom', 'left', -1, 1],
      ['bottom', 'right', 1, 1],
    ];
    for (const [v, hz, dx, dy] of lista) {
      const alt = estilo === 'laterais' ? altura / 2 : perna;
      cantos.push(
        <div key={v + hz} style={{position: 'absolute', [v]: 0, [hz]: 0, width: perna, height: alt, transform: `translate(${dx * ap}px, ${dy * ap}px)`}}>
          <div style={{position: 'absolute', [v]: 0, [hz]: 0, width: perna, height: e, background: cor}} />
          <div style={{position: 'absolute', [v]: 0, [hz]: 0, width: e, height: estilo === 'laterais' ? alt * s : perna, background: cor}} />
        </div>,
      );
    }
  }
  return (
    <div style={{position: 'relative', width: largura, height: altura, ...style}}>
      <div style={{position: 'absolute', inset: 0, opacity: op}}>{cantos}</div>
      {children ? <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>{children}</div> : null}
    </div>
  );
};

// ------------------------------------------------------------------ Divisor (fio — losango — fio)
export type DivisorProps = {
  largura: number;
  cor: string;
  entradaEm: number;
  /** Cor do losango central (padrão = cor). */
  corCentro?: string;
  duracao?: number;
  saidaEm?: number;
  style?: React.CSSProperties;
};

export const Divisor: React.FC<DivisorProps> = ({largura, cor, entradaEm, corCentro, duracao = 44, saidaEm, style}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  if (frame < entradaEm) return null;
  const u = Math.min(width, height) / 1080;
  const tam = 12 * u;
  const braco = (largura - tam * 2.4) / 2;
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: largura, gap: tam * 0.2, opacity: fade(frame, saidaEm), ...style}}>
      <Fio comprimento={braco} cor={cor} entradaEm={entradaEm + 6} duracao={duracao} origem="fim" />
      <Marcador tamanho={tam * 2} cor={corCentro ?? cor} entradaEm={entradaEm} brilho={0.4} />
      <Fio comprimento={braco} cor={cor} entradaEm={entradaEm + 6} duracao={duracao} origem="inicio" />
    </div>
  );
};

// ------------------------------------------------------------------ AssinaturaVersiculo
export type AssinaturaVersiculoProps = {
  /** Largura total do lockup em px. Tudo interno é proporcional (base 720). */
  largura: number;
  entradaEm: number;
  /** Referência (padrão "JOÃO 14,6"). */
  referencia?: string;
  /** Linha opcional abaixo (ex.: "Ele é o caminho, a verdade e a vida."). */
  citacao?: string;
  /** Cor da referência (sugestão: paleta.textoSuave ou paleta.primaria). */
  corTexto: string;
  /** Cor dos fios e losangos (dourado da paleta). */
  corFio: string;
  /** Cor da citação (padrão corTexto). */
  corCitacao?: string;
  /** Família da referência (padrão serifada editorial Cormorant Garamond com fallback). */
  fonteReferencia?: string;
  /** Família da citação (padrão itálico Cormorant Garamond). */
  fonteCitacao?: string;
  saidaEm?: number;
  style?: React.CSSProperties;
};

const SERIFADA = '"Cormorant Garamond", "Cormorant", Georgia, "Times New Roman", serif';

export const AssinaturaVersiculo: React.FC<AssinaturaVersiculoProps> = ({
  largura,
  entradaEm,
  referencia = 'JOÃO 14,6',
  citacao,
  corTexto,
  corFio,
  corCitacao,
  fonteReferencia = SERIFADA,
  fonteCitacao = SERIFADA,
  saidaEm,
  style,
}) => {
  const frame = useCurrentFrame();
  if (frame < entradaEm) return null;
  const u = largura / 720;
  const fRef = 40 * u;
  const tLetra = prog(frame, entradaEm + 8, 60);
  const tCit = prog(frame, entradaEm + 34, 50);
  const espac = interpolate(tLetra, [0, 1], [0.5, 0.3]);
  const ladoFio = 200 * u;
  const op = fade(frame, saidaEm, 40);
  return (
    <div style={{width: largura, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: op, ...style}}>
      {/* fio superior curto, nasce do centro */}
      <Fio comprimento={96 * u} cor={corFio} entradaEm={entradaEm} duracao={40} espessura={Math.max(1, 1.4 * u)} style={{marginBottom: 24 * u}} />
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: largura, gap: 18 * u}}>
        <div style={{flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden'}}>
          <Fio comprimento={ladoFio} cor={corFio} entradaEm={entradaEm + 4} duracao={56} origem="fim" espessura={Math.max(1, 1.4 * u)} />
        </div>
        <Marcador tamanho={11 * u} cor={corFio} entradaEm={entradaEm + 14} brilho={0.5} />
        <div
          style={{
            fontFamily: fonteReferencia,
            fontWeight: 600,
            fontSize: fRef,
            lineHeight: 1,
            letterSpacing: `${espac}em`,
            // compensa o espaçamento da última letra para centralizar opticamente
            marginRight: `-${espac}em`,
            color: corTexto,
            fontVariantNumeric: 'lining-nums tabular-nums',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: largura * 0.66,
            flexShrink: 0,
            opacity: tLetra,
            filter: `blur(${(1 - tLetra) * 6 * u}px)`,
            textShadow: `0 0 ${18 * u}px color-mix(in srgb, ${corFio} 20%, transparent)`,
          }}
        >
          {referencia}
        </div>
        <Marcador tamanho={11 * u} cor={corFio} entradaEm={entradaEm + 14} brilho={0.5} />
        <div style={{flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-start', overflow: 'hidden'}}>
          <Fio comprimento={ladoFio} cor={corFio} entradaEm={entradaEm + 4} duracao={56} origem="inicio" espessura={Math.max(1, 1.4 * u)} />
        </div>
      </div>
      {citacao ? (
        <div
          style={{
            marginTop: 26 * u,
            fontFamily: fonteCitacao,
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 34 * u,
            lineHeight: 1.25,
            color: corCitacao ?? corTexto,
            textAlign: 'center',
            maxWidth: largura,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            opacity: tCit,
            transform: `translateY(${(1 - tCit) * 14 * u}px)`,
          }}
        >
          {citacao}
        </div>
      ) : null}
    </div>
  );
};
