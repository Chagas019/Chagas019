import { useState, type DragEvent } from 'react';
import { ImageIcon, LockIcon } from './Icons';
import { Monogram } from './Logo';

interface Props {
  loading: boolean;
  error: string | null;
  onPick: () => void;
  onFile: (file: File) => void;
  onSample: () => void;
}

export function EmptyState({ loading, error, onPick, onFile, onSample }: Props) {
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <section
      className={`empty${over ? ' is-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      aria-labelledby="empty-title"
    >
      <div className="empty-inner">
        <Monogram size={84} />
        <p className="eyebrow">Chagas Color · FotoPreset</p>
        <h1 id="empty-title">
          A sua luz,
          <br />
          <em>a nossa cor.</em>
        </h1>
        <p className="lead">
          Presets autorais e ajustes finos aplicados pixel a pixel, com a resolução original da sua foto.
        </p>

        <div className="empty-actions">
          <button type="button" className="btn btn-gold btn-lg" onClick={onPick} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : <ImageIcon />}
            {loading ? 'Abrindo foto…' : 'Escolher foto'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSample} disabled={loading}>
            Experimentar com foto de exemplo
          </button>
        </div>
        <p className="drop-hint">ou arraste uma foto para cá · JPG, PNG, WEBP</p>

        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}

        <p className="privacy">
          <LockIcon width={14} height={14} /> Suas fotos não saem do aparelho. Nada é enviado nem guardado.
        </p>
      </div>
    </section>
  );
}
