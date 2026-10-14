# DISANTOS — Roteiro de narração

**Voz:** masculina, adulta, brasileira (português do Brasil), timbre médio-grave, acolhedor e expressivo, com presença.
**Direção:** documentário cinematográfico e campanha de moda premium. Voz próxima, confiante e emocional, sem dramatização. Dicção clara, ritmo natural, pausas intencionais entre as frases e emoção crescente.
**Proibido:** leitura mecânica, entonação uniforme, pronúncia artificial ou efeitos que simulem voz.

## Situação atual

**Não existe narração gravada neste projeto.** Nenhum serviço de voz de alta qualidade está configurado aqui, e a síntese genérica desta máquina soaria robótica (o que o briefing proíbe). Por isso o projeto está preparado, mas **sem narração**. As legendas aparecem com o texto abaixo, e o áudio de voz entra quando o arquivo for colocado no lugar.

## Texto e linha do tempo

| Trecho | Cena | Janela (s) | Texto |
|---|---|---|---|
| N1 | 02 — A memória | 3,3 → 8,1 | "A fé atravessa gerações. A história dos santos continua viva em cada um de nós." |
| N2 | 04 — A conexão | 12,6 → 15,8 | "É carregar consigo aquilo em que acreditamos." |

- Os tempos acima são os de `src/config/captions.ts`. Se a gravação mudar de ritmo, ajuste lá, para que legenda, ducking da trilha e voz fiquem alinhados.
- N1 tem 16 palavras em 4,8 s. Isso exige fala natural, sem pressa. Se a gravação ficar longa, a alternativa é abrir a cena 02 um pouco antes, ajustando `src/config/timeline.ts`.
- Os textos de tela da cena 01, da cena 03 ("Não é apenas uma camiseta." / "É fé. É história. É identidade.") e da cena 05 ("Vista a fé. Carregue a história.") **não** são narrados. São textos de tela.

## Especificação do arquivo entregue

- Arquivo: `public/narracao/narracao-final.wav`
- PCM 48 kHz, 16 ou 24 bits, estéreo ou mono
- Duração exata de **20,000 s**, do início ao fim do vídeo, com silêncio onde não há fala. Assim a voz fica alinhada à linha do tempo sem deslocamento.
- Nível: picos em torno de -3 dBFS, sem clipping. Loudness integrado perto de -16 LUFS.
- Sem música nem efeitos no arquivo de voz. A mixagem é feita no projeto.

## Como gravar ou gerar

1. Gravação humana com ator ou locutor brasileiro, seguindo a direção acima; ou
2. Serviço de síntese de voz de alta qualidade, com licença que permita uso comercial. Nesse caso, o texto e a licença devem ser guardados junto ao arquivo.

Depois de colocar o arquivo, rode `npm run assets` e o render. A trilha abaixa automaticamente durante as duas falas.
