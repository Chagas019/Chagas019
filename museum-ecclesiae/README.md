# Museum Ecclesiae

Museu digital da Igreja Católica. Site estático (HTML, CSS e JS, sem dependências nem APIs).

- Páginas: `index.html`, `exposicoes.html`, `santos.html`, `historia.html`, `arte-sacra.html`
- Acervo: `js/data.js` (obras, exposições, santos, períodos e linha do tempo, com fontes) e `img/` (Wikimedia Commons; licença e autor em cada obra)
- Ver localmente: `python3 -m http.server 8000` dentro desta pasta
- Testes: `node tests/qa.js` (Playwright, desktop e celular)
- Publicar: envie a pasta inteira para qualquer hospedagem estática (GitHub Pages, Netlify, Vercel)
