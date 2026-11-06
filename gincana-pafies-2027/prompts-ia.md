# Prompts para as ferramentas de IA

Sempre envie `assets/mascote-referencia.png` como **imagem inicial / referência de personagem**.
Formato 9:16, 1080x1920 (ou o máximo da ferramenta), 5–8 s por clipe.

## Bloco fixo (cole no começo de todo prompt)

```
Same character as the reference image, exact identity preserved: young boy, Pixar-style 3D,
big brown eyes, thick dark eyebrows, messy black hair, white knitted beanie, black over-ear
headphones over the beanie, royal blue t-shirt with white V-neck collar and white sleeve cuffs,
white "Pafies" logo on the chest, dark pants. Do not change the shirt, logo, face or proportions.
Single character only. Blue cinematic background with soft bokeh particles, volumetric blue
light, gold accents. Looking straight at the camera. Natural, fluid motion, no morphing.
```

## Negativo (se a ferramenta aceitar)

```
different character, extra people, duplicated character, changed logo, distorted text on shirt,
cap instead of beanie, missing headphones, deformed hands, extra fingers, robotic motion,
exaggerated expressions, flicker, morphing face
```

## Clipes por cena

**Cena 1 — Abertura (4 s)**
```
Camera slowly pushes in from darkness as blue light rises. The boy takes his hands out of his
pockets, raises his eyebrows in pleasant surprise, small smile, blinks naturally, looks into the lens.
```

**Cena 2 — Apresentação (7 s)**
```
The boy talks excitedly to the camera like a TV host, natural head movement, natural blinks,
waves one hand in a "come closer" gesture, then opens both arms wide with a big happy smile.
Medium shot, slight slow zoom in.
```

**Cena 3 — Provas (7 s)**
```
The boy points to his left, then to his right, then counts on his fingers while talking happily.
Body sways slightly, eyes follow his hand and return to the camera. Medium-wide shot, slow zoom out.
```

**Cena 4 — Data (6 s)**
```
Camera orbits slowly around the boy (about 20 degrees). He points upward above his head with
confidence, then looks back to the camera and nods with a smile.
```

**Cena 5 — Encerramento (6 s)**
```
The boy celebrates with a fist pump, big genuine smile, then points straight at the camera.
Blue and gold confetti falls around him. Slight push in.
```

## Voz (ElevenLabs)

- Voz: masculina, jovem (17–22 anos), português brasileiro, energia de apresentador.
- Texto: o "texto corrido" de `roteiro.md`.
- Ajustes sugeridos: estabilidade baixa/média (mais expressiva), estilo alto.
- Se nenhuma voz pronta servir, usar o "Voice Design" com a descrição:
  `Young Brazilian male TV host, energetic, warm, charismatic, natural Brazilian Portuguese accent, clear diction, smiling voice.`

## Lip sync

- Hedra (Character-3) aceita **imagem + áudio** direto e já gera fala com boca sincronizada.
  É o caminho mais curto: um clipe por trecho da fala.
- Alternativa: gerar o clipe na Kling e usar o "Lip Sync" da própria Kling com o trecho de áudio.
- Confira sempre: logo da camisa legível, gorro branco, fones presentes, nenhuma deformação nas mãos.
