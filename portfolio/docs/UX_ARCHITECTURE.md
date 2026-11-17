# UX ARCHITECTURE — CHAGAS CREATIVE (v3)
Dono: A2 (UX/UI). Fonte: `docs/BRIEFING.md`. Marcação: `portfolio/index.html`.

## 1. Ordem das seções e propósito (caminho de conversão)
hero → prova → serviços → preços → orçamento.
| # | Âncora | Propósito | CTA de saída |
|---|---|---|---|
| 00 | `#home` | Impacto + promessa (h1 fixo), 2 CTAs | Explorar projetos (#projetos) · Solicitar orçamento (#orcamento) |
| 01 | `#sobre` | Confiança: pessoa real, história desde 2019 | — (scroll) |
| 02 | `#servicos` | O que faço: 5 áreas + ferramentas/equipamentos/conhecimentos (sem nível) | link "Pedir orçamento" por área → #orcamento |
| 03 | `#portfolio` | Prova: trabalhos reais (Comunica+Fé, Gameplay 4K, Moto) + "Em curadoria" | abrir projeto (lightbox) |
| 04 | `#projetos` | Prova de trajetória: realizado/pessoal/conceitual | detalhe (lightbox) |
| 05 | `#produtos` | Receita digital: presets/LUTs | "Tenho interesse" → WhatsApp |
| 06 | `#orcamento` | Preços "a partir de" + formulário | Enviar pelo WhatsApp / e-mail |
| 07 | `#contato` | Canais diretos (WhatsApp, e-mail, Instagram) | — |
Rodapé: marca, links, ano, voltar ao topo. WhatsApp flutuante sempre visível (exceto com menu aberto / lightbox aberto).

## 2. Navegação
- Header `.site-header` sticky; `is-scrolled` (via sentinel do nav.js) reduz altura e adiciona fundo sólido/blur leve.
- 8 links em `#site-nav` (ordem = seções). Seção ativa: nav.js marca o link com `aria-current="true"` + `.is-active` (IntersectionObserver).
- Desktop (≥ 960px): lista horizontal com índice mono `00–07` (`.tool__index`) + CTA `.swatch-cta` → #orcamento.
- Mobile: `button.nav-toggle[data-nav-toggle][aria-controls=site-nav][aria-expanded]` abre `[data-nav-menu]` como sheet de tela cheia
  (`.site-header.is-open`, `html.is-nav-open` trava scroll). Fecha com Esc, clique em link, clique fora. Foco vai ao 1º link ao abrir e volta ao toggle ao fechar.
- `scroll-margin-top` nas seções = altura do header. `prefers-reduced-motion` → scroll instantâneo.

## 3. Layout mobile-first (por seção)
Base 360px, 1 coluna, gutter 20px; breakpoints sugeridos 600 / 960 / 1280.
- **#home**: 100svh; h1 grande (clamp) em até 4 linhas; `.hero__frame` = marcas de corte nos cantos + metadados mono (`.hero__meta`) estilo câmera — decorativo, `aria-hidden`. Botões empilhados < 600, lado a lado ≥ 600. `.hero__scroll` some < 600.
- **#sobre**: foto (ou monograma) 4:5 no topo; texto; timeline vertical. ≥ 960: grid assimétrico foto 5/12 + texto 7/12, timeline abaixo.
- **#servicos**: `.areas` em acordeão/lista numerada no mobile; ≥ 960 grid 2–3 colunas. `.services__extras`: 1 col → 3 col (ferramentas / equipamentos / conhecimentos). Ferramentas mostram "onde é usada" (chips), nunca barras de nível. Equipamentos com nota "já utilizados ou explorados".
- **#portfolio**: preservado (filtros roláveis horizontalmente no mobile, featured 16:9, índice, curadoria, mosaico 2 col → 3–4 col). Assinatura estúdio: caixa de seleção com alças no hover + rótulo mono W×H.
- **#projetos**: filtros por tipo (Todos/Realizado/Pessoal/Conceitual); cards 1 → 2 → 3 col; badge de tipo + status opcional; slogan em itálico se houver.
- **#produtos**: cards 1 → 2 → 3 col; imagem placeholder honesta (monograma/textura neutra, rotulada "imagem em breve"); preço ou "Sob consulta"; "Disponibilidade a confirmar".
- **#orcamento**: aviso (note) no topo; grupos de preços em lista densa (label ··· R$ valor); nota; formulário 1 col → 2 col ≥ 960 (campos curtos lado a lado, `.form__field--full` ocupa linha).
- **#contato**: lista grande de canais (tipografia editorial), 1 col → 3 col.

## 4. Fluxo do formulário `form#quote-form`
Ordem pensada para baixar a fricção: **1) escolher serviços → 2) descrever → 3) contato → 4) enviar.**
1. `fieldset` + `legend` "Serviços de interesse"; checkboxes `name="services"` renderizados em `[data-slot=service-options]` a partir de `pricing.groups[].items` (valor = label; texto inclui "a partir de R$ X"). Exigir ≥ 1.
   CTAs de preço/área/produto podem pré-marcar um checkbox (`?servico=` ou data-attr) e rolar até o form.
