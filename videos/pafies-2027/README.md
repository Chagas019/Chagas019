# Vídeo — 10ª Gincana Solidária PAFIES 2027

Vídeo de 58 segundos, 16:9, em 4K (3840 × 2160, 30 quadros/s), com narração feminina em português do Brasil, trilha instrumental e painéis 3D animados inspirados nos widgets de referência (cartões escuros com cantos arredondados, gráficos de barras, anéis de progresso, galeria flutuante e linhas de conexão).

- `pafies-2027-4k.mp4`: o vídeo final (4K)
- `index.html`: o vídeo em código. Abra no navegador e clique em **Assistir** (espaço também funciona). A barra permite ir a qualquer segundo.
- `config.js`: **todos os textos, números, datas, fotos, tempos e cores**. Edite aqui e renderize de novo.

## Roteiro e cenas

| Tempo | Cena | Na tela |
|---|---|---|
| 0–11 s | O começo (2017) | Tela escura, painel "2017" surge devagar; duas fotografias antigas (em sépia) aparecem atrás |
| 11–18 s | A história cresceu | As fotos das 9 edições entram em sequência como galeria flutuante, ligadas por linhas luminosas; painel "9 edições realizadas" com barras crescendo uma a uma e a 10ª pontilhada (2027) |
| 18–23 s | Conquista | Contador "+50.000 alimentos arrecadados" com anel, terminando junto com a fala "mais de 50 mil alimentos" |
| 23–29 s | A décima edição | Contador de edições sobe de 1 a 9 na fala "depois de nove edições" e vira 10 em "décima"; tudo converge para o centro |
| 29–32 s | Revelação | Flash e raios de luz: **10ª GINCANA SOLIDÁRIA PAFIES 2027** |
| 32–43 s | Um marco | As fotos voltam em órbita ao redor da marca, conectadas a ela |
| 43–52 s | O convite | Painel de calendário "Próxima edição — Uma história de solidariedade continua", linha do tempo de 2017 a 2027 |
| 52–58 s | Encerramento | Painéis somem, fica a identidade: "Faça parte dessa história." e "Inscrições abertas — link na bio." |

Os únicos números usados são os do roteiro: 2017, 9 edições, mais de 50 mil alimentos, 10ª edição, 2027.

As legendas (ligadas por padrão, para quem assiste sem som) podem ser desligadas em `config.js` (`legendas: false`).

## Narração

Gerada no ElevenLabs com a voz **Muriell** (feminina, português do Brasil, natural e acolhedora), modelo `eleven_v4`, com direção de interpretação por trecho: carinho e nostalgia em "Tudo começou em 2017…", orgulho em "50 mil alimentos", expectativa crescente na décima edição e tom próximo no convite final. Foram geradas duas versões; a usada é `audio/narracao.mp3` (49,8 s), que respeita melhor as pausas.

**Para trocar por uma locutora humana:** grave o texto do roteiro, salve como `audio/narracao.mp3` e, se o ritmo mudar, ajuste em `config.js` o `narracaoInicio`, os inícios das `cenas` e os tempos das `falas`.

## Trilha

`audio/trilha.wav` é gerada por `trilha.py` (piano suave e cordas, crescendo até a revelação). Para usar uma música licenciada, substitua o arquivo mantendo o nome. Na mixagem, a trilha abaixa sozinha sempre que a voz fala (sidechain) e o resultado é normalizado para −14 LUFS (padrão de redes sociais).

## Fotos reais

Coloque as fotos na pasta `fotos/` (veja `fotos/LEIA-ME.md`). Enquanto não houver fotos, os cartões mostram uma textura no lugar. Depois de colocar as fotos, renderize de novo.

## Como renderizar

Precisa de Node.js, Playwright (com Chromium) e ffmpeg.

```bash
python3 trilha.py              # só se quiser gerar a trilha de novo
node render.mjs                # 4K → pafies-2027-4k.mp4
node render.mjs --1080         # 1920 × 1080 → pafies-2027-1080p.mp4 (mais rápido)
node render.mjs --partes 8     # usa 8 navegadores ao mesmo tempo
```

Para Reels/TikTok (9:16), dá para recortar o centro do vídeo 16:9 no editor, mas o ideal é uma versão vertical própria.
