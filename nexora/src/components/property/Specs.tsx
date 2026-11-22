import { Bath, BedDouble, Car, Maximize, Trees } from 'lucide-react';
import type { Property } from '@/types/property';
import { formatArea } from '@/lib/format';

/** Ficha técnica compacta. Só mostra o que existe — nada de zeros inventados para terrenos. */
export function Specs({ p, size = 'sm' }: { p: Property; size?: 'sm' | 'lg' }) {
  const items = [
    p.builtArea ? { Icon: Maximize, label: 'Área construída', value: formatArea(p.builtArea) } : null,
    p.landArea ? { Icon: Trees, label: 'Terreno', value: formatArea(p.landArea) } : null,
    p.type === 'studio' ? { Icon: BedDouble, label: 'Dormitório', value: 'Integrado' } : p.bedrooms ? { Icon: BedDouble, label: 'Quartos', value: `${p.bedrooms}${p.suites ? ` · ${p.suites} suíte${p.suites > 1 ? 's' : ''}` : ''}` } : null,
    p.bathrooms ? { Icon: Bath, label: 'Banheiros', value: String(p.bathrooms) } : null,
    p.parking ? { Icon: Car, label: 'Vagas', value: String(p.parking) } : null,
  ].filter(Boolean) as { Icon: typeof Maximize; label: string; value: string }[];
  if (size === 'lg') {
    return (
      <dl className="grid grid-cols-2 border-l border-t hairline sm:grid-cols-3 lg:grid-cols-5">
        {items.map(({ Icon, label, value }) => (
          <div key={label} className="border-b border-r p-4 hairline">
            <dt className="eyebrow flex items-center gap-2"><Icon size={14} />{label}</dt>
            <dd className="mt-2 text-lg font-medium tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted">
      {items.map(({ Icon, label, value }) => (
        <li key={label} className="flex items-center gap-1.5" title={label}><Icon size={14} aria-hidden /><span className="sr-only">{label}: </span>{value}</li>
      ))}
    </ul>
  );
}
