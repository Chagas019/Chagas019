import { loadAll } from './data.js';
import { setManifest } from './render/media.js';
import { renderFilters, renderFeatured, renderIndex, renderCuration } from './render/projects.js';
import { renderGallery, renderHero } from './render/gallery.js';
import { renderServices, renderPricing } from './render/pricing.js';
import { bindSite, renderContactLinks, renderServiceOptions, updateJsonLd } from './render/contact.js';
import { openLightbox } from './lightbox.js';
import { initNav } from './nav.js';
import { initReveal, observeReveal } from './reveal.js';
import { initForm } from './form.js';

async function boot() {
  initNav();
  initReveal();
  const { portfolio, pricing, manifest, meta } = await loadAll();
  setManifest(manifest);
  document.documentElement.dataset.content = meta.usingFixtures ? 'fixture' : 'live';

  bindSite(portfolio.site);
  updateJsonLd(portfolio.site);
  renderContactLinks(portfolio.site);
  renderHero(portfolio);

  const drawWork = (filter) => {
    renderFeatured(portfolio, filter, openLightbox);
    renderIndex(portfolio, filter, openLightbox);
    renderCuration(portfolio, filter);
    renderGallery(portfolio, filter, openLightbox);
    observeReveal(document.getElementById('trabalhos'));
  };
  renderFilters(portfolio, drawWork);
  drawWork('all');

  renderServices(pricing);
  renderPricing(pricing);
  renderServiceOptions(pricing);
  initForm(portfolio.site);
  observeReveal();
  document.documentElement.classList.add('is-ready');
}

boot().catch((err) => {
  console.error('[main] falha ao iniciar', err);
  document.documentElement.classList.add('is-error');
});
