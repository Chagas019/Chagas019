# Bíblia do personagem: São Maximiliano Maria Kolbe (v2, estilo chibi)

**Fonte única:** `studio/src/characters/Chibi.tsx`, com os presets `KOLBE_HABITO` e `KOLBE_PRISIONEIRO`. Todas as cenas, a capa e a model sheet usam esses presets. Nenhuma cena redesenha o personagem, e é isso que garante a mesma aparência no episódio inteiro.
**Model sheet:** `assets/characters/kolbe-model-sheet.png`.
O desenho semirrealista da v1 continua em `studio/src/characters/Kolbe.tsx` (arquivo histórico).

## Linguagem (alinhada ao vídeo de referência)
- Flat 2D com **contorno grosso #2B1B14**, cores chapadas e uma única sombra.
- Cabeça grande (cerca de 40% da altura), olhos de ponto com brilho, bochechas rosadas.
- Corpo pequeno e braços em "tubo" com mãos redondas. Respiração e piscadas automáticas.

## Traços fixos do Kolbe
- **Óculos redondos** sempre presentes. É a marca de reconhecimento do personagem.
- Cabelo castanho-escuro penteado para trás (hábito) ou **cabeça raspada** (Auschwitz).
- **Sem barba** em 1939–1941. Para cenas de 1930–1939 (Japão), criar a variante `barba`.
- Hábito conventual **preto** com mozeta e cordão branco de **3 nós**.
- Prisioneiro: uniforme listrado azul-acinzentado e bege, triângulo vermelho e nº **16670**.

## Controles de atuação
`expression`: sereno · gentil · determinado · triste · choro · sério.
`arms`: down · pray · face · open · point.
Outros: `walk` (ciclo de caminhada), `eyesClosed`, `gaze`, `halo`, `shake`.

## Elenco de apoio
O mesmo boneco com outros parâmetros:
- **Prisioneiros:** gorro listrado.
- **Pai de família (Franciszek Gajowniczek):** `expression="choro"`, `arms="face"`.
- **Guardas:** capacete, uniforme cinza-oliva, **sem insígnias**.
