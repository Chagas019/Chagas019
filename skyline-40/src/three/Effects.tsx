import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useSkyline } from '../state/store';

/**
 * Pós-processamento (apenas na qualidade máxima): brilho das luzes ao entardecer e à noite,
 * tone mapping ACES e vinheta suave. De dia o bloom fica desligado para não lavar as cores.
 */
export default function Effects() {
  const tod = useSkyline((s) => s.timeOfDay);
  const glow = tod !== 'day';
  return (
    <EffectComposer key={glow ? "glow" : "plain"} multisampling={4} enableNormalPass={false}>
      {glow ? <Bloom mipmapBlur luminanceThreshold={tod === 'night' ? 0.85 : 1.6} luminanceSmoothing={0.25} intensity={tod === 'night' ? 0.9 : 0.4} radius={0.65} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.3} darkness={0.45} />
    </EffectComposer>
  );
}
