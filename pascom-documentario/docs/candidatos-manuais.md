# Candidatos para download manual

Encontrados por busca na web em 17/10/2026. **Não foram baixados nem verificados** (o ambiente de
desenvolvimento não tinha acesso de rede a essas plataformas). Abra cada página, confira se o
conteúdo serve à cena e se a licença continua a mesma, e só então baixe.

Licenças das plataformas:
- Pexels: [Pexels License](https://www.pexels.com/license/) — uso gratuito, atribuição não obrigatória;
  não sugerir que pessoas retratadas endossam a PASCOM; não revender sem alteração.
- Pixabay: [Pixabay Content License](https://pixabay.com/service/license-summary/) — uso gratuito,
  atribuição não obrigatória, mesmas ressalvas.

| Plano sugerido | Página | Plataforma |
|---|---|---|
| `o-glass` / `w-light` (luz pelos vitrais) | [Sunlight Through Church Windows](https://www.pexels.com/video/sunlight-through-church-windows-7568880/) | Pexels |
| `o-glass` / `m-church` | [Sunlight Shining Through a Church Window](https://www.pexels.com/video/sunlight-shining-through-a-church-window-10610677/) | Pexels |
| `o-glass` | [Stained Glass Windows](https://www.pexels.com/video/stained-glass-windows-3987671/) | Pexels |
| `o-lens` (lente ajustada) | [Close-up Footage of a Person Adjusting the Lens of a Camera](https://www.pexels.com/video/close-up-footage-of-a-person-adjusting-the-lens-of-a-camera-8089525/) | Pexels |
| `o-lens` | [A person holding a camera lens in their hand](https://www.pexels.com/video/a-person-holding-a-camera-lens-in-their-hand-19657013/) | Pexels |
| `o-bag` (câmera preparada) | [Changing the Lens Of a Digital Camera](https://www.pexels.com/video/changing-the-lens-of-a-digital-camera-4010523/) | Pexels |
| `o-lens` (diafragma em câmera lenta) | [A Close-Up Shot of a Camera Iris](https://www.pexels.com/video/a-close-up-shot-of-a-camera-iris-5245970/) | Pexels |
| `m-lower` | [Man Holding A Camera](https://www.pexels.com/video/man-holding-a-camera-2239241/) | Pexels |
| `c-prayer` (oração) | [People Praying at the Church](https://www.pexels.com/video/people-praying-at-the-church-5875588/) | Pexels |
| `c-prayer` / `w-observe` | [People Praying Inside the Church](https://www.pexels.com/video/people-praying-inside-the-church-9490591/) | Pexels |
| `w-hit` / `e-nave` (assembleia, igreja gótica) | [People in Church](https://www.pexels.com/video/people-in-church-11340744/) | Pexels |
| `m-christ` (altar) | [Man and a Woman Praying at the Altar](https://www.pexels.com/video/man-and-a-woman-praying-at-the-altar-8674330/) | Pexels |
| `w-adore` / `m-hope` (velas) | [Church, Candles, Prayer](https://pixabay.com/videos/church-candles-prayer-candle-211796/) | Pixabay |
| `m-hope` | [Candle, Church, Religion](https://pixabay.com/videos/candle-church-religion-fire-flame-7456/) | Pixabay |

Não encontrei procissão com velas em vídeo nessas buscas. Para `w-procession` e `m-procession`, o
ideal é **filmar uma procissão da própria paróquia**: além de resolver a licença, é a comunidade real.

## Como colocar um arquivo baixado manualmente

1. Salve em `public/assets/footage/<ato>/` (ex.: `opening/stained-glass--pexels-7568880.mp4`).
2. Acrescente um item em `public/assets/metadata/media-manifest.json` com os mesmos campos que o
   script grava (`shotId`, `slot`, `file`, `platform`, `originalUrl`, `author`, `license`,
   `licenseUrl`, `width`, `height`, `durationSec`, `trimStartSec`...). Use `ffprobe` para conferir
   resolução e duração.
3. Rode `npm run assets:scan`. O plano passa a usar o vídeo; os demais seguem com as placas.
