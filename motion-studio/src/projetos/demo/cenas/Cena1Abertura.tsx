// Cena 1 — integração (agente CÓDIGO).
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera, Camada} from '../../../movimento/Camera';
import {anim, curvas} from '../../../movimento/curvas';
import {TituloCinetico} from '../../../texto/TituloCinetico';
import {Mascote} from '../../../personagens/Mascote';
import {escala, fontes} from '../../../texto/fontes';
import {areaSegura, msParaFrame, unidade} from '../../../config/formatos';
import {paletaDemo, gradDemo} from '../estilo';
import {vozDemo} from '../voz';

/** Mascote já pousado no frame 0 (estado de capa): a queda acontece "antes" do vídeo. */
export const ENTRADA_MASCOTE_ABERTURA = -90;
/** Kicker da capa sai antes da primeira palavra ("Dez", frame 18). */
const KICKER_SAIDA: [number, number] = [6, 16];

const Kicker: React.FC<{tamanho: number; alinhamento: 'center' | 'left'}> = ({tamanho, alinhamento}) => {
  const frame = useCurrentFrame();
  const saida = anim(frame, KICKER_SAIDA, [0, 1], curvas.saida);
  if (saida >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: alinhamento === 'center' ? 'center' : 'flex-start',
        pointerEvents: 'none',
        opacity: 1 - saida,
        transform: `translateY(${-saida * tamanho * 1.2}px)`,
      }}
    >
      <div
        style={{
          fontFamily: fontes.display,
          fontWeight: 700,
          fontSize: tamanho,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: paletaDemo.texto,
          display: 'flex',
          alignItems: 'center',
          gap: tamanho * 0.5,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{width: tamanho * 0.45, height: tamanho * 0.45, borderRadius: '50%', background: gradDemo.marca}} />
        Estúdio Motion
      </div>
    </div>
  );
};

export const Cena1Abertura: React.FC = () => {
  const {width, height} = useVideoConfig();
  const u = unidade(width, height);
  const vertical = height > width;
  const seg = areaSegura(width, height);
  const palavras = vozDemo.palavras.slice(0, 4);
  return (
    <Camera chaves={[{frame: 0, zoom: 1}, {frame: 200, zoom: 1.08}]}>
      <Camada profundidade={1}>
        <AbsoluteFill
          style={{
            flexDirection: vertical ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 80 * u,
            padding: `${seg.topo}px ${seg.x}px ${seg.base}px`,
          }}
        >
          <div style={{position: 'relative'}}>
            <TituloCinetico
              palavras={palavras.map((w) => w.text.trim())}
              entradas={palavras.map((w) => msParaFrame(w.startMs))}
              tamanho={escala.hero * u}
              cor={paletaDemo.texto}
              destaques={[3]}
              gradiente={gradDemo.marca}
              alinhamento={vertical ? 'center' : 'left'}
              maxLargura={vertical ? width - seg.x * 2 : width * 0.5}
            />
            <Kicker tamanho={escala.h3 * u} alinhamento={vertical ? 'center' : 'left'} />
          </div>
          <Mascote tamanho={340 * u} corCorpo={paletaDemo.primaria} corBrilho={paletaDemo.secundaria} entradaEm={ENTRADA_MASCOTE_ABERTURA} />
        </AbsoluteFill>
      </Camada>
    </Camera>
  );
};
