---
name: web-3d-experience
description: 3D Web Experience. Planeja e implementa experiências 3D com Three.js e React Three Fiber, com iluminação, materiais PBR, câmeras orbitais, controles 360° e modelos 3D otimizados. Use para imóveis, prédios, produtos, configuradores e experiências interativas na web.
---

# 3D Web Experience

## Antes de começar
- Confira as dependências do projeto (`three`, `@react-three/fiber`, `@react-three/drei`). Não instale nada sem necessidade nem sem avisar o usuário.
- Pergunte-se: o 3D resolve algo que imagem ou vídeo não resolvem? Se não, prefira imagem ou vídeo.

## Estrutura (React Three Fiber)
- `<Canvas>` isolado em um componente carregado com `lazy()` + `Suspense`, com imagem estática de fallback.
- Separe: `Scene` (composição), `Model` (carregamento do GLTF), `Lights`, `CameraRig`, `Controls`.
- Use `useGLTF` + `preload`; `useFrame` só para o que realmente anima e sem criar objetos dentro dele.

## Modelos
- Formato glTF/GLB, com compressão Draco ou Meshopt e texturas KTX2/WebP.
- Metas: menos de 5 MB no total, menos de 100 mil triângulos visíveis no mobile e texturas de até 2048px (1024px no mobile).
- Junte geometrias e materiais iguais; use instancing para repetições (janelas, árvores, cadeiras).

## Iluminação e materiais
- `Environment` (HDRI) para reflexos e luz ambiente; uma luz direcional principal para sombra.
- Materiais PBR (`MeshStandardMaterial`/`MeshPhysicalMaterial`) com roughness e metalness coerentes.
- Sombras: prefira sombras "assadas" (baked) ou `ContactShadows` em vez de sombras dinâmicas pesadas.
- Tone mapping ACES Filmic e espaço de cor sRGB corretos.

## Câmera e controles
- `OrbitControls` com limites (polar/azimuth, min/max distance) e damping.
- Pontos de vista pré-definidos (ex.: fachada, planta, apartamento) com transição suave.
- 360°: arraste no desktop e toque no mobile; não capture o scroll da página sem intenção.

## Performance
- `dpr={[1, 2]}`, `frameloop="demand"` quando a cena é estática, `PerformanceMonitor` para reduzir a qualidade.
- Pause a renderização quando o canvas está fora da tela.
- Libere geometrias e texturas ao desmontar.

## Acessibilidade
Ofereça controles por botão (girar, zoom, vistas), descrição textual do conteúdo e fallback sem WebGL.
