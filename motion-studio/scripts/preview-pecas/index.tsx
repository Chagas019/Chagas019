// Entry TEMPORÁRIO do agente PEÇAS para conferir os cenários em stills. Não faz parte do Root.
import React from 'react';
import {AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Estrada} from '../../src/pecas/cenario/Estrada';
import {Horizonte} from '../../src/pecas/cenario/Horizonte';
import {Revelacao} from '../../src/pecas/cenario/Revelacao';
import {AssinaturaVersiculo, Colchetes, Divisor, Marcador} from '../../src/pecas/Ornamentos';
import {paletas} from '../../src/cor/tema';

loadFont({family: 'Cormorant Garamond', url: staticFile('fontes/CormorantGaramond-600-latin.woff2'), weight: '600'});
loadFont({family: 'Cormorant Garamond', url: staticFile('fontes/CormorantGaramond-500i-latin.woff2'), weight: '500', style: 'italic'});
const p = paletas.fe;

const Paisagem: React.FC<{luz: number; nascer: number; curva?: number}> = ({luz, nascer, curva = 0}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Horizonte luz={luz} nascer={nascer} deriva={frame * 0.3} />
      <Estrada luz={luz} avanco={frame * 0.06} curva={curva} deriva={frame * 0.3} />
    </AbsoluteFill>
  );
};

const Rev: React.FC<{pr: number}> = ({pr}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <Revelacao progresso={pr} forma="arco" centroY={0.5}>
      <Paisagem luz={1} nascer={1} />
    </Revelacao>
  </AbsoluteFill>
);

const Orn: React.FC = () => (
  <AbsoluteFill style={{background: '#06080c', alignItems: 'center', justifyContent: 'center', gap: 120, flexDirection: 'column'}}>
    <Colchetes largura={760} altura={300} cor={p.primaria} entradaEm={0} estilo="cantos">
      <div style={{color: p.texto, fontFamily: 'Oswald, sans-serif', fontSize: 90, letterSpacing: '0.04em'}}>CONFIE.</div>
    </Colchetes>
    <Divisor largura={600} cor={p.primaria} entradaEm={0} />

    <div style={{display: 'flex', gap: 60}}>
      <Marcador tamanho={30} cor={p.primaria} entradaEm={0} />
      <Marcador tamanho={30} cor={p.primaria} entradaEm={0} tipo="ponto" brilho={0.6} />
      <Marcador tamanho={30} cor={p.primaria} entradaEm={0} tipo="cruzeta" />
      <Marcador tamanho={30} cor={p.primaria} entradaEm={0} preenchido={false} />
    </div>
    <Colchetes largura={760} altura={200} cor={p.textoSuave} entradaEm={0} estilo="moldura" />
    <AssinaturaVersiculo largura={800} entradaEm={0} corTexto={p.textoSuave} corFio={p.primaria} citacao="Ele é o caminho, a verdade e a vida." corCitacao={p.texto} />
  </AbsoluteFill>
);

const Root: React.FC = () => (
  <>
    <Composition id="Noite" component={() => <Paisagem luz={0} nascer={0} />} durationInFrames={300} fps={60} width={1080} height={1920} />
    <Composition id="Meio" component={() => <Paisagem luz={0.5} nascer={0.4} curva={-0.6} />} durationInFrames={300} fps={60} width={1080} height={1920} />
    <Composition id="Amanhecer" component={() => <Paisagem luz={1} nascer={1} curva={0.4} />} durationInFrames={300} fps={60} width={1080} height={1920} />
    <Composition id="AmanhecerH" component={() => <Paisagem luz={1} nascer={1} />} durationInFrames={300} fps={60} width={1920} height={1080} />
    <Composition id="Rev15" component={() => <Rev pr={0.15} />} durationInFrames={300} fps={60} width={1080} height={1920} />
    <Composition id="Rev45" component={() => <Rev pr={0.45} />} durationInFrames={300} fps={60} width={1080} height={1920} />
    <Composition id="Rev75" component={() => <Rev pr={0.75} />} durationInFrames={300} fps={60} width={1080} height={1920} />
    <Composition id="Ornamentos" component={Orn} durationInFrames={300} fps={60} width={1080} height={1920} />
  </>
);
registerRoot(Root);
