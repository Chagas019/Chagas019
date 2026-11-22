/** Metadados de SEO. Usado no navegador (useSeo) e no build (pré-renderização das páginas de imóveis). */
import type { Property } from '@/types/property';
import { formatArea, formatPrice, location, TYPE_LABEL } from './format';

export interface SeoData {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  jsonLd?: object | object[];
}

export const SITE_NAME = 'NEXORA Real Estate';

export function propertySeo(p: Property): SeoData {
  const area = p.builtArea ? formatArea(p.builtArea) : p.landArea ? `terreno de ${formatArea(p.landArea)}` : '';
  const facts = [TYPE_LABEL[p.type], p.purpose === 'aluguel' ? 'para alugar' : 'à venda', `em ${location(p)}`].join(' ');
  return {
    title: p.seo?.title || `${p.name} — ${facts} | ${SITE_NAME}`,
    description: p.seo?.description || `${p.headline} ${area ? `${area}, ` : ''}${p.bedrooms ? `${p.bedrooms} quartos, ` : ''}${formatPrice(p)}.${p.demo ? ' Imóvel de demonstração.' : ''}`.slice(0, 300),
    path: `/imovel/${p.slug}`,
    image: p.cover.src,
    type: 'product',
    jsonLd: propertyJsonLd(p),
  };
}

/**
 * Dados estruturados: RealEstateListing com o imóvel (Accommodation/House/Apartment) e a oferta.
 * Não incluímos endereço nem geolocalização exatos, e nada de avaliações.
 */
export function propertyJsonLd(p: Property, siteUrl = '') {
  const kind = p.type === 'apartamento' || p.type === 'cobertura' || p.type === 'studio' ? 'Apartment' : p.type === 'casa' || p.type === 'casa-condominio' ? 'SingleFamilyResidence' : 'Place';
  const abs = (u: string) => (u.startsWith('http') ? u : `${siteUrl}${u}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.name,
    description: p.headline,
    url: abs(`/imovel/${p.slug}`),
    datePosted: p.createdAt.slice(0, 10),
    image: [p.cover, ...p.gallery.slice(0, 4)].map((m) => abs(m.src)),
    about: {
      '@type': kind,
      name: p.name,
      ...(p.builtArea ? { floorSize: { '@type': 'QuantitativeValue', value: p.builtArea, unitCode: 'MTK' } } : {}),
      ...(p.bedrooms ? { numberOfBedrooms: p.bedrooms } : {}),
      ...(p.bathrooms ? { numberOfBathroomsTotal: p.bathrooms } : {}),
      address: { '@type': 'PostalAddress', addressLocality: p.city, ...(p.state ? { addressRegion: p.state } : {}), addressCountry: 'BR' },
    },
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'BRL',
      businessFunction: p.purpose === 'aluguel' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
      availability: 'https://schema.org/InStock',
    },
  };
}
