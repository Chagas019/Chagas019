---
name: realistic-materials
description: Orienta materiais, reflexos, sombras, texturas, iluminação e renderização realista em cenas 3D web (Three.js/R3F) e em efeitos visuais CSS. Use ao ajustar o visual de modelos 3D, criar acabamentos (vidro, metal, concreto, madeira, tecido) ou buscar fotorrealismo.
---

# Realistic Materials & Rendering

## Fundamentos de PBR
- **Base color/albedo** sem luz nem sombra "pintada".
- **Roughness** define o brilho: 0 é espelho, 1 é fosco. Quase nada real é 0 ou 1.
- **Metalness** é 0 ou 1 (metal ou não); valores intermediários só em transições.
- **Normal map** para detalhe fino; **AO** para oclusão nas frestas.

## Receitas (MeshPhysicalMaterial / MeshStandardMaterial)
- **Vidro**: `transmission: 1`, `roughness: 0.05–0.15`, `ior: 1.5`, `thickness` > 0. Reflexo do ambiente é essencial.
- **Metal escovado**: `metalness: 1`, `roughness: 0.3–0.5`, com normal map anisotrópico se possível.
- **Concreto**: `roughness: 0.85–0.95`, textura de albedo com variação e normal map suave.
- **Madeira**: albedo com veios, `roughness: 0.5–0.7`, `clearcoat` para verniz.
- **Tecido**: `sheen` + `sheenRoughness`, roughness alto.
- **Água**: transmission, normal map animado e reflexo do céu.

## Iluminação
- HDRI (`Environment`) como base: define reflexos e o "clima". Escolha um HDRI coerente com a hora do dia.
- Uma luz principal (sol/key) com sombra, um preenchimento suave e um contorno (rim) opcional.
- Sombras de contato sob objetos dão peso; ambient occlusion dá profundidade.
- Para arquitetura, prefira iluminação "assada" (lightmaps) feita no Blender: realista e barata.

## Câmera e pós-processamento
- Tone mapping ACES Filmic; exposição ajustada.
- Lente de 35–50mm para arquitetura (evite distorção), verticais retas.
- Pós com moderação: bloom leve, vinheta sutil, SSAO/N8AO, depth of field só em close.

## Texturas
- Resolução proporcional ao tamanho na tela; KTX2 comprimido; mipmaps ligados.
- Evite repetição visível: variação, decals, mistura de texturas.

## Em CSS (sem 3D)
Simule materiais com camadas: gradiente sutil + ruído (noise), `backdrop-filter` para vidro e sombras em camadas (contato + ambiente).
