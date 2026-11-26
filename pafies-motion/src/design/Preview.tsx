import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, GRADIENTS, SHADOWS, TRACKING } from "./tokens";
import { FONT_CONDENSED, FONT_DISPLAY, FONT_SANS, FONT_SCRIPT } from "./fonts";
import {
  AnelTexto,
  Blob,
  Coracao,
  Fita,
  Grao,
  Pessoa,
  Respingos,
  Selo,
  Sparkle,
  SpeedLines,
} from "./elements";

const Cell: React.FC<{ x: number; y: number; w: number; h: number; label: string; children: React.ReactNode; clip?: boolean }> = ({
  x, y, w, h, label, children, clip,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 18, overflow: clip ? "hidden" : "visible", border: `1px solid ${COLORS.navySoft}` }}>
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    <div style={{ position: "absolute", left: 14, top: 10, fontFamily: FONT_SANS, fontWeight: 600, fontSize: 15, letterSpacing: "0.2em", color: COLORS.cream, opacity: 0.45 }}>
      {label}
    </div>
  </div>
);

const ribbonD = "M40 300 C 180 120, 300 360, 420 200 S 600 60, 680 230";

export const DesignBoard: React.FC = () => (
  <AbsoluteFill style={{ background: GRADIENTS.bg }}>
    {/* coluna 1: selo-lockup */}
    <Cell x={30} y={30} w={620} h={1020} label="SELO">
      <div style={{ position: "relative", width: 580, height: 580 }}>
        <Selo size={580} draw={1} fill={1} shimmer={0.35} style={{ position: "absolute", inset: 0 }} />
        <Pessoa size={150} reach={0.85} variant="A" style={{ position: "absolute", left: 110, top: 92 }} />
        <Pessoa size={150} reach={0.85} variant="B" flip style={{ position: "absolute", left: 345, top: 92 }} />
        <Coracao size={200} morph={1} wave={1.2} style={{ position: "absolute", left: 190, top: 110 }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 262, textAlign: "center", fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 74, letterSpacing: TRACKING.display900, color: COLORS.cream, textShadow: SHADOWS.text }}>
          GINCANA
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 306, textAlign: "center", fontFamily: FONT_SCRIPT, fontSize: 92, color: COLORS.cream, textShadow: SHADOWS.text }}>
          Solidária
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 418, textAlign: "center", fontFamily: FONT_SANS, fontWeight: 800, fontSize: 40, letterSpacing: TRACKING.pafies, color: COLORS.cream }}>
          PAFIES
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 466, textAlign: "center", fontFamily: FONT_SANS, fontWeight: 600, fontSize: 24, letterSpacing: TRACKING.edicaoSeal, background: GRADIENTS.gold, WebkitBackgroundClip: "text", color: "transparent" }}>
          10ª EDIÇÃO
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30, alignItems: "center" }}>
        <Selo size={150} draw={0.6} fill={0.3} wobble={0.8} />
        <Selo size={150} draw={1} fill={1} waves={10} />
        <Sparkle size={60} />
        <Sparkle size={40} color={COLORS.white} rotation={45} />
      </div>
    </Cell>

    {/* coluna 2 */}
    <Cell x={670} y={30} w={600} h={330} label="CORAÇÃO · MORPH 0 / 0.5 / 1">
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 20 }}>
        <Coracao size={170} morph={0} />
        <Coracao size={170} morph={0.5} />
        <Coracao size={200} morph={1} wave={2} pulse={0.03} />
      </div>
    </Cell>
    <Cell x={670} y={380} w={600} h={330} label="PESSOA · A / B / C">
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginTop: 30 }}>
        <Pessoa size={230} reach={0} variant="A" />
        <Pessoa size={230} reach={0.5} variant="B" />
        <Pessoa size={230} reach={1} variant="C" flip />
      </div>
    </Cell>
    <Cell x={670} y={730} w={600} h={320} label="FITA" clip>
      <svg width={600} height={320} viewBox="0 0 720 380" style={{ overflow: "visible" }}>
        <path d={ribbonD} fill="none" stroke={COLORS.navySoft} strokeWidth={3} strokeDasharray="14 10" transform="translate(0 40)" />
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: 600, height: 320, transform: "scale(0.8333)", transformOrigin: "0 0" }}>
        <Fita d={ribbonD} start={0.05} end={0.95} width={28} glow={0.6} canvasWidth={720} canvasHeight={380} />
      </div>
    </Cell>

    {/* coluna 3 */}
    <Cell x={1290} y={30} w={600} h={330} label="BLOB · RESPINGOS">
      <div style={{ position: "relative", width: 600, height: 330 }}>
        <Blob radius={95} seed="a" phase={0.4} shine={1} style={{ position: "absolute", left: 30, top: 50 }} />
        <Blob radius={70} seed="b" phase={1.2} color={COLORS.electric} style={{ position: "absolute", left: 220, top: 120 }} />
        <Blob radius={40} seed="c" phase={2} color={COLORS.navySoft} amplitude={0.25} style={{ position: "absolute", left: 250, top: 30 }} />
        <Respingos progress={0.4} count={12} seed="board" spread={170} style={{ position: "absolute", left: 160, top: -170 }} canvas={600} />
      </div>
    </Cell>
    <Cell x={1290} y={380} w={600} h={330} label="SPEED LINES" clip>
      <div style={{ position: "absolute", inset: 0, background: GRADIENTS.electric }} />
      <SpeedLines width={600} height={330} count={44} innerRadius={70} progress={0.45} thickness={7} outerRadius={420} />
      <div style={{ position: "relative", fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 64, color: COLORS.cream, textShadow: SHADOWS.text }}>10ª</div>
    </Cell>
    <Cell x={1290} y={730} w={600} h={320} label="ANEL TIPOGRÁFICO" clip>
      <AnelTexto text="SOLIDÁRIA ✦ " radius={210} fontSize={56} rotateY={24} />
      <div style={{ position: "absolute", fontFamily: FONT_SCRIPT, fontSize: 84, color: COLORS.cream, textShadow: SHADOWS.text }}>Solidária</div>
    </Cell>

    <Grao seed={3} opacity={0.06} />
  </AbsoluteFill>
);
