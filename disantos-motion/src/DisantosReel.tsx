import { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, continueRender, delayRender } from "remotion";
import { S01Despertar } from "./scenes/S01Despertar";
import { S02Memoria } from "./scenes/S02Memoria";
import { S03Identidade } from "./scenes/S03Identidade";
import { S04Conexao } from "./scenes/S04Conexao";
import { S05Assinatura } from "./scenes/S05Assinatura";
import { Captions } from "./components/Captions";
import { MusicMix } from "./audio/MusicMix";
import { SCENES, TOTAL_FRAMES } from "./config/timeline";
import { BRAND } from "./config/brand";

// Espera as fontes carregarem antes de renderizar qualquer quadro. Sem isso, o render
// pode capturar um frame com a fonte de reserva.
const FONT_LOADS = [
  '400 96px "Cormorant Garamond"',
  'italic 400 96px "Cormorant Garamond"',
  '500 60px "Cormorant Garamond"',
  '500 40px "Manrope"',
  '400 40px "Manrope"',
];

const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender("carregando fontes"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all(FONT_LOADS.map((f) => document.fonts.load(f)))
      .catch(() => undefined)
      .finally(() => {
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return <>{ready ? children : null}</>;
};

// Composição principal: 20 s, 1080×1920, 30 FPS. As cenas se sobrepõem por frames de
// transição; cada uma usa máscaras próprias para revelar a seguinte.
export const DisantosReel: React.FC = () => (
  <FontGate>
    <AbsoluteFill style={{ backgroundColor: BRAND.colors.black, fontFamily: BRAND.fonts.text, color: BRAND.colors.ivory }}>
      <Sequence from={SCENES.despertar.from} durationInFrames={SCENES.despertar.length}>
        <S01Despertar />
      </Sequence>
      <Sequence from={SCENES.memoria.from} durationInFrames={SCENES.memoria.length + SCENES.memoria.overlap}>
        <S02Memoria />
      </Sequence>
      <Sequence from={SCENES.identidade.from} durationInFrames={SCENES.identidade.length + SCENES.identidade.overlap}>
        <S03Identidade />
      </Sequence>
      <Sequence from={SCENES.conexao.from} durationInFrames={SCENES.conexao.length + SCENES.conexao.overlap}>
        <S04Conexao />
      </Sequence>
      <Sequence from={SCENES.assinatura.from} durationInFrames={TOTAL_FRAMES - SCENES.assinatura.from}>
        <S05Assinatura />
      </Sequence>

      <Captions />
      <MusicMix />
    </AbsoluteFill>
  </FontGate>
);
