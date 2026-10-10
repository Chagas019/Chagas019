# Theo Valente — Fotografia

Site cinematográfico de fotógrafo em Next.js + Tailwind, com GSAP (ScrollTrigger, SplitText) no movimento e Lenis no scroll. Regras de animação em [`CLAUDE.md`](./CLAUDE.md).

```bash
npm install
npm run dev
```

## Seções

1. **Hero** — tela preta com visor de câmera e contador de frames (tensão), linha de exposição que vira obturador, vídeo em loop, título em reveal por letra, nome gigante e indicador de scroll que some ao descer.
2. **Olhar** — seção com pin: dolly-in e foco da lente controlados pelo scroll, abertura de diafragma, elementos entrando a cada 0.2s com `power3.out`.
3. **Serviços** — lista numerada em acordeão, como na referência.
4. **Arquivo de luz** — galeria horizontal com pin (desktop) e quadros que abrem como obturador digital; coluna simples no mobile.
5. **Contato** — chamada gigante, brilho laranja e relógio de São Paulo.

## Mídia

`public/media/` tem vídeo e imagens **provisórios**, gerados por código (o ambiente não tinha acesso a bancos de imagem). Troque pelas fotos reais mantendo os mesmos nomes de arquivo:

`hero.mp4`, `hero-poster.jpg`, `retrato-01/02.jpg`, `editorial-01/02.jpg`, `campanha-01.jpg`, `luz-01/02/03.jpg`.

Nome, textos, e-mail e redes sociais também são exemplos.
