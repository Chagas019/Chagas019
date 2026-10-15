import { RANGES, type AdjustmentKey, type Adjustments } from '../engine/adjustments';
import { Slider } from './Slider';

const GROUPS: { title: string; items: { key: AdjustmentKey; label: string }[] }[] = [
  {
    title: 'Luz',
    items: [
      { key: 'exposure', label: 'Exposição' },
      { key: 'contrast', label: 'Contraste' },
      { key: 'highlights', label: 'Realces' },
      { key: 'shadows', label: 'Sombras' },
      { key: 'whites', label: 'Brancos' },
      { key: 'blacks', label: 'Pretos' },
    ],
  },
  {
    title: 'Cor',
    items: [
      { key: 'temperature', label: 'Temperatura' },
      { key: 'tint', label: 'Matiz' },
      { key: 'vibrance', label: 'Vibração' },
      { key: 'saturation', label: 'Saturação' },
    ],
  },
  {
    title: 'Efeitos',
    items: [
      { key: 'fade', label: 'Esmaecer' },
      { key: 'vignette', label: 'Vinheta' },
      { key: 'grain', label: 'Granulação' },
    ],
  },
];

const formatExposure = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2).replace('.', ',')} EV`;

interface Props {
  manual: Adjustments;
  onChange: (key: AdjustmentKey, value: number) => void;
}

/** Ajustes manuais. Somam-se ao preset escolhido. */
export function AdjustPanel({ manual, onChange }: Props) {
  return (
    <div className="panel-section">
      {GROUPS.map((g) => (
        <fieldset key={g.title} className="adjust-group">
          <legend>{g.title}</legend>
          {g.items.map(({ key, label }) => {
            const r = RANGES[key];
            return (
              <Slider
                key={key}
                label={label}
                value={manual[key]}
                min={r.min}
                max={r.max}
                step={r.step}
                {...(key === 'exposure' ? { format: formatExposure } : {})}
                onChange={(v) => onChange(key, v)}
              />
            );
          })}
        </fieldset>
      ))}
      <p className="hint">Toque duas vezes num controle para zerá-lo.</p>
    </div>
  );
}
