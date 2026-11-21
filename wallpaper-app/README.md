# Aura Wallpapers

App web (PWA) de wallpapers para celular, baseado no design “Wallpaper” (tela de boas-vindas + galeria em bento com filtros por categoria).

**Destaques**

- **120 wallpapers exclusivos** em 5 categorias — Retratos (rosto oculto), Natureza, Arquitetura 3D, Cinema e Abstrato.
- **Arte gerada no aparelho** (canvas, sem bancos de imagens, sem direitos autorais de terceiros, sem chaves de API). Cada wallpaper vem de uma semente fixa, então a miniatura e o arquivo final são idênticos.
- **Download em PNG** na resolução do seu aparelho, em Full HD (1080×2340) ou em 4K (2160×4680).
- **Prévia da tela de bloqueio** (data e hora sobre o wallpaper), navegação por gesto (deslizar), setas e teclado.
- **Favoritos** guardados no aparelho, **busca** sem acentos (“por do sol” encontra “pôr do sol”), **compartilhar** (envia a imagem pelo menu do celular ou copia o link).
- **Funciona offline** e pode ser instalado na tela inicial (service worker + manifest).
- Sem dependências, sem build: HTML, CSS e JavaScript puros. CSP rígida (`script-src 'self'`), nada de `innerHTML` com texto do usuário.

## Como executar

Precisa apenas de Node.js 18+.

```bash
cd wallpaper-app
npm start            # http://localhost:5173
```

Qualquer servidor estático também serve (ex.: `npx serve .`). Abrir o `index.html` direto do disco não funciona porque módulos ES exigem http.

## Testes

```bash
npm test             # testes unitários (gerador, catálogo, busca)
npm run test:e2e     # ponta a ponta no Chromium emulando um iPhone (requer Playwright)
```

O teste ponta a ponta (14 cenários) cobre: link malformado, foco preso no detalhe, servidor que só entrega arquivos do app, boas-vindas só na primeira visita, galeria com 120 itens, filtros, detalhe, navegação, download do PNG (confere 1080×2340 no cabeçalho do arquivo), favoritos após recarregar, busca, link direto, modo offline, ausência de rolagem horizontal e de erros no console.

## Publicar

É um site estático: publique a pasta `wallpaper-app/` inteira em qualquer hospedagem (GitHub Pages, Vercel, Netlify, Cloudflare Pages). Não há variáveis de ambiente nem credenciais. Para instalar no celular, abra o endereço publicado (precisa ser HTTPS) e use “Adicionar à tela de início”.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Página única, CSP e manifest |
| `css/app.css` | Visual (tokens, bento, chips, detalhe, folha de download) |
| `js/app.js` | Rotas (`#/`, `#/c/<categoria>`, `#/w/<id>`, `#/busca`), telas, download e compartilhamento |
| `js/art.js` | Motor de arte procedural (uma pintura por categoria) |
| `js/catalog.js` | Categorias, catálogo determinístico e busca |
| `js/store.js` | Favoritos e “já viu as boas-vindas” no `localStorage` (à prova de modo privado) |
| `sw.js` | Cache offline (rede primeiro, cache como reserva) |
| `server.mjs` | Servidor local sem dependências |

Para adicionar mais wallpapers por categoria, mude `buildCatalog(24)` em `js/app.js`. Ao mudar arquivos do app, troque `VERSION` em `sw.js` para os celulares receberem a versão nova.
