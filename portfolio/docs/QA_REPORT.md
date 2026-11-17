# QA REPORT — v4 (Agente 5 · QA)

Data: 2026-11-17 · Chromium/Playwright · `node portfolio/tests/qa.js` (+ `tests/qa-v4.js`, 29 checks novos) · screenshots 390/1440 `reducedMotion: reduce`.

## Resultados
| Execução | PASS | WARN | FAIL | Observação |
|---|---|---|---|---|
| Suíte v3 original (51 checks), `/portfolio/` | 51 | 0 | 0 | sem regressão nos checks antigos |
| Suíte v4 completa (80), `/portfolio/` | 78 | 1 | 1 | FAIL `lightbox.fits-viewport` · WARN `whatsapp.float-all-submits-360` |
| `build-dist.sh` + `QA_PATH=/portfolio/dist/ … 8096` | 76 | 1 | 3 | + `links.internal` e `media.all-load` (capturas/ ausente no dist) |

Checks novos (em `tests/qa-v4.js`, chamados no fim do `qa.js`):
- `pricing.accordion-kbd/-target/-desktop`: acordeão < 900 px, só o 1º aberto, Enter/Espaço alternam `aria-expanded` e `hidden`, alvo de 48 px; ≥ 900 px sem toggles. PASS.
- `pricing.ver-valores`: 3 links `#preco-*` abrem o grupo certo, abaixo do header. PASS.
- `pricing.row-preselect`, `pricing.cta-target`, `form.data-service-map`: 12 CTAs levam a `#quote-form` e marcam o checkbox; todo `a[data-service]` tem um checkbox correspondente. PASS.
- `lightbox.video-*` e `lightbox.esc-*` (Brabo Club e Comunica+Fé): com motion, muted + loop + autoplay sem controles; com reduce, pausado com controles. Esc fecha, remove o vídeo, limpa inert/lock e devolve o foco. PASS.
- `lightbox.brabo-images`: PASS. `lightbox.fits-viewport`: **FAIL**.
- `hover.no-layout-shift`: 11 seletores. PASS.
- `nav.scrolled-menu-360/390` e `nav.link-closes-*`: header encolhido não cobre o menu nem o toggle. PASS.
- `whatsapp.float-all-submits-360/390`: **WARN** em 360.
- `links.external-targets`: 8 wa.me, 2 Instagram, 2 mailto, todos corretos e com `noopener`. PASS.
- `media.all-load`: 17 `<img>` e 42 refs, incluindo 36 de capturas/ e motion. PASS na fonte, FAIL no dist.
- `responsive.no-overflow-deep`: 360 a 1920, acordeões abertos, por elemento. PASS.
- `errors.*`: PASS.

