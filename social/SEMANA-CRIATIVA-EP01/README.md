# SEMANA→CRIATIVA · EP. 01
**Apps para melhorar sua criatividade** · Carrossel Instagram 1080 × 1350 (4:5) · 7 slides
Assinatura: **CHAGAS CRIATIVIDADE** · *Inspirar. Experimentar. Criar.*

## Direção de arte (v2)
Fundo preto, cartões de membro inclinados com numeração gigante (#01, #02, #03), um círculo central com asterisco ou com o ícone do app, uma paleta reduzida (laranja `#FF4D1F`, osso `#E7E5E0` e preto), tipografia suíça (Inter Display Bold/SemiBold, entrelinha e espaçamento bem fechados), brilho de plástico e grão.
- Cada app tem seu cartão: Leica → laranja · Evoto → osso · Luminar → preto.
- O asterisco é o sinal gráfico da série (bullets, tags, dica prática).

## Estrutura
```
SEMANA-CRIATIVA-EP01/
├── index.html            visualizador responsivo + download
├── src/                  fonte de cada slide (CSS + conteúdo) e _layout.html comum
├── slides/               HTML final por slide (gerado por scripts/build.py)
├── css/system.css        sistema: cores, tipografia, componente .card
├── assets/logos/         ícones originais dos apps (App Store)
├── assets/fonts/         Inter Display (OFL)
├── assets/textures/      grão
├── scripts/build.py      src → slides
├── scripts/export.js     PNG 1x e 2x
└── export/png · export/png-2x · export/prancha-completa.jpg
```

## Gerar de novo
```bash
python3 scripts/build.py && node scripts/export.js
```
