import { useId } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Valor ao clicar duas vezes / no botão de zerar. */
  defaultValue?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  /** Mostra a trilha preenchida a partir do centro (controles bipolares). */
  bipolar?: boolean;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  defaultValue = 0,
  format = (v) => (v > 0 ? `+${v}` : String(v)),
  onChange,
  bipolar = min < 0,
}: Props) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  const zero = bipolar ? ((0 - min) / (max - min)) * 100 : 0;
  const from = Math.min(pct, zero);
  const to = Math.max(pct, zero);
  const changed = value !== defaultValue;

  return (
    <div className={`slider${changed ? ' is-changed' : ''}`}>
      <div className="slider-head">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="slider-value"
          onClick={() => onChange(defaultValue)}
          disabled={!changed}
          aria-label={`Zerar ${label}`}
          title="Zerar"
        >
          {format(value)}
        </button>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(defaultValue)}
        aria-valuetext={format(value)}
        style={{ ['--from' as string]: `${from}%`, ['--to' as string]: `${to}%` }}
      />
    </div>
  );
}