## Bugs / regressões
| # | Sev | Arquivo · seletor | Descrição |
|---|---|---|---|
| 1 | **S1** | `assets/css/base.css` · `.lightbox__frame` (l. 954) | Em 390 px a coluna do grid cresce até a largura intrínseca da mídia (frame com 701–963 px). Fechar (×), próximo e contador ficam fora da tela em **todas** as mídias, inclusive nos clipes novos. Em 768 px o mesmo acontece com Comunica+Fé. Só o Esc fecha, e o celular não tem Esc. Correção sugerida: `grid-template-columns: minmax(0,1fr)` no frame/stage e `max-width:100%` no `<video>`. O defeito já estava latente na v3 e as mídias largas da v4 o expuseram. Ver `qa4/390-lightbox-video-overflow.png`. |
| 2 | **S2** | `scripts/build-dist.sh` (l. 11 `cp -r assets content media`) | A pasta `capturas/` não é copiada para o dist. O `<img src>` de fallback dos 4 PNGs (Brabo e Comunica+Fé) dá 404 no dist e o gate do dist falha (`links.internal`, `media.all-load`). Os navegadores com AVIF/WebP ainda exibem a imagem pelo srcset. Dono: orquestrador (incluir `capturas` no `cp`). |
| 3 | S3 | `assets/css/base.css` · `.selected__grid > :nth-child(4n+2)` (l. 705) | Em ≥ 900 px, `translate: 0 3rem` só no 2º card de cada bloco de 4. Os pares 01/02, 05/06 e 09/10 ficam desalinhados e os pares 03/04 e 07/08 alinhados, um ritmo incoerente. O card 02 ainda invade o gap e encosta no 04. Ver `qa4/1440-projetos.png`. |
| 4 | S3 | `assets/css/base.css` · `.mosaic__tile img` (object-fit: cover) | A galeria corta as capturas: a mobile (0,46:1) entra numa caixa de 0,36 em 390 px e de 0,55 em 1440 px, e o clipe 16:9 entra numa caixa de 1,22 em 390 px. O texto dos sites aparece cortado ("MUNICA+FÉ", "RABO."), e a legenda "— 0.46:1" promete a proporção inteira. Sugestão: `contain` para capturas de tela, ou caixa na proporção real. |
| 5 | S3 | `assets/css/base.css` · `[data-whatsapp-float]` × `#quote-form [data-submit=whatsapp]` | Em 360 px, com o botão "Enviar pelo WhatsApp" no rodapé da viewport, o float cobre 14 px da borda direita do botão (botão 33–292, float 278–344). O centro continua clicável. Em 390 px não sobrepõe. |
| 6 | S4 | `assets/js/render/disclosure.js` · `apply()` | Ao trocar o media query (girar o tablet ou redimensionar), `set(open)` volta ao estado inicial e perde o grupo que o usuário abriu. |
| 7 | S4 | `assets/js/render/projects.js` · filtros do Portfólio | Filtros com 0 itens ("Eventos (0)", "Ensaios (0)"…) ficam clicáveis e levam a uma lista vazia. Sugestão: `disabled` ou ocultar. |
| 8 | S4 | `assets/css/base.css` · legenda `.mosaic` | "Personagem na moto — …" é truncada com reticências em 390 px e esconde a proporção. |

Sem bugs visuais de contraste, clipping de títulos ou sobreposição nas demais seções (Sobre, Serviços, Produtos, Orçamento e Contato, em 390 e 1440). O header fixo e o float que aparecem no meio das capturas por seção são artefatos do screenshot por elemento.

## Pendências
- Corrigir o S1 (#1) e o S2 (#2) antes de publicar. Depois rodar de novo `node portfolio/tests/qa.js` e o gate do dist, que hoje falham com 1 e 3 FAIL.
- O WARN `whatsapp.float-all-submits-360` vira PASS quando o float ganhar margem ou se esconder perto do formulário.
- O CLS e o LCP são de laboratório (localhost); falta confirmar com Lighthouse em rede throttled.
- O check `whatsapp.float-vs-submit` (v3) cobre só o 1º submit; o novo `float-all-submits` cobre os dois.
- Screenshots: `/tmp/claude-0/-home-user-Chagas019/ea86fd53-b427-5804-bf25-4fdfa22947ab/scratchpad/qa4/` (390/1440 por seção, menu aberto, header encolhido, lightbox).

## Correções aplicadas pelo orquestrador (após este relatório)
| # | Correção | Arquivo |
|---|---|---|
| 1 S1 | `.lightbox__frame` com `grid-template-columns: minmax(0,1fr)` e vídeo `max-width:100%`: controles sempre visíveis no celular | base.css |
| 2 S2 | `capturas/` copiada no dist | scripts/build-dist.sh |
| 3 S3 | deslocamento uniforme em todos os cards da 2ª coluna (`:nth-child(2n)`) | base.css |
| 4 S3 | capturas e clipes com `fit: "contain"` → `.mosaic__tile--contain` (sem cortar texto) | portfolio.json, gallery.js, base.css |
| 5 S3 | WhatsApp flutuante some enquanto os botões de envio estão na tela | motion.js, motion.css |
| 6 S4 | acordeão mantém o estado escolhido ao trocar de breakpoint | disclosure.js |
| 7 S4 | filtros do Portfólio sem trabalhos ficam ocultos (as categorias seguem no painel "Em curadoria") | projects.js |
| 8 S4 | legenda da galeria quebra linha no celular | base.css |

**Reexecução:** `/portfolio/` **80 PASS · 0 WARN · 0 FAIL** · dist **80 PASS · 0 WARN · 0 FAIL**.
