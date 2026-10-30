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

## Versão Blocos

`blocos.html` traz a mesma coleção com outra direção de arte, inspirada em duas referências: o pôster "Meet me here" (céu, tipografia gigante e larga, um objeto pequeno no topo da colina) e os blocos de montar em cores primárias.

- Conceito: *cada dica é uma peça, monte sua foto.*
- Capas: título enorme sobre o céu, colina verde e um objeto feito de blocos no topo (câmera, escada de 5 blocos, vela, pixels do zoom, procissão de velas, 3 blocos com um caído, hóstia sobre pedestal, celular, pilha contexto/personagem/detalhe, câmera virada).
- Miolo: cada dica é um bloco colorido com pinos, empilhado como muro. "Assim não" é vermelho, "assim sim" é verde.
- CTA sobre um muro de blocos. Último slide: "ME SEGUE AQUI", com a sua foto no topo da colina.

Exportar: `node render.js blocos`. Os PNGs ficam em `png-blocos/`.
