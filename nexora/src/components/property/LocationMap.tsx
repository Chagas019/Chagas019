import { useState } from 'react';
import { MapPin } from 'lucide-react';
import type { Property } from '@/types/property';
import { location } from '@/lib/format';

/**
 * Localização com privacidade: nunca o endereço exato. Com coordenadas aproximadas, o mapa do OpenStreetMap
 * só é carregado depois do clique (evita enviar dados a terceiros sem a pessoa pedir) e mostra uma área, sem marcador.
 * Imóveis de demonstração não têm coordenadas: mostramos apenas um esquema ilustrativo.
 */
export function LocationMap({ p }: { p: Property }) {
  const [load, setLoad] = useState(false);
  const loc = p.approxLocation;
  if (!loc) {
    return (
      <div className="grid gap-6 md:grid-cols-12">
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg border hairline md:col-span-8" aria-hidden>
          <svg viewBox="0 0 160 100" className="h-full w-full bg-[#eef1f6]">
            <defs><pattern id="g" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#0D1424" strokeOpacity=".06" strokeWidth=".4" /></pattern></defs>
            <rect width="160" height="100" fill="url(#g)" />
            <path d="M-5 70 C30 60 50 80 90 62 S140 40 170 46" stroke="#cfd6e1" strokeWidth="6" fill="none" />
            <path d="M40 -5 L52 105 M110 -5 L98 105 M-5 30 L165 22" stroke="#dde3ec" strokeWidth="3" fill="none" />
            <path d="M120 70 q14 -8 28 4 q-6 18 -26 12z" fill="#d7e6cf" />
            <circle cx="78" cy="44" r="20" fill="#3478F6" fillOpacity=".12" stroke="#3478F6" strokeOpacity=".5" strokeDasharray="2 2" />
          </svg>
          <span className="absolute left-3 top-3 chip bg-white/80 text-ink">Esquema ilustrativo</span>
        </div>
        <div className="md:col-span-4">
          <p className="flex items-center gap-2 text-lg font-medium"><MapPin size={18} className="text-signal" /> {location(p)}</p>
          <p className="mt-3 text-sm text-muted">Por privacidade, não exibimos o endereço exato. {p.demo ? 'Este é um imóvel de demonstração com bairro e cidade fictícios, por isso não há mapa real.' : 'O endereço é informado pelo consultor ao agendar a visita.'}</p>
        </div>
      </div>
    );
  }
  const d = loc.radiusM / 111_000;
  const bbox = [loc.lng - d * 1.6, loc.lat - d, loc.lng + d * 1.6, loc.lat + d].map((n) => n.toFixed(5)).join(',');
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg border hairline md:col-span-8">
        {load ? (
          <>
            <iframe title={`Região aproximada de ${p.name}`} src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`} className="h-full w-full" loading="lazy" referrerPolicy="no-referrer" />
            <div className="pointer-events-none absolute inset-0 m-auto h-1/2 w-1/3 rounded-full border-2 border-dashed border-signal bg-signal/10" />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#eef1f6] p-6 text-center text-ink">
            <MapPin className="text-signal" />
            <p className="max-w-xs text-sm">O mapa é carregado do OpenStreetMap. Ao abrir, seu navegador se conecta a esse serviço.</p>
            <button type="button" className="btn-primary" onClick={() => setLoad(true)}>Mostrar região no mapa</button>
          </div>
        )}
      </div>
      <div className="md:col-span-4">
        <p className="flex items-center gap-2 text-lg font-medium"><MapPin size={18} className="text-signal" /> {location(p)}</p>
        <p className="mt-3 text-sm text-muted">A área destacada indica a região num raio de aproximadamente {Math.round(loc.radiusM / 100) / 10} km. O endereço exato é informado ao agendar a visita.</p>
      </div>
    </div>
  );
}
