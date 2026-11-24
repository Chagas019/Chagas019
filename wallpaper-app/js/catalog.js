import { mulberry32, hashString, pick } from './prng.js';

export const CATEGORIES = [
  {
    id: 'portraits', name: 'Retratos', title: 'Rosto Oculto',
    tags: ['retrato', 'rosto', 'pessoa', 'moda', 'oculto', 'editorial'],
    nouns: ['Rosto', 'Olhar', 'Silhueta', 'Perfil', 'Presença', 'Anônima', 'Musa'],
  },
  {
    id: 'nature', name: 'Natureza', title: 'Natureza Estética',
    tags: ['natureza', 'praia', 'pôr do sol', 'mar', 'palmeira', 'barco', 'ilha'],
    nouns: ['Maré', 'Horizonte', 'Ilha', 'Enseada', 'Coqueiral', 'Baía', 'Litoral'],
  },
  {
    id: 'architecture', name: 'Arquitetura', title: 'Arquitetura 3D',
    tags: ['arquitetura', '3d', 'geometria', 'arcos', 'blocos', 'minimalista'],
    nouns: ['Arco', 'Bloco', 'Monólito', 'Corredor', 'Volume', 'Pórtico', 'Cidade'],
  },
  {
    id: 'cinematic', name: 'Cinema', title: 'Cenas de Cinema',
    tags: ['cinema', 'filme', 'cena', 'cidade', 'estrada', 'silhueta', 'noite'],
    nouns: ['Cena', 'Plano', 'Travessia', 'Estrada', 'Skyline', 'Crepúsculo', 'Final'],
  },
  {
    id: 'abstract', name: 'Abstrato', title: 'Abstrato em Movimento',
    tags: ['abstrato', 'movimento', 'pincelada', 'gradiente', 'cor', 'arte'],
    nouns: ['Pincelada', 'Fluxo', 'Ruído', 'Onda', 'Rastro', 'Pulso', 'Brisa'],
  },
];

const ADJECTIVES = ['Âmbar', 'Laranja', 'Dourado', 'Silencioso', 'Sereno', 'Brasa', 'Névoa', 'Cobre', 'Aurora', 'Ocaso', 'Neon', 'Quente'];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function buildCatalog(perCategory = 24) {
  const perCat = CATEGORIES.map((cat) => {
    const base = hashString(cat.id);
    return Array.from({ length: perCategory }, (_, i) => {
      const seed = (base + Math.imul(i + 1, 2654435761)) >>> 0;
      const rng = mulberry32(seed ^ 0x9e3779b9);
      const number = String(i + 1).padStart(2, '0');
      return {
        id: `${cat.id}-${number}`,
        category: cat.id,
        seed,
        name: `${pick(rng, cat.nouns)} ${pick(rng, ADJECTIVES)} ${number}`,
        tags: cat.tags,
      };
    });
  });
  // Intercala as categorias para o feed "Todos" ficar variado.
  const all = [];
  for (let i = 0; i < perCategory; i++) for (const list of perCat) all.push(list[i]);
  return all;
}

export function normalize(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function searchCatalog(items, query) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return items.filter((item) => {
    const cat = CATEGORY_BY_ID.get(item.category);
    const haystack = normalize([item.name, cat?.name, cat?.title, ...item.tags].join(' '));
    return terms.every((t) => haystack.includes(t));
  });
}

export function filterByCategory(items, categoryId) {
  return categoryId === 'all' ? items : items.filter((i) => i.category === categoryId);
}
