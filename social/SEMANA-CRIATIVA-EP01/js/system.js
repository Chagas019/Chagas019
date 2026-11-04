// Fonte display: Caer (Hvnter). Se assets/fonts/Caer.woff2 (ou .otf) existir, ela é usada direto.
// Sem o arquivo, cai na versão líquida provisória: Unbounded 900 + filtro SVG "derretido".
(function () {
  const svg = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="liquid" x="-10%" y="-10%" width="120%" height="120%">' +
    '<feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="b"/>' +
    '<feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="g"/>' +
    '<feComposite in="g" in2="g" operator="atop"/></filter></svg>';
  document.body.insertAdjacentHTML('afterbegin', svg);
  document.fonts.load('100px Caer').then(f => { if (f.length) document.documentElement.classList.add('has-caer'); });
})();
