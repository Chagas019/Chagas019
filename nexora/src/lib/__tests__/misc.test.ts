import { formatCompactBRL, formatPrice, isNew, location, slugify } from '../format';
import { leadSchema } from '../validation';
import { propertyJsonLd, propertySeo } from '../seo';
import { demoProperties } from '@/data/properties';

const day = (o: number) => { const d = new Date(); d.setDate(d.getDate() + o); if (o > 0 && d.getDay() === 0) d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

describe('formatação', () => {
  it('preço de aluguel tem período', () => {
    expect(formatPrice({ price: 3200, purpose: 'aluguel' })).toMatch(/3\.200.*\/mês/);
    expect(formatCompactBRL(4_850_000)).toBe('R$ 4,85 mi');
  });
  it('recém-adicionado depende da data, não de etiqueta', () => {
    const now = new Date('2026-10-21T12:00:00Z').getTime();
    expect(isNew({ createdAt: '2026-10-10T12:00:00Z' }, now)).toBe(true);
    expect(isNew({ createdAt: '2026-07-01T12:00:00Z' }, now)).toBe(false);
  });
  it('slug e localização', () => {
    expect(slugify('Casa Jardim das Águas 003')).toBe('casa-jardim-das-aguas-003');
    expect(location({ neighborhood: 'Mirante', city: 'Porto Lume', state: '' })).toBe('Mirante, Porto Lume');
  });
});

describe('validação do formulário', () => {
  const base = { kind: 'informacoes' as const, name: 'Ana', email: 'ana@example.com', consent: true as const };
  it('aceita contato válido e exige consentimento', () => {
    expect(leadSchema.safeParse(base).success).toBe(true);
    expect(leadSchema.safeParse({ ...base, consent: false }).success).toBe(false);
  });
  it('rejeita e-mail e telefone inválidos', () => {
    expect(leadSchema.safeParse({ ...base, email: 'ana@' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, phone: '12' }).success).toBe(false);
  });
  it('visita exige data futura, horário e formato', () => {
    expect(leadSchema.safeParse({ ...base, kind: 'visita' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, kind: 'visita', visitDate: day(0), visitTime: '10:00', visitMode: 'presencial' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, kind: 'visita', visitDate: day(3), visitTime: '10:00', visitMode: 'video' }).success).toBe(true);
  });
  it('campo isca preenchido invalida (robôs)', () => {
    expect(leadSchema.safeParse({ ...base, website: 'spam' }).success).toBe(false);
  });
});

describe('dados de demonstração e SEO', () => {
  it('pelo menos seis imóveis, todos marcados como demonstração, slugs únicos', () => {
    expect(demoProperties.filter((p) => p.status === 'publicado').length).toBeGreaterThanOrEqual(6);
    expect(demoProperties.every((p) => p.demo)).toBe(true);
    expect(new Set(demoProperties.map((p) => p.slug)).size).toBe(demoProperties.length);
  });
  it('suítes nunca passam de quartos; etiquetas só as permitidas', () => {
    for (const p of demoProperties) {
      expect(p.suites).toBeLessThanOrEqual(Math.max(p.bedrooms, 0));
      expect(p.tags.every((t) => ['lancamento', 'exclusivo'].includes(t))).toBe(true);
    }
  });
  it('títulos únicos por imóvel e JSON-LD sem endereço exato nem avaliações', () => {
    const titles = demoProperties.map((p) => propertySeo(p).title);
    expect(new Set(titles).size).toBe(titles.length);
    const ld = JSON.stringify(propertyJsonLd(demoProperties[0]));
    expect(ld).not.toMatch(/streetAddress|geo|aggregateRating|review/);
  });
});
