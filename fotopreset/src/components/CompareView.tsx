import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Props {
  original: ImageData;
  rendered: ImageData | null;
  compare: boolean;
  /** Mostrar só a original (botão "segurar para ver"). */
  showOriginal: boolean;
  busy: boolean;
}

function draw(canvas: HTMLCanvasElement | null, img: ImageData | null) {
  if (!canvas || !img) return;
  if (canvas.width !== img.width) canvas.width = img.width;
  if (canvas.height !== img.height) canvas.height = img.height;
  canvas.getContext('2d')?.putImageData(img, 0, 0);
}

/** Prévia com comparação antes/depois por divisória arrastável. */
export function CompareView({ original, rendered, compare, showOriginal, busy }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<HTMLCanvasElement>(null);
  const afterRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [split, setSplit] = useState(50);

  useEffect(() => draw(beforeRef.current, original), [original]);
  useEffect(() => draw(afterRef.current, rendered ?? original), [rendered, original]);

  // Encaixa a foto no espaço disponível mantendo a proporção original.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const cs = getComputedStyle(stage);
      const sw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const sh = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const scale = Math.min(sw / original.width, sh / original.height);
      setBox({ width: Math.floor(original.width * scale), height: Math.floor(original.height * scale) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [original.width, original.height]);

  const clip = showOriginal ? 'inset(0 0 0 100%)' : compare ? `inset(0 0 0 ${split}%)` : 'none';

  return (
    <div className="stage" ref={stageRef}>
      <div className="photo-frame" style={{ width: box.width, height: box.height }}>
        <canvas ref={beforeRef} className="photo-canvas" aria-hidden="true" />
        <canvas
          ref={afterRef}
          className="photo-canvas"
          style={{ clipPath: clip }}
          role="img"
          aria-label={showOriginal ? 'Foto original' : 'Foto editada'}
        />
        {compare && !showOriginal && (
          <>
            <span className="compare-tag left">Antes</span>
            <span className="compare-tag right">Depois</span>
            <div className="compare-line" style={{ left: `${split}%` }} aria-hidden="true">
              <span className="compare-knob" />
            </div>
            <input
              className="compare-range"
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-label="Divisória antes e depois"
              aria-valuetext={`${Math.round(split)}% antes`}
            />
          </>
        )}
        {showOriginal && <span className="compare-tag left">Original</span>}
        {busy && <span className="busy-dot" aria-hidden="true" />}
      </div>
    </div>
  );
}
