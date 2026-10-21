import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useSkyline } from '../state/store';
import { QUALITY } from '../config/performance';

/**
 * Pós-processamento (qualidades Equilibrada e Máxima): oclusão de ambiente (sombras de contato
 * entre lajes, brises e mobiliário), brilho das luzes ao entardecer/noite, tone mapping ACES,
 * leve gradação de cor e vinheta — o "acabamento de render" da maquete.
 */
export default function Effects() {
  const tod = useSkyline((s) => s.timeOfDay);
  const quality = useSkyline((s) => s.quality);
  const q = QUALITY[quality];
  const glow = tod !== 'day';
  const ao = q.ao !== 'off';
  return (
    <EffectComposer key={`${glow ? 'glow' : 'plain'}-${q.ao}`} multisampling={0} enableNormalPass={false}>
      {ao ? <N8AO aoRadius={2.2} distanceFalloff={1.2} intensity={tod === 'night' ? 1.4 : 2.4} halfRes={q.ao === 'half'} quality={q.ao === 'half' ? 'low' : 'medium'} /> : <></>}
      {glow ? <Bloom mipmapBlur luminanceThreshold={tod === 'night' ? 0.85 : 1.4} luminanceSmoothing={0.25} intensity={tod === 'night' ? 0.9 : 0.5} radius={0.65} /> : <Bloom mipmapBlur luminanceThreshold={2.2} luminanceSmoothing={0.2} intensity={0.25} radius={0.5} />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={0.08} />
      <BrightnessContrast contrast={0.06} />
      <Vignette eskil={false} offset={0.3} darkness={0.45} />
      <SMAA />
    </EffectComposer>
  );
}
