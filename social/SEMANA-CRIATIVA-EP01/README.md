# SEMANA CRIATIVA — EP. 01
**Apps para melhorar sua criatividade** · Carrossel Instagram 1080 × 1350 (4:5) · 7 slides
Assinatura: **CHAGAS CRIATIVIDADE** — *Inspirar. Experimentar. Criar.*

## Estrutura
```
SEMANA-CRIATIVA-EP01/
├── index.html            visualizador responsivo (rolagem lateral + download)
├── slides/01…07.html     um arquivo por slide (1080×1350)
├── css/system.css        sistema visual: tokens, tipografia, grão, moldura de seleção, celular
├── assets/logos/         ícones originais (recortados das capturas da App Store)
├── assets/textures/      céu, grama, papel e grão (gerados por scripts/textures.py)
├── assets/fonts/         Bricolage Grotesque · Instrument Serif · JetBrains Mono (OFL)
├── scripts/export.js     exporta PNG 1x e 2x
└── export/
    ├── png/              1080×1350 — pronto para postar
    ├── png-2x/           2160×2700 — alta resolução
    └── prancha-completa.jpg
```

## Exportar de novo
```bash
python3 scripts/textures.py        # opcional: regenera texturas
node scripts/export.js             # todos os slides (ou: node scripts/export.js 03)
```

## Sistema visual
- **Tipografia:** **Caer** (Hvnter) em caixa-baixa nos títulos de impacto, Bricolage Grotesque nos textos × Instrument Serif itálica (palavras de destaque) × JetBrains Mono (legendas editoriais).
- **Paleta:** céu `#5E8FCF`, grama `#2E4A23`, papel `#F3EEE3`, tinta `#161613` + cor-assinatura de cada app (Leica `#E2412A`, Evoto `#F6D660`, Luminar `#E2A33B`).
- **Assinaturas gráficas:** numeral serifado gigante, lista com fios, “Dica prática” dentro de uma moldura de seleção tracejada, ícones como adesivos sobrepostos, grão analógico em todas as peças.
- **Ritmo:** papel → papel → **papel / tinta / grama** (apps) → céu → papel + grama (fecha com a mesma colina da capa).

## Fonte Caer
Os títulos usam a **Caer** (Hvnter, licença comercial: shop.6tm-magazine.com). Ela não vem no projeto porque é paga.
Depois de comprar, copie o arquivo para `assets/fonts/Caer.woff2` (ou `Caer.otf`) e rode `node scripts/export.js`.
Ela entra sozinha e o efeito provisório é desligado.
Sem o arquivo, os títulos usam uma versão provisória: Unbounded 900 + filtro SVG líquido (`js/system.js`).

## Observações
- As telas dos celulares são **interfaces ilustrativas** (construídas em código), indicadas na legenda de cada slide. Para usar capturas reais, troque o conteúdo de `.screen` por uma `<img>`.
- Fotos de céu e grama são texturas geradas; para fotos reais, substitua os arquivos em `assets/textures/` mantendo os nomes.
