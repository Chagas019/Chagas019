import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { CUTS, IMPACTS, TOTAL_FRAMES, seconds } from "../config/timeline";
import { NARRATION_WINDOWS } from "../config/captions";
import { hasNarration, MUSIC_FILE, NARRATION_FILE, SFX } from "../config/assets";

// Volume da trilha ao longo do tempo: contemplação no início, crescimento até o clímax
// (16 s) e saída suave. Quando há narração, a trilha abaixa em cada janela de fala.
const musicVolume = (frame: number) => {
  const base = interpolate(
    frame,
    [0, seconds(3), seconds(12), seconds(16), TOTAL_FRAMES - seconds(1.2), TOTAL_FRAMES],
    [0.42, 0.56, 0.78, 0.9, 0.82, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const duck = NARRATION_WINDOWS.reduce((mult, [from, to]) => {
    const d = interpolate(frame, [from - 8, from + 2, to - 2, to + 10], [1, 0.38, 0.38, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return Math.min(mult, d);
  }, 1);
  return Math.max(0, Math.min(1, base * duck));
};

// Mixagem completa: trilha, narração (se houver), varreduras nos cortes, impactos e assinatura.
export const MusicMix: React.FC = () => (
  <>
    <Audio src={staticFile(MUSIC_FILE)} volume={musicVolume} />

    {hasNarration && <Audio src={staticFile(NARRATION_FILE)} volume={1} />}

    {CUTS.map((cut) => (
      <Sequence key={`w-${cut}`} from={Math.max(0, cut - 9)} durationInFrames={40}>
        <Audio src={staticFile(SFX.whoosh)} volume={0.5} />
      </Sequence>
    ))}

    {IMPACTS.map((at) => (
      <Sequence key={`i-${at}`} from={at} durationInFrames={60}>
        <Audio src={staticFile(SFX.impacto)} volume={0.8} />
      </Sequence>
    ))}

    <Sequence from={seconds(16.7)} durationInFrames={90}>
      <Audio src={staticFile(SFX.assinatura)} volume={0.6} />
    </Sequence>
  </>
);
