/**
 * Configuração do site. Único arquivo que precisa ser editado para deploy.
 */
export const CONFIG = {
  /** Endpoint que recebe POST do formulário (ex.: "https://formspree.io/f/xxxxxx").
   *  Vazio → o formulário abre WhatsApp ou e-mail com a mensagem montada (nunca finge sucesso). */
  formEndpoint: '',
  /** Canal do fallback quando não há endpoint: 'whatsapp' | 'email'. Cai no outro se o escolhido não estiver no portfolio.json. */
  fallbackChannel: 'whatsapp',
  content: {
    portfolio: 'content/portfolio.json',
    pricing: 'content/pricing.json',
    portfolioFixture: 'content/_fixtures/portfolio.sample.json',
    pricingFixture: 'content/_fixtures/pricing.sample.json',
    manifest: 'media/manifest.json',
  },
  /** Locale/moeda padrão para preços. */
  locale: 'pt-BR',
  /** Tamanhos `sizes` usados no srcset por contexto. */
  sizes: {
    hero: '100vw',
    featured: '(min-width: 1024px) 66vw, 100vw',
    index: '(min-width: 1024px) 28vw, 80vw',
    mosaic: '(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw',
    lightbox: '100vw',
  },
};
