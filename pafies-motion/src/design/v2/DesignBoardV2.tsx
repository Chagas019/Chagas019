/**
 * Prancha V2 — personagem líquido, splash, linha branca, pinceladas e anel.
 * Composição "DesignBoardV2" (pasta Design). Estática (1 frame).
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import "../fonts";
import { FONT_CONDENSED } from "../fonts";
import { BG_V2, INK_V2, TONE_V2 } from "./tokensV2";
import { PersonagemLiquido, RUN_KEYS, wavePose, jumpPose, pointPose, runCycle, PERSONAGEM_CORES } from "./PersonagemLiquido";
import { Splash } from "./Splash";
import { LinhaBranca, linhaDiagonalArco, linhaReta } from "./LinhaBranca";
import { PinceladasVelocidade } from "./PinceladasVelocidade";
import { AnelFrase } from "./AnelFrase";

const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = INK_V2.white }) => (
  <div style={{ position: "absolute", left: 18, top: 12, fontFamily: FONT_CONDENSED, fontSize: 26, color, letterSpacing: "0.04em", opacity: 0.9 }}>
    {children}
  </div>
);

const Panel: React.FC<{ x: number; y: number; w: number; h: number; bg: string; children: React.ReactNode }> = ({ x, y, w, h, bg, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: bg, overflow: "hidden" }}>{children}</div>
);

export const DesignBoardV2: React.FC = () => {
  const W = 2400;
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {/* linha 1 — ciclo de corrida (8 poses) */}
      <Panel x={0} y={0} w={W} h={520} bg={BG_V2.orange}>
        <Label>RUNCYCLE — 8 POSES (ON TWOS)</Label>
        {RUN_KEYS.map((p, i) => (
          <PersonagemLiquido key={i} size={330} pose={p} seed={i} x={160 + i * 297} y={470} />
        ))}
      </Panel>
      {/* linha 2 */}
      <Panel x={0} y={530} w={590} h={620} bg={BG_V2.orange}>
        <Label>WAVEPOSE</Label>
        <PersonagemLiquido size={380} pose={wavePose(0.25)} seed={3} x={295} y={560} />
      </Panel>
      <Panel x={600} y={530} w={590} h={620} bg={BG_V2.turquoise}>
        <Label>JUMPPOSE 0.22 / 0.56</Label>
        <PersonagemLiquido size={300} pose={jumpPose(0.22)} seed={4} x={160} y={570} colors={PERSONAGEM_CORES.sobreTurquesa} />
        <PersonagemLiquido size={300} pose={jumpPose(0.56)} seed={5} x={420} y={570} colors={PERSONAGEM_CORES.sobreTurquesa} />
      </Panel>
      <Panel x={1200} y={530} w={590} h={620} bg={BG_V2.navy}>
        <Label>POINTPOSE</Label>
        <PersonagemLiquido size={380} pose={pointPose(1)} seed={6} x={240} y={560} colors={PERSONAGEM_CORES.sobreMarinho} />
      </Panel>
      <Panel x={1800} y={530} w={600} h={620} bg={BG_V2.orange}>
        <Label>MELT 0.6</Label>
        <PersonagemLiquido size={360} pose={wavePose(0)} melt={0.6} seed={7} x={300} y={560} />
      </Panel>
      {/* linha 3 — câmera baixa sobre pinceladas */}
      <Panel x={0} y={1160} w={1190} h={760} bg={BG_V2.orange}>
        <PinceladasVelocidade width={1190} height={760} center={{ x: 520, y: 520 }} progress={0.3} seed={2} colors={[TONE_V2.strokeOnOrangeLight, TONE_V2.strokeOnOrangeDark, "#FF9A52"]} innerRadius={90} />
        <Label>LOWANGLE=1 + PINCELADAS</Label>
        <PersonagemLiquido size={430} pose={runCycle(3 / 8)} lowAngle={1} seed={9} x={560} y={700} colors={{ ground: null }} />
      </Panel>
      <Panel x={1200} y={1160} w={1200} h={760} bg={BG_V2.electric}>
        <Label>ANELFRASE</Label>
        <div style={{ position: "absolute", left: 40, top: 40 }}>
          <AnelFrase text="ESTÃO PREPARADOS ✦ " radius={230} bandHeight={120} rotateX={-24} rotateY={-28} rotateZ={-18} />
        </div>
        <div style={{ position: "absolute", left: 620, top: 80 }}>
          <AnelFrase text="ESTÃO PREPARADOS ✦ " radius={210} bandHeight={110} rotateX={-10} rotateY={0} rotateZ={0} />
        </div>
      </Panel>
      {/* linha 4 — splash e linha branca */}
      <Panel x={0} y={1930} w={1190} h={470} bg={BG_V2.orange}>
        <Label>SPLASH 0.08 / 0.25 / 0.5</Label>
        <Splash progress={0.08} seed={1} x={200} y={380} />
        <Splash progress={0.25} seed={1} x={590} y={380} />
        <Splash progress={0.5} seed={1} x={980} y={380} />
      </Panel>
      <Panel x={1200} y={1930} w={1200} h={470} bg={BG_V2.orange}>
        <Label>LINHABRANCA</Label>
        <LinhaBranca width={1200} height={470} d={linhaReta(-50, 40, 1250, 440)} start={0.1} end={0.75} thickness={8} />
        <LinhaBranca width={1200} height={470} d={linhaDiagonalArco(100, 470, 880, 250, 150, 260)} start={0} end={0.9} thickness={10} />
      </Panel>
    </AbsoluteFill>
  );
};
