import type { Property, PropertyType, Purpose } from '@/types/property';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const num2 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export const formatBRL = (v: number) => brl.format(v);
export const formatNumber = (v: number) => num.format(v);
export const formatArea = (v: number) => `${num.format(v)} m²`;

/** Preço com o período quando for aluguel */
export const formatPrice = (p: Pick<Property, 'price' | 'purpose'>) => (p.purpose === 'aluguel' ? `${formatBRL(p.price)}/mês` : formatBRL(p.price));

/** Valor compacto para chips e mapas: R$ 4,85 mi, R$ 890 mil */
export function formatCompactBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${num2.format(Math.round(v / 10_000) / 100)} mi`;
  if (v >= 10_000) return `R$ ${num.format(Math.round(v / 1000))} mil`;
  return formatBRL(v);
}

export const TYPE_LABEL: Record<PropertyType, string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  'casa-condominio': 'Casa em condomínio',
  studio: 'Studio',
  terreno: 'Terreno',
  comercial: 'Comercial',
  cobertura: 'Cobertura',
};

export const PURPOSE_LABEL: Record<Purpose, string> = { venda: 'Venda', aluguel: 'Aluguel' };

export const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

export const location = (p: Pick<Property, 'neighborhood' | 'city' | 'state'>) => [p.neighborhood, p.city, p.state].filter(Boolean).join(', ');

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Recém-adicionado: cadastrado nos últimos 21 dias. Nunca é uma etiqueta fixa. */
export const NEW_DAYS = 21;
export const isNew = (p: Pick<Property, 'createdAt'>, now = Date.now()) => now - new Date(p.createdAt).getTime() < NEW_DAYS * 86_400_000 && new Date(p.createdAt).getTime() <= now;

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
