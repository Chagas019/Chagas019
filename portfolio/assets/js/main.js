import { loadAll } from './data.js';
import { setManifest } from './render/media.js';
import { renderFilters, renderFeatured, renderIndex, renderCuration } from './render/projects.js';
import { renderGallery } from './render/gallery.js';
import { renderServices, renderPricing } from './render/pricing.js';
import { bindSite, renderContactLinks, renderServiceOptions, bindWhatsappFloat, updateJsonLd } from './render/contact.js';
import { renderAbout, renderTimeline } from './render/about.js';
import { renderAreas, renderTools, renderEquipment, renderKnowledge } from './render/capabilities.js';
import { renderSelectedFilters, renderSelected } from './render/selected.js';
import { renderProducts } from './render/products.js';
import { openLightbox } from './lightbox.js';
import { initNav } from './nav.js';
import { initMotion } from './motion.js';
import { initReveal, observeReveal } from './reveal.js';
import { initForm } from './form.js';

/** Executa um renderizador isolado: falha de um bloco não derruba a página. */
function safe(label, fn) {
  try { fn(); } catch (err) { console.error(`[main] ${label}`, err); }
}

async function boot() {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');
  initNav();
  initReveal();
  const { portfolio, pricing, manifest, meta } = await loadAll();
  setManifest(manifest);
  document.documentElement.dataset.content = meta.usingFixtures ? 'fixture' : 'live';
  const { site } = portfolio;

  safe('site', () => { bindSite(site); updateJsonLd(site); renderContactLinks(site); bindWhatsappFloat(site); });
  safe('sobre', () => { renderAbout(portfolio); renderTimeline(portfolio); });
  safe('serviços', () => { renderAreas(portfolio); renderTools(portfolio); renderEquipment(portfolio); renderKnowledge(portfolio); renderServices(pricing); });

  safe('portfólio', () => {
    const drawWork = (filter) => {
      renderFeatured(portfolio, filter, openLightbox);
      renderIndex(portfolio, filter, openLightbox);
      renderCuration(portfolio, filter);
      renderGallery(portfolio, filter, openLightbox);
      observeReveal(document.getElementById('portfolio') || document);
    };
    renderFilters(portfolio, drawWork);
    drawWork('all');
  });

  safe('projetos', () => {
    const drawSelected = (type) => {
      renderSelected(portfolio, type, openLightbox);
      observeReveal(document.getElementById('projetos') || document);
    };
    renderSelectedFilters(portfolio, drawSelected);
    drawSelected('all');
  });

  safe('produtos', () => renderProducts(portfolio, pricing));
  safe('orçamento', () => { renderPricing(pricing); renderServiceOptions(pricing); initForm(site); });
  observeReveal();
  try { initMotion(); } catch (err) { console.error('[main] motion', err); }
  document.documentElement.classList.add('is-ready');
}

boot().catch((err) => {
  console.error('[main] falha ao iniciar', err);
  document.documentElement.classList.add('is-error');
});
