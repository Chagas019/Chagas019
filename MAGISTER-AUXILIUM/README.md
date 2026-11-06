# MAGISTER AUXILIUM — Identidade visual complementar

> **O logotipo não muda.** Todas as peças usam o arquivo `assets/logo-original.png` como imagem fechada
> (`<img>` com `object-fit: contain`): proporção preservada, sem filtros, sem recorte, sem remoção de fundo,
> sem elementos por cima. Em fundos escuros ele entra sobre uma placa branca/marfim.

## ⚠️ Pendência: inserir o logotipo oficial
O arquivo do logotipo não chegou junto com o pedido. Por enquanto, `assets/logo-original.png` é uma **vaga
sinalizada** ("LOGOTIPO ORIGINAL — substitua este arquivo"), não uma recriação. Para aplicar o oficial:

```bash
./trocar-logo.sh /caminho/logotipo-magister-auxilium.png
```
O script copia o arquivo byte a byte, confere que está idêntico e regenera todos os PNGs, o PDF e o ZIP.

## Estrutura
| Pasta | Conteúdo |
|---|---|
| `01-BRANDING-BOARD` | Prancha principal 2:3 (3200×4800 px) — hero, mockups, sistema gráfico, aplicação, mockup final |
| `02-MOCKUPS` | Cartões A/B, pilha 3D com borda dourada, kit de papelaria, fachada, placa, camiseta, perfil no Instagram |
| `03-CARTOES` | Versão A (escura) e B (clara), frente e verso, 90×50 mm em alta (2100 px) |
| `04-PAPELARIA` | Timbrado A4, envelope DL, pasta, certificado, crachá, cartão de agradecimento |
| `05-ELEMENTOS-GRAFICOS` | SVGs: estrela de 8 pontas (cheia/traço), círculo áureo, curvas do manto, livro aberto, padrões — em dourado, petróleo, marfim e turquesa |
| `06-REDES-SOCIAIS` | Avatar, 3 posts 1080², story 1080×1920, assinatura de e-mail |
| `07-MANUAL` | `manual-identidade-visual.pdf` (12 páginas) + páginas em PNG |
| `08-ARQUIVOS-FINAIS` | ZIP com toda a entrega |
| `assets`, `_fonte` | Arquivos editáveis: CSS de tokens, componentes, HTML de cada peça e script de renderização |

Campos entre `[ ]` (nome, cargo, telefone, e-mail, endereço etc.) são **editáveis** — nenhum dado institucional foi inventado.

## Editar e regenerar
Edite o HTML da peça (cada pasta tem o seu) ou os tokens em `assets/brand.css`, depois:
```bash
node _fonte/render.js            # tudo
node _fonte/render.js 03-CARTOES/cartoes.html   # só uma página
```

## Paleta
Marfim `#F8F5EF` · Branco `#FFFFFF` · Preto `#171615` · Grafite `#292827` · Verde petróleo `#075C5A` ·
Verde profundo `#123D3B` · Turquesa `#36BDB5` · Dourado `#B98732` · Ouro claro `#C9A45D`

Tipografia: Cormorant Garamond / Cinzel (títulos) + Montserrat (textos).

## Controle de qualidade
- [x] Logotipo inserido apenas como arquivo, sem redesenho, filtro, recorte ou sobreposição
- [x] Proporção preservada em todas as peças (`object-fit: contain`)
- [x] Elementos gráficos nunca sobrepõem o logotipo (exceto o exemplo de "uso proibido" no manual)
- [x] Nome grafado "MAGISTER AUXILIUM"
- [x] Nenhum dado institucional inventado
- [ ] **Substituir a vaga pelo logotipo oficial e conferir visualmente cada peça**

## Observação sobre os mockups
As cenas são composições construídas em HTML/CSS (luz, sombra, textura de papel, perspectiva 3D, hot stamping
simulado). Para fotografia de produto fotorrealista, use estas artes planas em mockups PSD de estúdio.
