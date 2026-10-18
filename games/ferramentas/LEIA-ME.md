# Como as imagens de `games/img` foram feitas

Nada é foto de banco: tudo é gerado aqui.

1. `render.html` + `shot.mjs`: renderiza a marca "F" facetada em 3D (three.js 0.169) num PNG transparente.
   Precisa de `npm i three@0.169.0` na mesma pasta e de um servidor local na porta 8765
   (`python3 -m http.server 8765`). Exemplo: `node shot.mjs objeto.png "rx=0.15&ry=0.7&rz=-0.05"`.
2. `gen.py` (Python + NumPy + Pillow): desenha os rastros de luz, junta com a peça e salva os WebP.
   `python3 gen.py ../img objeto.png`

## Capas do portal (`games/portal/img`)

As capas são artes próprias, desenhadas em canvas, e não as capas oficiais dos jogos.
Sirva esta pasta (`python3 -m http.server 8767`) e rode `node capas.mjs <pasta>`: sai um PNG por jogo
(e o banner `hero`). Depois converta para WebP 396×459 (o banner fica em 1408×492).
