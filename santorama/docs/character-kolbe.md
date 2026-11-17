# Bíblia do personagem — São Maximiliano Maria Kolbe

**Fonte única:** `studio/src/characters/Kolbe.tsx`. Todas as cenas, a capa e a model sheet usam esse componente. Nenhuma cena redesenha o rosto, e é isso que garante a mesma aparência no episódio inteiro.
**Model sheet:** `assets/characters/kolbe-model-sheet.png`

## Traços fixos (baseados nas fotografias históricas, ver `episodes/001.../research/pesquisa.md`)
- Rosto oval e alongado, testa alta, queixo estreito. Corpo franzino (tuberculose crônica).
- Cabelo castanho-escuro, curto, penteado para trás, com entradas.
- **Óculos redondos de aro metálico fino** dourado-envelhecido (#C2A673).
- Olhos castanho-escuros, olhar sereno. Sobrancelhas retas e escuras.
- **Sem barba** nas variantes atuais. Para cenas de 1930–1939 (Japão/Niepokalanów), criar a variante `barba` (barba cheia escura e pontuda).
- Pele: base #D8A47E · sombra #9C6546 · luz #F2CDA6.

## Variantes
| Variante | Uso | Detalhes |
|---|---|---|
| `habito` | 1910–1941 | hábito conventual preto, capuz dobrado, mozeta e cordão branco com 3 nós (pobreza, castidade, obediência) |
| `prisioneiro` | Auschwitz 1941 | uniforme listrado azul-acinzentado e cinza, cabeça raspada, triângulo vermelho com "P", nº **16670** |

## Controles de atuação (props)
`expression`: sereno · gentil · determinado · dor — `gaze` [x,y] — `tilt` — `eyesClosed` (oração) — `light`: quente · frio · ouro — `rim` — `breathe`.
Piscadas automáticas e naturais (a cada 2,5–5 s), respiração e micro-movimentos de cabeça sempre ativos, para o personagem nunca ficar "congelado".
