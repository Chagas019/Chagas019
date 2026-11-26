# 04 — Briefing V2 (feedback do cliente)

## Feedback recebido
1. "Não está igual o vídeo que eu mandei de preferência, eu quero igual." → A V1 ficou "polida/corporativa" demais (fundo azul escuro com degradê, grão, vinheta, ícones). O cliente quer a **linguagem das referências**: fundos CHAPADOS saturados, formas líquidas, personagem em movimento, linha branca condutora, tipografia pesada girando em anel 3D, energia crua.
2. Roteiro obrigatório (texto na tela, nessa ordem, exatamente):
   - "E AÍ,"
   - "ESTÃO PREPARADOS"
   - "PARA A 10ª GINCANA?"
   - "TÁ CHEGANDO, HEIN?"
   - Assinatura final: selo "GINCANA / Solidária / PAFIES / 10ª EDIÇÃO" (já existe).
   Nenhum outro texto. Sem datas, ano, locais, equipes.

## Regra de estilo V2 (o que muda)
- **Fundos chapados**, sem degradê de fundo, sem vinheta, sem grão. Cada cena com UMA cor sólida e saturada, troca de cor = corte seco no beat (como as refs):
  - Azul elétrico `#1F5BFF` (ref 3), Laranja `#FF6A13` (no lugar do vermelho da ref 1), Azul-marinho `#0B1A4A` (identidade), e um flash de Turquesa `#2EC4D6`.
  - Degradês laranja só DENTRO das formas (respingos, fita, personagem), para contraste.
- **Paleta das figuras**: laranja `#FF7A00`/`#FFB547`, azul `#1F5BFF`/`#2E86FF`, branco `#FFFFFF`, amarelo-ouro `#FFD23F` (substitui o amarelo puro da ref 3), marinho `#0B1A4A` para o texto preto.
- **Linha branca** fina (6–10 px) cortando o quadro na diagonal, virando arco, guiando o olho (ref 1). Substitui a fita laranja como condutor.
- **Personagem líquido original**: figura humanoide feita de formas fluidas (tubos arredondados), laranja com "respingos" azuis nos pés/mãos, correndo em câmera baixa (ref 2) e explodindo/recompondo em respingos (ref 1). Animação "on twos" (12–15 fps de pose).
- **Speed lines** em pinceladas radiais sobre fundo chapado (ref 2).
- **Anel tipográfico 3D** com a frase girando em 3 eixos, faces externas brancas, internas amarelo-ouro com texto marinho, borda amarela (ref 3).
- **Close extremo → plano aberto** como transição (ref 1).
- Tipografia: Anton (condensada pesada) para o anel e frases; Unbounded 900 para slams; Yellowtail só no "Solidária" do selo.

## Storyboard V2 — 30 fps, 120 BPM (beat = 15 f), 720 frames = 24 s
| Cena | Frames | Fundo | O que acontece | Texto |
|---|---|---|---|---|
| V1 "E aí" | 0–119 | Laranja chapado | Linha branca corta a tela na diagonal (0–20). Personagem líquido cai e "explode" em respingos azuis no chão (impacto f30) com linhas radiais finas; recompõe-se e acena. "E AÍ," bate grande em branco com squash no f45, treme no beat. | E AÍ, |
| V2 "Preparados" | 120–299 | Azul elétrico chapado (corte seco f120) | Anel tipográfico 3D gira nos 3 eixos (como ref 3) com "ESTÃO PREPARADOS ✦" repetido; aproxima-se, faz meia-volta e trava de frente legível ~f225–270; linha branca entra em arco. | ESTÃO PREPARADOS |
| V3 "10ª gincana" | 300–479 | Laranja→ corte para azul-marinho no f390 | Câmera baixa: personagem correndo em loop (ref 2) com speed lines brancas/azuis em pincelada; "PARA A" sobe; f390 corte seco: "10ª" gigante amarelo-ouro bate (impacto), "GINCANA?" em white slam no f405; respingos laranja. | PARA A 10ª GINCANA? |
| V4 "Tá chegando" | 480–599 | Close extremo do respingo (laranja/azul enchendo a tela) → abre para turquesa/azul elétrico | Zoom de escala brutal sai de dentro de um respingo (ref 1); "TÁ CHEGANDO," entra letra a letra no beat (f495–530); "HEIN?" pula com overshoot e balança (f540), personagem aponta/pula ao lado. | TÁ CHEGANDO, HEIN? |
| V5 Selo | 600–719 | Azul-marinho chapado | Linha branca desenha um círculo e vira o selo dourado ondulado (componente Selo existente) com coração e pessoas; lockup GINCANA / Solidária / PAFIES / 10ª EDIÇÃO; hit final f660; segura até o fim. | (selo) |

Cue sheet principal (impactos): 30, 45, 120 (corte), 225, 300, 390 (impacto máx), 405, 480 (whoosh/zoom), 540, 600, 660 (hit final). Kicks a cada beat a partir do f120; silêncio de 4 f antes de 390.
