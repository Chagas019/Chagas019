---
name: premium-ui-ux
description: UI/UX Designer Pro. Cria interfaces profissionais e premium, sem cara de template. Define hierarquia visual, espaçamento, tipografia, paletas, grids, responsividade e experiência do usuário. Use para landing pages, SaaS, dashboards, plataformas e sites premium, ou ao revisar uma tela que parece genérica.
---

# Premium UI/UX Designer

## Processo
1. **Entenda o objetivo da tela**: quem usa, qual a ação principal, o que precisa ser entendido em 5 segundos.
2. **Leia o que já existe**: tokens, componentes, fontes e cores do projeto. Estenda o sistema; não crie um paralelo.
3. **Defina a hierarquia** antes de estilizar: um foco principal por tela, depois o secundário, depois o resto.
4. **Construa com o sistema**: grid, escala de espaçamento e escala tipográfica fixas.
5. **Revise** com o checklist abaixo e corrija antes de entregar.

## Hierarquia visual
- Uma ação primária por seção. Botões secundários com peso visual claramente menor.
- Contraste de tamanho real entre níveis de título (razão de 1.25 a 1.5 na escala).
- Agrupe por proximidade; separe por espaço antes de usar bordas e linhas.

## Espaçamento e grid
- Escala base de 4/8px (4, 8, 12, 16, 24, 32, 48, 64, 96, 128).
- Seções com respiro generoso (64–128px no desktop). Densidade alta só onde o conteúdo pede (tabelas, dashboards).
- Grid de 12 colunas no desktop, 4–6 no mobile; largura de leitura de 60–75 caracteres.

## Tipografia
- No máximo 2 famílias: uma de display com personalidade e uma de texto muito legível.
- Texto de corpo de 16px ou mais, line-height de 1.5–1.7; títulos com line-height de 1.05–1.2 e tracking levemente negativo.
- Use peso e tamanho para hierarquia, não cor aleatória.

## Cor
- Paleta pequena: neutros (8–10 tons), 1 cor de marca, 1 de destaque, cores semânticas (sucesso, erro, aviso).
- 60/30/10: neutro dominante, cor de apoio e destaque raro.
- Contraste mínimo WCAG AA (4.5:1 texto, 3:1 elementos grandes e de interface).

## Estados obrigatórios
hover, focus-visible, active, disabled, loading, vazio, erro, sucesso. Uma tela sem estados não está pronta.

## Sinais de "template genérico" a evitar
- Hero centralizado + 3 cards de ícones + depoimentos + CTA, sem motivo.
- Gradiente roxo/azul aleatório, glassmorphism em tudo, sombras pesadas.
- Cards dentro de cards; todos os blocos com o mesmo peso.
- Ícones decorativos sem função; textos genéricos ("Soluções inovadoras").

## Checklist final
- [ ] A ação principal é óbvia em 5 segundos?
- [ ] Espaçamentos seguem a escala?
- [ ] Funciona em 360px, 768px, 1280px e 1920px+?
- [ ] Contraste e foco de teclado OK?
- [ ] Todos os estados existem?
- [ ] Há pelo menos um elemento autoral (composição, tipografia, imagem) que diferencia a marca?
