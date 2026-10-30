# PASCOM CRIATIVA — Fotografia na Igreja

10 carrosséis (80 slides, 1080×1350; o último de cada um chama para seguir @chagas_catolico) com dicas para quem fotografa na Pascom.

- `png/post-NN/` traz os slides prontos para postar, e `_visao-geral.jpg` mostra o carrossel inteiro numa imagem só.
- `GUIA.md` reúne o texto de cada slide, a direção de arte, as fotos sugeridas, as legendas e as perguntas.
- `index.html` mostra a coleção inteira no navegador.

## Editar

Todo o conteúdo fica em `posts.js`. Depois de mudar um texto:

```bash
node render.js        # todos os posts (ou: node render.js 04)
node guia.js          # atualiza o GUIA.md
```

As cenas e diagramas (planta da igreja, celular, régua de zoom, fotômetro, mapa da procissão) estão em `scenes.js`. O pixelado do zoom digital é gerado de verdade no navegador.
