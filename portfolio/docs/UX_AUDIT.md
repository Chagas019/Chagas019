# UX AUDIT — v4 (Agente 1 · UI/UX)

Base: screenshots Playwright 1440 e 390 px, `reducedMotion: reduce`, deviceScaleFactor 1, seção a seção.
Altura das seções (1440 / 390): Sobre 1801/1796 · Serviços 2244/3430 · Portfólio 6707/7075 · Projetos 4755/5390 · Produtos 2341/4225 · Orçamento 2671/4316. Sem scroll horizontal. QA 51/51 antes e depois.
Dono: **UI** = index.html (feito) · **FE** = base.css / render/*.js · **MO** = motion · **DS** = tokens.css.

## P1 — bloqueiam a conversão ou a leitura da prova
1. **Formulário enterrado no mobile.** Em 390 px o formulário começa cerca de 3.000 px depois do título "Orçamento" (13 itens de preço + 3 termos antes).
   - UI (feito): link "Ir direto ao formulário ↓" (`.section__cta`) no topo de #orcamento.
   - FE: no mobile, mostrar os grupos de preço em acordeão (`<details>` por `[data-pricing-group]`, só o 1º aberto) ou em lista compacta. Garantir `scroll-margin-top: header + 16px` em `#quote-form`, `#valores` e `[id^=preco-]`.
2. **Prova diluída no Portfólio.** 7 cards tracejados "Em curadoria" ficavam ENTRE o índice e a galeria. No mobile, a galeria só começava depois de cerca de 2.000 px de cards vazios.
   - UI (feito): slot `curation` movido para DEPOIS da galeria.
   - FE: compactar a curadoria (no mobile, uma lista de linhas sem `min-height: 12rem`; ou um único bloco "Em curadoria: Eventos, Ensaios…" com um CTA).
3. **Sem CTA de orçamento no header mobile (< 600 px).** `.swatch-cta` fica `display:none` e o menu não pode ganhar o 9º link (o teste nav.anchors exige 8).
   - FE: mostrar `.swatch-cta` em formato compacto (só o ponto e "Orçamento", alvo ≥ 44 px) também abaixo de 600 px.
4. **Repetição de CTAs nos preços.** Os 13 links "SOLICITAR ORÇAMENTO →" em mono sublinhado viram ruído no mobile e no desktop.
   - FE: no mobile, transformar o item inteiro em alvo, ou usar um botão-ícone "+" com `aria-label`. O `data-service` continua pré-marcando o checkbox.

## P2 — hierarquia e percurso (hero → prova → serviços → preço → orçamento)
5. **Serviços não leva aos preços.**
   - UI (feito): "Ver valores de referência →" no head de #servicos, apontando para `#valores` (novo id em `section.pricing`).
   - FE: em cada área de `render/capabilities.js`, adicionar o link "Ver valores" para `#preco-<grupo>` quando existir um grupo correspondente.
6. **Placeholders gigantes sem prova.** Os cards de Projetos (11) e Produtos (5) usam capas vazias 16:9 / 4:5 com o título repetido duas vezes.
   - FE: sem `cover`, usar uma capa baixa (aspect 3:1 ou faixa de 96–120 px) ou ocultar o título grande dentro do placeholder.
   - DS: definir a superfície do placeholder (`--surface-1` + hairline + `--highlight-top`).
7. **Rótulos jargão no Portfólio.** "Camadas · índice" e "Pranchetas · galeria".
   - UI (feito): trocados por "Índice · projetos" e "Galeria · todas as mídias", com ids e aria-labelledby.
8. **Sobre sem lead.**
   - UI (feito): o posicionamento do briefing entra como `.section__lead`.
   - FE: no desktop, a coluna esquerda fica vazia abaixo da foto (a timeline está só à direita). Deixar a foto `position: sticky` ou passar a timeline para a largura total.
9. **Serviços → extras.** Em 390 px, Ferramentas, Equipamentos e Conhecimentos somam cerca de 1.200 px de chips mono.
   - FE: no mobile, usar `<details>` ou rolagem horizontal para as ferramentas e reduzir o chip mono (contraste e tamanho ≥ 12 px).
10. **"Explorar projetos" leva a #projetos**, que só tem placeholders. A prova real (imagens) está em #portfolio. O texto e o href são fixos no briefing, então decide o orquestrador (sugestão: #portfolio).

## P3 — polimento
11. **Alvos pequenos.**
    - FE: `.section__cta-link` e os filtros mono do Portfólio/Projetos precisam de min-height 44 px. No mobile, os filtros passam do viewport; adicionar fade nas bordas e `scroll-snap`.
12. **Cards sem acabamento v4.**
    - DS + FE: aplicar `--r-card`, `--border-hairline`, `--highlight-top` e `--elev-1` em pricing__item, product-card, selected card, curation__block, featured e no formulário (painel papel com `--r-lg`).
13. **Ritmo entre seções.** Todas usam o mesmo padding.
    - UI (feito): classes de fluxo `section--proof` (portfolio, projetos), `section--offer` (servicos, produtos) e `section--convert` (orcamento, contato).
    - DS/FE: variar o fundo/superfície por grupo e reduzir o padding entre seções do mesmo grupo.
14. **Hero mobile.** O botão flutuante de WhatsApp cobre o meta "CAMPINAS — SP · DESDE 2019" em 390 px.
    - FE: esconder `.hero__meta--bottom` < 600 px ou deslocar o float. Faltam também `.hero__scroll` e um respiro maior antes dos CTAs.
15. **Motion.**
    - MO: revelar os cards de preço e a curadoria em sequência curta (stagger ≤ 40 ms, máx. 6) e só uma vez. Os links `.section__cta-link` com transição de seta (translateX 3 px) em hover/focus. Nada infinito além do REC.
16. **Galeria e mídia em lazy-load:** carregam depois do scroll (ok). Os placeholders escuros têm o mesmo tom do fundo.
    - DS: `--surface-1` um passo mais claro que `--surface-0`, para o "carregando" ser legível.

## Hooks novos no index.html (para FE/MO estilizarem)
- `.section--proof | --offer | --convert` nas `<section>`.
- `.section__cta > a.section__cta-link` dentro do `.section__head` (#servicos, #orcamento). Herdam a coluna 8–12 do grid do head.
- `#valores` em `section.pricing` · `#work-index-title` e `#work-gallery-title` nas subheads do Portfólio.
- Ordem no Portfólio: filters → featured → índice → galeria → curadoria.
- Nenhum slot, id ou `data-*` do BRIEFING.md foi removido. Ordem das seções e 8 links do menu mantidos.
