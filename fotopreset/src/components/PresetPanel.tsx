import { useMemo, useState } from 'react';
import { CATEGORY_LABELS, PRESETS, type PresetCategory } from '../presets/presets';
import { StarIcon } from './Icons';
import { Slider } from './Slider';

type Filter = 'todos' | 'favoritos' | PresetCategory;

interface Props {
  selectedId: string | null;
  intensity: number;
  thumbs: Record<string, string>;
  favorites: string[];
  onSelect: (id: string | null) => void;
  onIntensity: (v: number) => void;
  onToggleFavorite: (id: string) => void;
}

const usedCategories = [...new Set(PRESETS.flatMap((p) => p.categories))];

export function PresetPanel({
  selectedId,
  intensity,
  thumbs,
  favorites,
  onSelect,
  onIntensity,
  onToggleFavorite,
}: Props) {
  const [filter, setFilter] = useState<Filter>('todos');

  const list = useMemo(() => {
    if (filter === 'todos') return PRESETS;
    if (filter === 'favoritos') return PRESETS.filter((p) => favorites.includes(p.id));
    return PRESETS.filter((p) => p.categories.includes(filter));
  }, [filter, favorites]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'favoritos', label: `Favoritos${favorites.length ? ` · ${favorites.length}` : ''}` },
    ...usedCategories.map((c) => ({ id: c, label: CATEGORY_LABELS[c] })),
  ];

  const selected = PRESETS.find((p) => p.id === selectedId);

  return (
    <div className="panel-section">
      <div className="chips" role="toolbar" aria-label="Categorias de presets">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`chip${filter === f.id ? ' is-active' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="preset-grid" role="list">
        <div role="listitem" className="preset-item">
          <button
            type="button"
            className={`preset-card${selectedId === null ? ' is-selected' : ''}`}
            onClick={() => onSelect(null)}
            aria-pressed={selectedId === null}
          >
            <span className="preset-thumb is-original">
              {thumbs.__original ? <img src={thumbs.__original} alt="" /> : null}
              <span>Original</span>
            </span>
            <span className="preset-name">Sem preset</span>
          </button>
        </div>
        {list.map((p) => {
          const fav = favorites.includes(p.id);
          const thumb = thumbs[p.id];
          return (
            <div role="listitem" className="preset-item" key={p.id}>
              <button
                type="button"
                className={`preset-card${selectedId === p.id ? ' is-selected' : ''}`}
                onClick={() => onSelect(p.id)}
                aria-pressed={selectedId === p.id}
                aria-describedby={`desc-${p.id}`}
              >
                <span className="preset-thumb">
                  {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span className="shimmer" />}
                </span>
                <span className="preset-name">{p.name}</span>
              </button>
              <span id={`desc-${p.id}`} className="sr-only">
                {p.description}
              </span>
              <button
                type="button"
                className={`fav-btn${fav ? ' is-fav' : ''}`}
                onClick={() => onToggleFavorite(p.id)}
                aria-pressed={fav}
                aria-label={fav ? `Remover ${p.name} dos favoritos` : `Favoritar ${p.name}`}
              >
                <StarIcon filled={fav} width={15} height={15} />
              </button>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="empty-note">Toque na estrela de um preset para guardá-lo aqui.</p>
        )}
      </div>

      <div className={`intensity${selected ? '' : ' is-disabled'}`}>
        {selected && <p className="preset-desc">{selected.description}</p>}
        <Slider
          label={selected ? `Intensidade · ${selected.name}` : 'Intensidade'}
          value={Math.round(intensity * 100)}
          min={0}
          max={100}
          step={1}
          defaultValue={100}
          bipolar={false}
          format={(v) => `${v}%`}
          onChange={(v) => onIntensity(v / 100)}
        />
      </div>
    </div>
  );
}
