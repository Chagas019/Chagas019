/**
 * Conteúdo editável pelo painel (Conteúdo → Página inicial, Categorias, Contato, SEO).
 * Estes são os valores padrão. Dados da imobiliária que não existem (CRECI, telefone, endereço, redes)
 * ficam vazios de propósito: o site esconde o que não foi configurado em vez de inventar.
 */
import type { LifestyleId } from '@/types/property';

export interface HomeContent {
  heroTitle: string;
  heroSubtitle: string;
  heroPrimary: string;
  heroSecondary: string;
  ctaTitle: string;
  ctaButton: string;
  experienceTitle: string;
  experienceText: string;
}

export interface Category {
  id: LifestyleId;
  label: string;
  description: string;
  /** slug do imóvel cuja capa ilustra a categoria */
  coverFrom?: string;
  visible: boolean;
}

export interface ContactSettings {
  companyName: string;
  legalName: string;
  creci: string;
  cnpj: string;
  email: string;
  phone: string;
  /** Somente dígitos com DDI, ex.: 5511999999999. Vazio = o botão abre o WhatsApp para escolher o contato. */
  whatsapp: string;
  address: string;
  hours: string;
  instagram: string;
  linkedin: string;
  youtube: string;
}

export interface SeoSettings {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
}

export interface Testimonial {
  id: string;
  author: string;
  text: string;
  authorized: boolean;
  published: boolean;
}

export interface SiteContent {
  home: HomeContent;
  categories: Category[];
  contact: ContactSettings;
  seo: SeoSettings;
  testimonials: Testimonial[];
}

export const defaultContent: SiteContent = {
  home: {
    heroTitle: 'Seu próximo capítulo começa aqui.',
    heroSubtitle: 'Descubra imóveis extraordinários e explore cada espaço antes mesmo de visitá-lo.',
    heroPrimary: 'Explorar imóveis',
    heroSecondary: 'Conhecer a experiência 3D',
    ctaTitle: 'Encontre um espaço que combine com a sua história.',
    ctaButton: 'Começar minha busca',
    experienceTitle: 'Atravesse a casa antes de abrir a porta.',
    experienceText:
      'Gire o modelo, entre nos ambientes, acenda as luzes da noite e veja cada cômodo na planta. A planta e o modelo usam os mesmos dados: escolher a cozinha em um leva você até ela no outro.',
  },
  categories: [
    { id: 'contemporaneas', label: 'Casas contemporâneas', description: 'Linhas retas, vidro e integração com o exterior.', coverFrom: 'casa-contemporanea-001', visible: true },
    { id: 'alto-padrao', label: 'Apartamentos de alto padrão', description: 'Andares altos, varandas amplas e serviços.', coverFrom: 'apartamento-alto-padrao-002', visible: true },
    { id: 'piscina', label: 'Casas com piscina', description: 'Lazer em casa, do pátio à piscina de raia.', coverFrom: 'casa-piscina-007', visible: true },
    { id: 'compactos', label: 'Imóveis compactos', description: 'Bem localizados e práticos para o dia a dia.', coverFrom: 'studio-compacto-004', visible: true },
    { id: 'condominio', label: 'Em condomínios', description: 'Segurança e áreas comuns para a família.', coverFrom: 'casa-condominio-003', visible: true },
    { id: 'terrenos', label: 'Terrenos', description: 'Lotes para construir o projeto do seu jeito.', coverFrom: 'terreno-005', visible: true },
    { id: 'comerciais', label: 'Imóveis comerciais', description: 'Lojas, salas e espaços para o seu negócio.', coverFrom: 'comercial-006', visible: true },
  ],
  contact: {
    companyName: 'NEXORA Real Estate',
    legalName: '',
    creci: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    hours: 'Segunda a sexta, 9h às 18h · Sábado, 9h às 13h',
    instagram: '',
    linkedin: '',
    youtube: '',
  },
  seo: {
    siteName: 'NEXORA Real Estate',
    defaultTitle: 'NEXORA Real Estate — imóveis com planta interativa e visita 3D',
    defaultDescription: 'Descubra imóveis extraordinários e explore cada espaço antes de visitá-lo, com planta interativa, modelo 3D e visita virtual.',
  },
  // Nenhum depoimento é inventado: a lista começa vazia e só exibe os autorizados e publicados no painel.
  testimonials: [],
};
