// Abertura cinematográfica: o emblema PAFIES sobre o tecido roxo.
// A foto original é o "set" filmado: nada da logo é redesenhado. O movimento vem de uma
// câmera virtual (pan, aproximação e inclinação de perspectiva), e a luz, os reflexos da
// borda e as sombras são camadas por cima da foto, presas às coordenadas dela.
// Uso: const ab = Abertura.criar(palco, config.abertura); ab.quadro(t) para t de 0 a duracao.
window.Abertura = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const sai = x => 1 - Math.pow(1 - x, 3);
  const entra = x => x * x * x;
  const vaiVem = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  // Spline suave (Catmull-Rom com tempos irregulares): a câmera nunca para de repente entre as marcas
  function trilho(chaves) {
    const n = chaves.length;
    const tan = chaves.map((k, i) => {
      if (i === 0 || i === n - 1) return k.v.map(() => 0);
      const a = chaves[i - 1], b = chaves[i + 1];
      return k.v.map((_, j) => (b.v[j] - a.v[j]) / (b.t - a.t));
    });
    return t => {
      if (t <= chaves[0].t) return chaves[0].v.slice();
      if (t >= chaves[n - 1].t) return chaves[n - 1].v.slice();
      let i = 0;
      while (t > chaves[i + 1].t) i++;
      const a = chaves[i], b = chaves[i + 1], h = b.t - a.t, s = (t - a.t) / h;
      const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
      return a.v.map((_, j) => h00 * a.v[j] + h10 * h * tan[i][j] + h01 * b.v[j] + h11 * h * tan[i + 1][j]);
    };
  }

  function criar(palco, A) {
    const E = A.emblema, M = A.mergulho;
    const raiz = document.createElement("div");
    raiz.id = "abertura";
    raiz.innerHTML = `
      <div class="ab-plano">
        <img class="ab-lado ab-esq" src="${A.imagem}" alt="">
        <img class="ab-lado ab-dir" src="${A.imagem}" alt="">
        <img class="ab-foto" src="${A.imagem}" alt="">
        <div class="ab-feixe"></div>
        <div class="ab-sombra-emblema"></div>
        <div class="ab-recorte"></div>
        <div class="ab-varredura"></div>
        <div class="ab-borda"></div>
      </div>
      <div class="ab-escuro"></div>
      <div class="ab-reflexo"></div>
      <div class="ab-texto"><div class="ab-linha tit"></div><div class="ab-ano tit"></div></div>
      <div class="ab-vinheta"></div>`;
    palco.appendChild(raiz);
    const q = s => raiz.querySelector(s);
    const plano = q(".ab-plano"), foto = q(".ab-foto"), lados = [...raiz.querySelectorAll(".ab-lado")], feixe = q(".ab-feixe"), sombraEmb = q(".ab-sombra-emblema");
    const recorte = q(".ab-recorte"), varredura = q(".ab-varredura"), borda = q(".ab-borda");
    const escuro = q(".ab-escuro"), reflexo = q(".ab-reflexo"), texto = q(".ab-texto"), vinheta = q(".ab-vinheta");
    const linha = q(".ab-linha"), ano = q(".ab-ano");
    linha.innerHTML = [...A.texto].map(ch => `<span>${ch === " " ? "&nbsp;" : ch}</span>`).join("");
    ano.textContent = A.ano;
    const letras = [...linha.children];

    // camadas presas ao emblema (coordenadas da foto)
    const caixa = (el, r) => Object.assign(el.style, { left: E.x - r + "px", top: E.y - r * E.achatado + "px", width: 2 * r + "px", height: 2 * r * E.achatado + "px" });
    caixa(sombraEmb, E.borda * 1.6);
    caixa(recorte, E.borda * 3.2);
    caixa(varredura, E.r);
    caixa(borda, E.borda + 4);
    // anel da borda metálica: só a faixa entre o azul e a borda externa recebe o reflexo
    const anelIn = (E.r - 2) / (E.borda + 4) * 50, anelOut = (E.borda + 2) / (E.borda + 4) * 50;
    const mascAnel = `radial-gradient(closest-side, transparent ${anelIn * 2 - 1}%, #000 ${anelIn * 2 + 1}%, #000 ${anelOut * 2 - 1}%, transparent ${anelOut * 2 + 1}%)`;
    borda.style.webkitMaskImage = borda.style.maskImage = mascAnel;
    // escurece o tecido em volta do emblema
    const rIn = E.borda * 1.05 / (E.borda * 3.2) * 100;
    recorte.style.background = `radial-gradient(closest-side, transparent ${rIn}%, rgba(4,0,14,.62) ${rIn + 9}%, rgba(2,0,8,.9) ${rIn + 24}%, rgba(2,0,8,.96) 100%)`;

    // Câmera: foco (x, y na foto), zoom em log, inclinação X e Y (graus), desfoque
    const yCentro = E.y + 95; // o emblema fica um pouco acima do centro da tela para caber o texto
    const cam = trilho([
      { t: 0.0, v: [250, 290, Math.log(2.5), 16, -12, 7] },
      { t: 1.9, v: [330, 440, Math.log(2.15), 11, -7, 0] },
      { t: 3.4, v: [520, 640, Math.log(1.5), 6, 7, 0] },
      { t: A.impacto, v: [E.x, yCentro, Math.log(1.2), 2, -2.5, 0] },
      { t: 6.3, v: [E.x, yCentro - 6, Math.log(1.27), 0, 0, 0] },
    ]);

    function quadro(t) {
      const D = A.duracao;
      if (t >= D + 1) { raiz.style.display = "none"; return; }
      raiz.style.display = "";
      let [fx, fy, lz, rx, ry, blur] = cam(t);
      let z = Math.exp(lz);
      // CENA 4: mergulho no azul do emblema
      const mergulho = entra(prog(t, 6.35, 7.7));
      if (mergulho > 0) {
        fx += (M.x - fx) * sai(prog(t, 6.35, 7.2));
        fy += (M.y - fy) * sai(prog(t, 6.35, 7.2));
        z *= Math.exp(Math.log(34) * mergulho);
        blur += 10 * prog(t, 7.0, 7.8);
      }
      // respiração da câmera na mão (bem sutil)
      fx += Math.sin(t * 1.3) * 3 / z; fy += Math.cos(t * 1.1) * 2.4 / z;
      plano.style.transform = `translate(960px, 540px) perspective(1500px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${z.toFixed(4)}) translate(${(-fx).toFixed(2)}px, ${(-fy).toFixed(2)}px)`;
      // foco que se ajusta (rack focus) e um leve "pulso" de luz no impacto
      const pulso = t > A.impacto ? Math.exp(-(t - A.impacto) * 3.2) : 0;
      foto.style.filter = `blur(${(blur / Math.sqrt(z) * 1.2).toFixed(2)}px) brightness(${(1 + .18 * pulso).toFixed(3)}) contrast(${(1.04 + .06 * pulso).toFixed(3)})`;
      // o tecido continua para os lados (a foto é vertical): cópias espelhadas, um pouco mais escuras e desfocadas
      lados.forEach(l => (l.style.filter = `blur(${(2.5 + blur / Math.sqrt(z) * 1.2).toFixed(2)}px) brightness(.72)`));

      // CENA 1: luz violeta revela o tecido e um feixe percorre as fibras
      const revela = sai(prog(t, .15, 2.4));
      const lx = 30 + 40 * prog(t, 0, 3), ly = 35 + 15 * prog(t, 0, 3);
      escuro.style.background = `radial-gradient(ellipse 60% 70% at ${lx}% ${ly}%, rgba(3,0,10,${(1 - revela).toFixed(3)}) 0%, rgba(2,0,6,${(1 - revela * .75).toFixed(3)}) 100%)`;
      escuro.style.opacity = (1 - sai(prog(t, 2.2, 4))).toFixed(3);
      const pf = prog(t, .5, 3.2);
      feixe.style.backgroundPosition = `${(-60 + 180 * pf).toFixed(2)}% 0`;
      feixe.style.opacity = (Math.sin(Math.PI * pf) * .9).toFixed(3);

      // CENA 2: o emblema sai da sombra
      sombraEmb.style.opacity = (1 - sai(prog(t, 1.8, 3.6))).toFixed(3);
      // brilho delicado percorrendo a borda (2,6 a 3,8 s) e o reflexo forte no impacto
      const passe1 = prog(t, 2.6, 3.9), passe2 = prog(t, A.impacto - .15, A.impacto + .75), passe3 = prog(t, 5.6, 6.5);
      const ang = passe2 > 0 && passe2 < 1 ? -40 + 300 * sai(passe2) : passe3 > 0 && passe3 < 1 ? 120 + 200 * passe3 : -120 + 320 * vaiVem(passe1);
      const opBorda = Math.max(Math.sin(Math.PI * passe1) * .75, Math.sin(Math.PI * passe2) * 1, Math.sin(Math.PI * passe3) * .5);
      borda.style.background = `conic-gradient(from ${ang.toFixed(1)}deg, transparent 0deg, transparent 290deg, rgba(220,235,255,.55) 318deg, #fff 330deg, rgba(200,220,255,.5) 342deg, transparent 360deg)`;
      borda.style.opacity = opBorda.toFixed(3);
      // reflexo atravessando o esmalte no impacto
      const pv = prog(t, A.impacto - .1, A.impacto + .9);
      varredura.style.backgroundPosition = `${(-80 + 220 * pv).toFixed(1)}% 0`;
      varredura.style.opacity = (Math.sin(Math.PI * pv) * .55).toFixed(3);

      // CENA 3: o fundo roxo escurece para destacar a identidade
      recorte.style.opacity = (sai(prog(t, 3.6, 5.4)) * (1 - mergulho)).toFixed(3);
      vinheta.style.opacity = (.75 + .25 * prog(t, 3.6, 5.4)).toFixed(3);

      // Texto: entra letra a letra logo depois do impacto e sai antes do mergulho
      const tIn = A.impacto + .35;
      letras.forEach((l, i) => {
        const e = sai(prog(t, tIn + i * .025, tIn + .55 + i * .025));
        l.style.opacity = e.toFixed(3);
        l.style.transform = `translateY(${(14 * (1 - e)).toFixed(2)}px)`;
      });
      const eAno = sai(prog(t, tIn + .7, tIn + 1.3));
      ano.style.opacity = eAno.toFixed(3);
      ano.style.transform = `translateY(${(12 * (1 - eAno)).toFixed(2)}px)`;
      texto.style.opacity = (1 - vaiVem(prog(t, 6.15, 6.7))).toFixed(3);
      linha.style.letterSpacing = (.14 - .04 * sai(prog(t, tIn, tIn + 1.6))).toFixed(4) + "em";

      // CENA 4: um reflexo metálico atravessa a tela e o azul se dissolve na primeira cena
      const pr = prog(t, 7.15, 7.85);
      reflexo.style.backgroundPosition = `${(-50 + 200 * pr).toFixed(1)}% 0`;
      reflexo.style.opacity = (Math.sin(Math.PI * pr) * .8).toFixed(3);
      raiz.style.opacity = (1 - vaiVem(prog(t, D - .45, D + .7))).toFixed(3);
    }

    return { quadro, raiz, pronto: foto.decode ? foto.decode().catch(() => {}) : Promise.resolve() };
  }

  return { criar };
})();
