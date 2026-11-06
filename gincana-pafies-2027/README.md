# Mascote animado — 10ª Gincana Solidária PAFIES 2027

Vídeo vertical 9:16 (1080x1920, 30 fps, ~30 s) com o mascote do PAFIES como apresentador.

## O que já está pronto aqui

| Arquivo | O que é |
|---|---|
| `assets/mascote-referencia.png` | Imagem original do mascote (só sem as faixas pretas). **Referência obrigatória** para toda geração. |
| `roteiro.md` | Fala completa, tempo de cada cena, textos na tela e efeitos sonoros. |
| `prompts-ia.md` | Prompts prontos, cena por cena, para animar o personagem (image-to-video), gerar a voz e sincronizar a boca. |
| `animatic/` | Montagem de motion graphics em 9:16: partículas, "EI, VOCÊ!", o 10 em dourado, troféu/medalha/estrela/caixa de alimentos, cartão das datas, confetes, título e slogan. Usa a imagem **parada** do mascote. |
| `entregas/animatic-pafies-2027.mp4` | Render do animatic (30 s, sem áudio). |

> **Importante:** o animatic **não** é a animação final. O mascote aparece parado (só câmera, zoom e
> giro em volta dele). Movimento de boca, piscadas, gestos e voz dependem de ferramentas de IA
> externas — veja `prompts-ia.md`. Nada disso foi gerado ainda.

## Fluxo de produção

1. **Voz** — gerar a narração com `roteiro.md` (ElevenLabs, voz masculina jovem pt-BR) → salvar em `audio/voz.mp3`.
2. **Clipes do mascote** — para cada cena, gerar um clipe image-to-video a partir de
   `assets/mascote-referencia.png` (Kling, Runway Gen-4, Veo ou Hailuo) → salvar em `clipes-ia/cena1.mp4` … `cena5.mp4`.
3. **Lip sync** — passar cada clipe + trecho da voz por uma ferramenta de sincronização labial
   (Hedra, Kling Lip Sync, Sync.so) → `clipes-ia/cenaN-lipsync.mp4`.
4. **Montagem final** — trocar o fundo do animatic pelos clipes animados (a próxima versão do
   `animatic/index.html` aceita vídeo no lugar de `mascote.jpg`), adicionar trilha e efeitos, renderizar.

## Renderizar o animatic de novo

```bash
cd gincana-pafies-2027/animatic
node render.js                              # gera entregas/animatic-pafies-2027.mp4
node render.js --frames 2.5,7,15,20,28      # só alguns quadros PNG para conferir
```

Para ver no navegador em tempo real, abra `animatic/index.html`.

## Checklist de fidelidade ao personagem

- Rosto, olhos castanhos grandes, sobrancelhas marcadas e cabelo preto bagunçado.
- **Gorro branco de tricô** (na imagem é gorro/touca, não boné — manter assim).
- Fones de ouvido pretos sobre o gorro.
- Camisa azul com gola V branca, punhos brancos e o logo "Pafies" em branco no peito.
- Calça escura, mãos nos bolsos na pose inicial.
- Nenhum personagem duplicado, nenhuma mudança na camisa ou no logo.
