import { useState } from 'react';
import type { ExportFormat } from '../engine/core';
import { exportFileName, formatBytes, formatMegapixels } from '../services/files';
import { canShareFile, downloadFile, shareFile } from '../services/save';
import type { Photo } from '../hooks/useEditor';
import { DownloadIcon, ShareIcon } from './Icons';
import { Slider } from './Slider';

interface Props {
  photo: Photo;
  exportPhoto: (format: ExportFormat, quality: number, onProgress: (f: number) => void) => Promise<Blob>;
  notify: (kind: 'success' | 'error' | 'info', text: string) => void;
}

type State = { kind: 'idle' } | { kind: 'working'; progress: number } | { kind: 'ready'; file: File };

export function ExportPanel({ photo, exportPhoto, notify }: Props) {
  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [quality, setQuality] = useState(95);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const { width, height } = photo.info;

  async function run() {
    setState({ kind: 'working', progress: 0 });
    try {
      const blob = await exportPhoto(format, quality / 100, (progress) =>
        setState({ kind: 'working', progress }),
      );
      const file = new File([blob], exportFileName(photo.name, format), { type: blob.type });
      if (canShareFile(file)) {
        // Celular: deixa a pessoa escolher entre salvar na galeria ou compartilhar.
        setState({ kind: 'ready', file });
        notify('success', `Foto pronta (${formatBytes(file.size)}).`);
      } else {
        downloadFile(file);
        setState({ kind: 'idle' });
        notify('success', `${file.name} salva (${formatBytes(file.size)}).`);
      }
    } catch (e) {
      setState({ kind: 'idle' });
      notify('error', e instanceof Error ? e.message : 'Falha na exportação.');
    }
  }

  async function share(file: File) {
    try {
      const r = await shareFile(file);
      if (r === 'shared') setState({ kind: 'idle' });
    } catch (e) {
      notify('error', e instanceof Error ? e.message : 'Falha ao compartilhar.');
    }
  }

  const working = state.kind === 'working';

  return (
    <div className="panel-section export">
      <div className="export-info">
        <span>Resolução original preservada</span>
        <strong>
          {width} × {height} px · {formatMegapixels(width, height)}
        </strong>
      </div>

      <fieldset className="segmented" disabled={working}>
        <legend className="sr-only">Formato</legend>
        {(['jpeg', 'png'] as const).map((f) => (
          <label key={f} className={format === f ? 'is-active' : ''}>
            <input
              type="radio"
              name="format"
              value={f}
              checked={format === f}
              onChange={() => {
                setFormat(f);
                setState({ kind: 'idle' });
              }}
            />
            {f === 'jpeg' ? 'JPG' : 'PNG'}
            <small>{f === 'jpeg' ? 'menor, para redes e envio' : 'sem perdas, arquivo maior'}</small>
          </label>
        ))}
      </fieldset>

      {format === 'jpeg' && (
        <Slider
          label="Qualidade do JPG"
          value={quality}
          min={70}
          max={100}
          step={1}
          defaultValue={95}
          bipolar={false}
          format={(v) => `${v}%`}
          onChange={(v) => {
            setQuality(v);
            setState({ kind: 'idle' });
          }}
        />
      )}

      {state.kind === 'ready' ? (
        <div className="export-actions">
          <button type="button" className="btn btn-gold" onClick={() => void share(state.file)}>
            <ShareIcon /> Salvar na galeria / compartilhar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              downloadFile(state.file);
              setState({ kind: 'idle' });
            }}
          >
            <DownloadIcon /> Baixar arquivo
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-gold btn-block" onClick={() => void run()} disabled={working}>
          {working ? (
            <>
              <span className="spinner" aria-hidden="true" /> Exportando…{' '}
              {Math.round(state.progress * 100)}%
            </>
          ) : (
            <>
              <DownloadIcon /> Exportar {format === 'jpeg' ? 'JPG' : 'PNG'}
            </>
          )}
        </button>
      )}
      {working && (
        <div
          className="progress"
          role="progressbar"
          aria-label="Progresso da exportação"
          aria-valuenow={Math.round(state.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${state.progress * 100}%` }} />
        </div>
      )}
      <p className="hint">
        O processamento acontece neste aparelho. Os dados EXIF (câmera, local) não são copiados para o
        arquivo exportado.
      </p>
    </div>
  );
}