2. `message` (required, minlength 10) + ajuda `#f-message-help`.
3. `name` (required), `email` (required, type=email), `phone` (opcional, tel; validar formato só se preenchido).
4. Dois submits: `data-submit="whatsapp"` (primário) abre `https://wa.me/5519989905361?text=<mensagem montada>`; `data-submit="email"` abre `mailto:hh3356577@gmail.com?subject=…&body=…`.
   Honeypot `_gotcha` preenchido → abortar silenciosamente.
- **Erros**: validar no submit e no blur após 1º erro. Campo inválido → `aria-invalid="true"`, texto em `[data-error-for=<name>]` (id já referenciado em `aria-describedby`), `hidden` removido. Foco no 1º inválido. Resumo em `[data-slot=form-status]` (`role=status`, aria-live polite).
- **Sucesso**: nunca simular envio. Status: "Abrimos o WhatsApp com sua mensagem. Se não abriu, use o link: …" (link real) + alternativa e-mail. Não limpar o form.
- `[data-slot=form-hint]`: "Você revisa a mensagem antes de enviar."

## 5. Detalhe de projeto (lightbox)
- Qualquer `[data-project] [data-lightbox]` (portfólio) ou card `[data-selected-project]` com mídia abre o dialog criado por `lightbox.js`:
  `[data-lightbox-dialog]` role=dialog aria-modal, título `#lightbox-title`, contador aria-live, `[data-lightbox-prev|next|close]`.
- Teclado: ←/→ navega, Esc fecha, foco preso no dialog e devolvido ao gatilho. Swipe no mobile. Fundo com scroll travado.
- Conteúdo: mídia (picture/video), título, legenda, tipo/ano/papel quando existirem. Projetos sem mídia não abrem lightbox: card expande texto inline.

## 6. Estados vazios / placeholders
- Carregando: `project-index` mostra "Carregando projetos…"; demais slots vazios até o render (sem skeleton chamativo).
- Falha no JSON: mensagem curta no slot + link WhatsApp/e-mail; `<noscript>` já traz contatos reais.
- Categoria sem material → bloco `curation` "Em curadoria" (nunca banco de imagens).
- `about.photo: null` → monograma "CH". `product.image: null` → placeholder rotulado. `price null` → "Sob consulta".
- `selected[].cover: null` → card tipográfico (título grande + tipo), sem imagem falsa.
- Filtro sem resultado → "Nenhum projeto deste tipo ainda."

## 7. Mapa de classes e slots (para A3)
| Seção | Contêiner (BEM) | Slots `[data-slot]` |
|---|---|---|
| header | `.site-header .site-header__inner .brand .nav-toggle .site-nav .site-nav__list .tool.site-nav__link .tool__index .tool__label .swatch-cta` | — |
| #home | `.hero .hero__frame[data-hero-frame] .hero__crop--tl/tr/bl/br .hero__meta--top/bottom .hero__inner .hero__eyebrow .hero__title .hero__subtitle .hero__actions .hero__scroll` | — (texto fixo) |
| #sobre | `.about .about__grid .about__photo .monogram .about__text .about__timeline .timeline` | about-photo, about, timeline |
| #servicos | `.services .areas .services__extras .toolkit .tools .gear .gear__list .knowledge .knowledge__list` | areas, tools, equipment, knowledge |
| #portfolio | `.work .filters .featured .project-index .curation .mosaic` (inalterado) | filters, featured, project-index, curation, gallery |
| #projetos | `.selected .selected__filters.filters .selected__grid` | selected-filters, selected-projects |
| #produtos | `.products .products__grid` | products |
| #orcamento | `.quote .pricing .pricing__disclaimer .pricing__groups .pricing__note .pricing__terms .form.quote-form .form__title .form__intro .form__fieldset .form__options .form__field(--full) .form__label .form__input .form__textarea .form__help .form__error .form__optional .form__hp .form__actions .form__hint .form__status` | pricing-disclaimer, pricing, pricing-note, pricing-terms (opcional), service-options, form-hint, form-status |
| #contato | `.contact .contact__links` | contact-links |
| footer | `.site-footer .site-footer__inner .site-footer__title .site-footer__links .site-footer__copy .site-footer__top` | footer-links, year |
| flutuante | `.whatsapp-float[data-whatsapp-float] .whatsapp-float__icon .whatsapp-float__label` | — |
Comuns: `.container .section .section__head .section__num .section__title .section__lead .subhead .btn(--primary/--ghost) .selection-box [data-reveal]`.
Itens renderizados sugeridos: `.area`, `.tool-item`, `.gear__item`, `.selected-card[data-selected-project][data-type]`, `.product-card[data-product]`, `.pricing__group[data-pricing-group]`, `.pricing__item[data-pricing-item]`, `.form__option`.

## 8. Notas para A3 (JS)
- `form.js` hoje busca `#contact-form` e `elements.service` (select): migrar para `#quote-form` + checkboxes `services` + `phone` + `data-submit`.
- Removidos slots v2: profile-photo, experience, education, software, skills, profile-links, services. `data-bind="site.*"` não é mais usado no HTML.
- `[data-reveal]` precisa ficar visível sem JS (`html.no-js`) e com reduced-motion.
- Uma só `h1` (hero). h2 por seção; h3 para sub-blocos; o lightbox usa h2 dentro do dialog.
