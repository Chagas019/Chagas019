/** Identidade visual padrão — totalmente configurável em Configurações > Marca. */
export const DEFAULT_BRAND = {
  brand_name: 'SOCIAL AI',
  niche: 'Fotografia mobile',
  colors: {
    background: '#0B0D12',
    surface: '#161A22',
    primary: '#2F6BFF',
    accent: '#7AA2FF',
    text: '#F5F7FA',
    muted: '#9AA3B2',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
    headingWeight: 800,
    bodyWeight: 500,
  },
  layout: {
    margin: 96,
    radius: 28,
    gridGap: 24,
    logoPosition: 'bottom-left',
    showHandle: true,
    showSlideCounter: true,
  },
  base_hashtags: ['fotografiamobile', 'dicasdefoto'],
  forbidden_words: [] as string[],
  rules: [
    'Nunca usar imagens de terceiros sem licença.',
    'Nada de promessas de resultado garantido.',
  ],
};

export interface Brand {
  brand_name: string;
  handle: string | null;
  niche: string;
  audience: string | null;
  tone: string;
  colors: typeof DEFAULT_BRAND.colors;
  fonts: typeof DEFAULT_BRAND.fonts;
  layout: typeof DEFAULT_BRAND.layout;
  base_hashtags: string[];
  forbidden_words: string[];
  rules: string[];
}
