#!/usr/bin/env bash
# Renderiza todas as peças estáticas da marca e do EP001.
set -e
cd "$(dirname "$0")/../studio"
r(){ npx remotion still src/index.ts "$1" "$2"; }
r Logo ../brand/santorama-logo.png
r ProfilePic ../brand/santorama-perfil-1080.png
r BrandBoard ../brand/santorama-identidade.png
r StoryTemplate ../templates/story-template.png
r ReelTemplate ../templates/reels-zonas-seguras.png
r CharacterSheet ../assets/characters/kolbe-model-sheet.png
r CoverEP001 ../episodes/001-sao-maximiliano-kolbe/thumbnail/capa-reels-ep001.png
r FeedEP001 ../episodes/001-sao-maximiliano-kolbe/thumbnail/post-feed-ep001.png
