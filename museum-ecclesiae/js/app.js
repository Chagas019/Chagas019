/* MUSEUM ECCLESIAE — lógica compartilhada e renderização por página.
   Sem dependências; os dados vêm de js/data.js (window.ME_DATA). */
(function () {
  "use strict";
  var D = window.ME_DATA || { artworks: [], exhibitions: [], saints: [], periods: [], timeline: [] };
  var page = document.body.getAttribute("data-page");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CATS = [
    { id: "pintura", name: "Pinturas", one: "Pintura", text: "Afrescos, retábulos e telas que narram a fé com a luz e a cor de cada época." },
    { id: "escultura", name: "Esculturas", one: "Escultura", text: "Mármore, madeira e bronze: a forma humana como lugar do sagrado." },
    { id: "arquitetura", name: "Arquitetura", one: "Arquitetura", text: "Catedrais e basílicas pensadas como imagem da Jerusalém celeste." },
    { id: "manuscrito", name: "Manuscritos", one: "Manuscrito", text: "Códices iluminados e livros que guardaram a Escritura e a liturgia." },
    { id: "liturgico", name: "Objetos litúrgicos", one: "Objeto litúrgico", text: "Cálices, relicários e alfaias feitos para o culto." }
  ];
  var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  /* ---------- utilidades ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var byId = {};
  D.artworks.forEach(function (a) { byId[a.id] = a; });
  function art(id) { return byId[id]; }
  function arts(ids) { return (ids || []).map(art).filter(Boolean); }
  function cat(id) { return CATS.filter(function (c) { return c.id === id; })[0]; }
  function param(k) { return new URLSearchParams(location.search).get(k); }
  function img(a, cls, eager) {
    return '<img src="' + esc(a.image) + '" alt="' + esc(a.title + (a.artist ? ", " + a.artist : "")) + '"' +
      (a.w ? ' width="' + a.w + '" height="' + a.h + '"' : "") + (eager ? "" : ' loading="lazy"') + ' decoding="async"' + (cls ? ' class="' + cls + '"' : "") + ">";
  }
  var ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5"/></svg>';
  var ARROW_L = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M14 8H2M7 3 2 8l5 5"/></svg>';
  var CLOSE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13"/></svg>';

  /* ---------- cabeçalho e rodapé ---------- */
  var NAV = [
    ["index.html", "Início", "home"],
    ["exposicoes.html", "Exposições", "exposicoes"],
    ["santos.html", "Santos", "santos"],
    ["historia.html", "História da Igreja", "historia"],
    ["arte-sacra.html", "Arte Sacra", "arte"]
  ];
  function shell() {
    var h = $("#site-header");
    if (h) {
      h.className = "site-header";
      h.innerHTML =
        '<a class="brand" href="index.html" aria-label="Museum Ecclesiae, página inicial">MUSEUM <span>/ ECCLESIAE</span></a>' +
        '<nav class="nav" id="nav" aria-label="Principal">' +
        NAV.map(function (n) { return '<a href="' + n[0] + '"' + (page === n[2] ? ' aria-current="page"' : "") + ">" + n[1] + "</a>"; }).join("") +
        '<a class="pill" href="exposicoes.html">Visitar o acervo</a></nav>' +
        '<button class="circle menu-btn" id="menu-btn" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu">' +
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 5h12M2 11h12"/></svg></button>';
      var btn = $("#menu-btn"), nav = $("#nav");
      function setMenu(open) {
        nav.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", String(open));
        btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
        btn.innerHTML = open ? CLOSE : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 5h12M2 11h12"/></svg>';
        document.body.style.overflow = open ? "hidden" : "";
      }
      btn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
      $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); btn.focus(); } });
      var onScroll = function () { h.classList.toggle("scrolled", window.scrollY > 40); };
      window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    }
    var f = $("#site-footer");
    if (f) {
      f.className = "site-footer";
      f.innerHTML =
        '<div class="wrap"><p class="display big" aria-hidden="true">Ecclesiae</p>' +
        '<div class="foot-grid"><div><h3>Sobre o museu</h3><p>Museum Ecclesiae é um museu digital dedicado à história, à arte e ao patrimônio da Igreja Católica. ' +
        "As imagens do acervo são obras em domínio público ou sob licença livre, com autoria, licença e origem indicadas em cada ficha.</p></div>" +
        '<div><h3>Visite</h3><ul>' + NAV.slice(1).map(function (n) { return '<li><a href="' + n[0] + '">' + n[1] + "</a></li>"; }).join("") + "</ul></div>" +
        '<div><h3>Coleções</h3><ul>' + CATS.map(function (c) { return '<li><a href="arte-sacra.html?c=' + c.id + '">' + c.name + "</a></li>"; }).join("") + "</ul></div></div>" +
        '<div class="foot-bottom"><span>© ' + new Date().getFullYear() + " Museum Ecclesiae — projeto cultural sem fins lucrativos.</span>" +
        '<span>Imagens: Wikimedia Commons (créditos em cada obra).</span></div></div>';
    }
  }

  /* ---------- revelação ao rolar ---------- */
  function reveals() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window) || reduced) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- ficha da obra (lightbox) ---------- */
  var LB = { list: [], i: 0, el: null, last: null };
  function lbBuild() {
    var el = document.createElement("div");
    el.className = "lightbox"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Ficha da obra"); el.hidden = true;
    el.innerHTML = '<button class="circle lb-close" aria-label="Fechar">' + CLOSE + "</button>" +
      '<button class="circle lb-prev" aria-label="Obra anterior">' + ARROW_L + "</button>" +
      '<button class="circle lb-next" aria-label="Próxima obra">' + ARROW + "</button>" +
      '<div class="lb-img"></div><div class="lb-info" tabindex="-1"></div>';
    document.body.appendChild(el);
    $(".lb-close", el).addEventListener("click", lbClose);
    $(".lb-prev", el).addEventListener("click", function () { lbGo(-1); });
    $(".lb-next", el).addEventListener("click", function () { lbGo(1); });
    el.addEventListener("click", function (e) { if (e.target === el || e.target.classList.contains("lb-img")) lbClose(); });
    document.addEventListener("keydown", function (e) {
      if (!el.classList.contains("open")) return;
      if (e.key === "Escape") lbClose();
      else if (e.key === "ArrowRight") lbGo(1);
      else if (e.key === "ArrowLeft") lbGo(-1);
      else if (e.key === "Tab") { // mantém o foco dentro do diálogo
        var f = $$("button, a[href]", el).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    LB.el = el;
  }
  function factsHtml(a) {
    var c = cat(a.category);
    var rows = [["Autor", a.artist], ["Data", a.date], ["Técnica", a.medium], ["Local", a.location], ["Coleção", c && c.one]];
    return '<dl class="facts">' + rows.filter(function (r) { return r[1]; }).map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>";
  }
  function creditHtml(a) {
    return '<p class="credit">' + esc(a.credit || "") + (a.sourceUrl ? ' — <a href="' + esc(a.sourceUrl) + '" target="_blank" rel="noopener">ver fonte</a>' : "") + "</p>";
  }
  function lbRender() {
    var a = LB.list[LB.i]; if (!a) return;
    $(".lb-img", LB.el).innerHTML = img(a, "", true);
    $(".lb-info", LB.el).innerHTML = '<p class="kicker">' + (LB.list.length > 1 ? (LB.i + 1) + " / " + LB.list.length : "Ficha da obra") + "</p>" +
      "<h2>" + esc(a.title) + "</h2><p>" + esc(a.artist || "") + "</p>" + factsHtml(a) + "<p>" + esc(a.description) + "</p>" + creditHtml(a);
    var multi = LB.list.length > 1;
    $(".lb-prev", LB.el).hidden = !multi; $(".lb-next", LB.el).hidden = !multi;
  }
  function lbOpen(list, i) {
    if (!LB.el) lbBuild();
    LB.list = list; LB.i = i || 0; LB.last = document.activeElement;
    LB.el.hidden = false; lbRender();
    void LB.el.offsetWidth; // força o layout para a transição de entrada
    LB.el.classList.add("open"); $(".lb-close", LB.el).focus();
    document.body.style.overflow = "hidden";
  }
  function lbClose() {
    LB.el.classList.remove("open"); document.body.style.overflow = "";
    setTimeout(function () { if (!LB.el.classList.contains("open")) LB.el.hidden = true; }, 400);
    if (LB.last && LB.last.focus) LB.last.focus();
  }
  function lbGo(d) { LB.i = (LB.i + d + LB.list.length) % LB.list.length; lbRender(); }
  /* qualquer [data-art] abre a ficha; [data-group] define a sequência navegável */
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-art]"); if (!t) return;
    e.preventDefault();
    var g = t.getAttribute("data-group");
    var nodes = g ? $$('[data-art][data-group="' + g + '"]') : [t];
    var list = nodes.map(function (n) { return art(n.getAttribute("data-art")); }).filter(Boolean);
    lbOpen(list, Math.max(0, nodes.indexOf(t)));
  });

  /* ---------- pré-visualização ao passar o mouse (listas editoriais) ---------- */
  function hoverPreview(list) {
    if (!list || !window.matchMedia("(hover: hover)").matches) return;
    var box = document.createElement("div"); box.className = "hover-preview"; box.setAttribute("aria-hidden", "true");
    document.body.appendChild(box);
    var x = 0, y = 0, tx = 0, ty = 0, raf;
    function loop() { x += (tx - x) * .18; y += (ty - y) * .18; box.style.left = x + "px"; box.style.top = y + "px"; raf = requestAnimationFrame(loop); }
    list.addEventListener("mousemove", function (e) { tx = e.clientX + 150; ty = e.clientY; });
    $$("a[data-preview]", list).forEach(function (a) {
      a.addEventListener("mouseenter", function (e) {
        box.innerHTML = '<img src="' + esc(a.getAttribute("data-preview")) + '" alt="">';
        x = tx = e.clientX + 150; y = ty = e.clientY;
        box.classList.add("on"); cancelAnimationFrame(raf); loop();
      });
      a.addEventListener("mouseleave", function () { box.classList.remove("on"); cancelAnimationFrame(raf); });
    });
  }

  /* =========================================================
     PÁGINA INICIAL
     ========================================================= */
  function home() {
    var stage = $("#stage");
    // Cenas do palco: palavra escura + palavra gigante em terracota atrás da obra.
    var picks = [
      { cat: "escultura", kicker: "Capítulo I", dark: "Fides", giant: "Ecclesiae", copy: "Dois mil anos de fé contados pela arte, pelos santos e pelos documentos que formaram a Igreja.", cta: ["Entrar no museu", "exposicoes.html"] },
      { cat: "pintura", kicker: "Capítulo II", dark: "Ars", giant: "Sacra", copy: "Pinturas, esculturas, manuscritos e objetos litúrgicos reunidos em coleções comentadas.", cta: ["Ver arte sacra", "arte-sacra.html"] },
      { cat: "arquitetura", kicker: "Capítulo III", dark: "Lumen", giant: "Historia", copy: "Da comunidade dos Apóstolos ao Concílio Vaticano II, uma linha do tempo com fontes.", cta: ["Abrir a história", "historia.html"] }
    ];
    var used = {};
    var scenes = picks.map(function (p) {
      var a = D.artworks.filter(function (x) { return x.category === p.cat && !used[x.id]; })[0] || D.artworks[0];
      if (a) used[a.id] = 1;
      return { p: p, a: a };
    }).filter(function (s) { return s.a; });

    if (stage && scenes.length) {
      var sticky = $(".stage-sticky", stage);
      sticky.innerHTML = scenes.map(function (s, i) {
        return '<div class="scene' + (i === 0 ? " active" : "") + '" aria-hidden="' + (i !== 0) + '">' +
          '<div class="scene-bg"></div>' +
          '<p class="display giant" aria-hidden="true">' + esc(s.p.giant) + "</p>" +
          '<figure class="arch scene-object" style="margin:0">' + img(s.a, "", i === 0) + "</figure>" +
          '<div class="scene-copy"><p class="kicker">' + s.p.kicker + "</p>" +
          (i === 0 ? '<h1 class="display">' : '<h2 class="display">') + esc(s.p.dark) + (i === 0 ? "</h1>" : "</h2>") +
          "<p>" + esc(s.p.copy) + '</p><div class="cta-row"><a class="pill" href="' + s.p.cta[1] + '">' + s.p.cta[0] + "</a>" +
          '<a class="circle" href="' + s.p.cta[1] + '" aria-label="' + esc(s.p.cta[0]) + '" tabindex="-1">' + ARROW + "</a></div></div>" +
          '<span class="scene-arrow" aria-hidden="true"></span>' +
          '<p class="scene-meta"><strong>' + esc(s.a.title) + "</strong>" + esc([s.a.artist, s.a.date].filter(Boolean).join(", ")) + "</p></div>";
      }).join("") +
        '<div class="stage-progress" role="group" aria-label="Capítulos">' + scenes.map(function (s, i) {
          return '<button aria-label="' + s.p.kicker + '"' + (i === 0 ? ' aria-current="true"' : "") + "></button>";
        }).join("") + '</div><p class="scroll-hint" aria-hidden="true">Role para explorar</p>';

      var sceneEls = $$(".scene", sticky), dots = $$(".stage-progress button", sticky), cur = 0;
      dots.forEach(function (b, i) {
        b.addEventListener("click", function () {
          var top = stage.offsetTop + (stage.offsetHeight - innerHeight) * ((i + .5) / scenes.length);
          window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
        });
      });
      var tick = function () {
        var r = stage.getBoundingClientRect();
        var total = stage.offsetHeight - innerHeight;
        var p = Math.min(1, Math.max(0, -r.top / total));
        var idx = Math.min(scenes.length - 1, Math.floor(p * scenes.length));
        if (idx !== cur) {
          sceneEls[cur].classList.remove("active"); sceneEls[cur].setAttribute("aria-hidden", "true");
          sceneEls[idx].classList.add("active"); sceneEls[idx].setAttribute("aria-hidden", "false");
          dots[cur].removeAttribute("aria-current"); dots[idx].setAttribute("aria-current", "true");
          cur = idx;
        }
        if (reduced) return;
        var local = p * scenes.length - idx; // 0..1 dentro da cena
        var el = sceneEls[idx];
        el.style.setProperty("--shift", ((.5 - local) * innerWidth * .35).toFixed(1));
        el.style.setProperty("--lift", ((.5 - local) * 60).toFixed(1));
        el.style.setProperty("--scale", (1 + Math.sin(local * Math.PI) * .06).toFixed(3));
      };
      var ticking = false;
      window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { tick(); ticking = false; }); } }, { passive: true });
      window.addEventListener("resize", tick); tick();
    }

    // Exposição em destaque
    var fx = $("#featured"), ex = D.exhibitions[0];
    if (fx && ex) {
      var ea = arts(ex.artworks), cover = ea[0];
      fx.innerHTML = '<div class="feature-media reveal"><div class="arch">' + (cover ? img(cover) : "") + '</div><span class="stamp">Exposição em destaque</span></div>' +
        '<div class="reveal"><p class="kicker">' + esc(ex.kicker) + " · " + esc(ex.period) + '</p><h2 class="display">' + esc(ex.title) + '</h2><p class="lede">' + esc(ex.intro) + "</p>" +
        '<ul class="feature-list">' + ea.slice(0, 4).map(function (a) { return "<li><span>" + esc(a.title) + "</span><span>" + esc(a.date || "") + "</span></li>"; }).join("") + "</ul>" +
        '<div class="cta-row"><a class="pill" href="exposicoes.html?e=' + esc(ex.id) + '">Começar a visita</a><a class="circle" href="exposicoes.html?e=' + esc(ex.id) + '" aria-label="Começar a visita: ' + esc(ex.title) + '" tabindex="-1">' + ARROW + "</a></div></div>";
    }

    // Coleções
    var cl = $("#collections");
    if (cl) {
      cl.innerHTML = CATS.map(function (c, i) {
        var list = D.artworks.filter(function (a) { return a.category === c.id; });
        var pv = list[0];
        return '<li><a href="arte-sacra.html?c=' + c.id + '"' + (pv ? ' data-preview="' + esc(pv.image) + '"' : "") + '><span class="num">0' + (i + 1) + '</span><span class="name">' + c.name + '</span><span class="meta">' + list.length + " obras</span></a></li>";
      }).join("");
      hoverPreview(cl);
    }

    // Destaques artísticos (faixa horizontal)
    var st = $("#strip");
    if (st) {
      var hl = D.artworks.filter(function (a) { return !used[a.id]; }).filter(function (_, i) { return i % 2 === 0; }).slice(0, 8);
      st.innerHTML = hl.map(function (a) {
        return '<a class="strip-item" href="#" data-art="' + esc(a.id) + '" data-group="strip"><figure><div class="frame">' + img(a) + '</div><figcaption><div class="t">' + esc(a.title) + '</div><div class="s">' + esc([a.artist, a.date].filter(Boolean).join(" · ")) + "</div></figcaption></figure></a>";
      }).join("");
      $$("[data-strip]").forEach(function (b) {
        b.addEventListener("click", function () { st.scrollBy({ left: (+b.getAttribute("data-strip")) * st.clientWidth * .8, behavior: reduced ? "auto" : "smooth" }); });
      });
    }

    // Destaques históricos
    var yr = $("#years");
    if (yr && D.timeline.length) {
      var n = D.timeline.length, pickIdx = [0, Math.floor(n * .3), Math.floor(n * .6), n - 1];
      yr.innerHTML = pickIdx.map(function (i) {
        var t = D.timeline[i];
        return '<a href="historia.html#' + esc(t.period) + '"><div class="y">' + esc(t.label) + '</div><div class="t">' + esc(t.title) + "</div><p>" + esc(t.text.split(". ")[0].replace(/\.$/, "")) + ".</p></a>";
      }).join("");
    }
  }

  /* =========================================================
     EXPOSIÇÕES
     ========================================================= */
  function exposicoes() {
    var id = param("e"), root = $("#content");
    var ex = id && D.exhibitions.filter(function (x) { return x.id === id && arts(x.artworks).length; })[0];
    if (!ex) {
      if (id) history.replaceState(null, "", "exposicoes.html");
      root.innerHTML =
        '<header class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Início</a> / Exposições</p><div class="row">' +
        '<h1 class="display">Exposições<br><span class="terra">temáticas</span></h1><p class="lede">' + D.exhibitions.length + " percursos curados pelo acervo. Cada exposição é uma visita guiada, peça a peça, com descrição histórica e ficha técnica.</p></div></div></header>" +
        '<div class="wrap"><div class="expo-list">' + D.exhibitions.map(function (x) {
          var ea = arts(x.artworks);
          return '<a class="expo reveal" href="exposicoes.html?e=' + esc(x.id) + '"><div class="expo-media"><div class="arch">' + (ea[0] ? img(ea[0]) : "") + '</div><div class="thumbs" aria-hidden="true">' +
            ea.slice(1, 4).map(function (a) { return "<span>" + img(a) + "</span>"; }).join("") + "</div></div>" +
            '<div><p class="kicker">' + esc(x.kicker) + " · " + esc(x.period) + '</p><h2 class="display">' + esc(x.title) + '</h2><p class="lede">' + esc(x.intro) + '</p><span class="cta-row"><span class="pill">Visitar · ' + ea.length + " obras</span></span></div></a>";
        }).join("") + "</div></div>";
      document.title = "Exposições — Museum Ecclesiae";
      return;
    }
    var list = arts(ex.artworks), i = Math.min(list.length - 1, Math.max(0, (parseInt(param("p"), 10) || 1) - 1));
    document.title = ex.title + " — Museum Ecclesiae";
    root.innerHTML = '<section class="viewer" aria-label="Visita à exposição">' +
      '<div class="viewer-top"><div><p class="crumbs"><a href="exposicoes.html">Exposições</a> / ' + esc(ex.kicker) + '</p><h1 class="display">' + esc(ex.title) + "</h1></div>" +
      '<a class="pill" href="exposicoes.html">Todas as exposições</a></div>' +
      '<div class="viewer-body"><div class="viewer-img"><button id="v-zoom" aria-label="Ampliar obra e ver ficha"></button></div><article class="piece" id="v-piece" aria-live="polite"></article></div>' +
      '<div class="viewer-nav"><button class="circle" id="v-prev" aria-label="Obra anterior">' + ARROW_L + '</button><span class="counter" id="v-count"></span>' +
      '<button class="circle" id="v-next" aria-label="Próxima obra">' + ARROW + '</button><div class="dots" role="group" aria-label="Obras da exposição">' +
      list.map(function (a, k) { return '<button aria-label="Obra ' + (k + 1) + ": " + esc(a.title) + '"></button>'; }).join("") + "</div></div></section>" +
      nextExpo(ex);
    var zoom = $("#v-zoom"), piece = $("#v-piece"), dots = $$(".dots button");
    function show(k, dir) {
      i = (k + list.length) % list.length;
      var a = list[i], old = $("img", zoom);
      var put = function () {
        zoom.innerHTML = img(a, dir ? "swap" : "", true);
        zoom.setAttribute("aria-label", "Ampliar " + a.title + " e ver ficha");
        var im = $("img", zoom);
        im.style.setProperty("--dir", (dir || 1) * 30 + "px");
        requestAnimationFrame(function () { requestAnimationFrame(function () { im.classList.remove("swap"); }); });
      };
      if (old && dir && !reduced) { old.style.setProperty("--dir", -dir * 30 + "px"); old.classList.add("swap"); setTimeout(put, 280); } else put();
      piece.innerHTML = '<div class="piece-num" aria-hidden="true">' + (ROMAN[i] || i + 1) + '</div><h2>' + esc(a.title) + '</h2><p class="by">' + esc([a.artist, a.date].filter(Boolean).join(", ")) + "</p><p>" + esc(a.description) + "</p>" + factsHtml(a) + creditHtml(a);
      $("#v-count").textContent = (i + 1) + " / " + list.length;
      dots.forEach(function (d, k) { if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
      history.replaceState(null, "", "exposicoes.html?e=" + encodeURIComponent(ex.id) + "&p=" + (i + 1));
    }
    $("#v-prev").addEventListener("click", function () { show(i - 1, -1); });
    $("#v-next").addEventListener("click", function () { show(i + 1, 1); });
    dots.forEach(function (d, k) { d.addEventListener("click", function () { show(k, k > i ? 1 : -1); }); });
    zoom.addEventListener("click", function () { lbOpen(list, i); });
    document.addEventListener("keydown", function (e) {
      if (LB.el && LB.el.classList.contains("open")) return;
      if (e.target.closest && e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") show(i + 1, 1); else if (e.key === "ArrowLeft") show(i - 1, -1);
    });
    var sx = null; // gesto de deslizar no celular
    zoom.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    zoom.addEventListener("touchend", function (e) {
      if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) { show(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); zoom.dataset.swiped = "1"; setTimeout(function () { zoom.dataset.swiped = ""; }, 50); }
    });
    zoom.addEventListener("click", function (e) { if (zoom.dataset.swiped) e.stopImmediatePropagation(); }, true);
    show(i, 0);
  }
  function nextExpo(ex) {
    var k = D.exhibitions.indexOf(ex), nx = D.exhibitions[(k + 1) % D.exhibitions.length], pv = D.exhibitions[(k - 1 + D.exhibitions.length) % D.exhibitions.length];
    if (nx === ex) return "";
    return '<div class="wrap"><nav class="pager" aria-label="Outras exposições"><a href="exposicoes.html?e=' + esc(pv.id) + '"><span class="kicker">← Exposição anterior</span><span class="n">' + esc(pv.title) + "</span></a>" +
      '<a href="exposicoes.html?e=' + esc(nx.id) + '"><span class="kicker">Próxima exposição →</span><span class="n">' + esc(nx.title) + "</span></a></nav></div>";
  }

  /* =========================================================
     SANTOS
     ========================================================= */
  function santos() {
    var id = param("s"), root = $("#content");
    var s = id && D.saints.filter(function (x) { return x.id === id; })[0];
    if (!s) {
      if (id) history.replaceState(null, "", "santos.html");
      root.innerHTML = '<header class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Início</a> / Santos</p><div class="row">' +
        '<h1 class="display">Santos &amp;<br><span class="terra">testemunhas</span></h1><p class="lede">Biografias, contexto histórico e obras de arte que guardam a memória de homens e mulheres que marcaram a história da Igreja.</p></div></div></header>' +
        '<div class="wrap"><ul class="index-list" id="saints-list">' + D.saints.map(function (x, k) {
          var a = art(x.image) || arts(x.artworks)[0];
          return '<li class="reveal"><a href="santos.html?s=' + esc(x.id) + '"' + (a ? ' data-preview="' + esc(a.image) + '"' : "") + '><span class="num">' + (k < 9 ? "0" : "") + (k + 1) + '</span><span class="name">' + esc(x.name) + '</span><span class="meta">' + esc(x.epithet) + "<br>" + esc(x.dates) + "</span></a></li>";
        }).join("") + "</ul></div>";
      hoverPreview($("#saints-list"));
      document.title = "Santos — Museum Ecclesiae";
      return;
    }
    var k = D.saints.indexOf(s), pv = D.saints[(k - 1 + D.saints.length) % D.saints.length], nx = D.saints[(k + 1) % D.saints.length];
    var portrait = art(s.image) || arts(s.artworks)[0], rel = arts(s.artworks);
    document.title = s.name + " — Museum Ecclesiae";
    root.innerHTML = '<div class="wrap" style="padding-top:clamp(110px,13vw,170px)"><p class="crumbs"><a href="santos.html">Santos</a> / ' + esc(s.name) + "</p>" +
      '<article class="saint"><div class="saint-portrait">' + (portrait ? '<button class="arch" style="all:unset;position:absolute;inset:0;cursor:zoom-in;border-radius:999px 999px 6px 6px;overflow:hidden" data-art="' + esc(portrait.id) + '" aria-label="Ver ficha: ' + esc(portrait.title) + '">' + img(portrait, "", true).replace("<img ", '<img style="width:100%;height:100%;object-fit:cover" ') + "</button>" : "") + "</div>" +
      '<div><p class="kicker">' + esc(s.dates) + (s.feast ? " · Festa: " + esc(s.feast) : "") + '</p><h1 class="display">' + esc(s.name) + '</h1><p class="epithet serif-i">' + esc(s.epithet) + "</p>" +
      '<div class="bio"><p>' + esc(s.bio) + "</p></div><h2>Contexto histórico</h2><p>" + esc(s.context) + "</p>" +
      (rel.length ? '<h2>Obras relacionadas</h2><div class="related">' + rel.map(function (a) { return '<button data-art="' + esc(a.id) + '" data-group="rel"><div class="frame">' + img(a) + "</div><span>" + esc(a.title) + "</span></button>"; }).join("") + "</div>" : "") +
      '<h2>Fontes</h2><ul class="sources">' + (s.sources || []).map(function (x) { return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.label) + "</a></li>"; }).join("") + "</ul></div></article>" +
      '<nav class="pager" aria-label="Outros santos"><a href="santos.html?s=' + esc(pv.id) + '"><span class="kicker">← Anterior</span><span class="n">' + esc(pv.name) + '</span></a><a href="santos.html?s=' + esc(nx.id) + '"><span class="kicker">Próximo →</span><span class="n">' + esc(nx.name) + "</span></a></nav></div>";
  }

  /* =========================================================
     HISTÓRIA DA IGREJA
     ========================================================= */
  function historia() {
    var root = $("#content");
    root.innerHTML = '<header class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Início</a> / História da Igreja</p><div class="row">' +
      '<h1 class="display">História<br><span class="terra">da Igreja</span></h1><p class="lede">Uma linha do tempo de ' + D.timeline.length + " acontecimentos, organizada em " + D.periods.length + " períodos. Cada marco traz as referências consultadas.</p></div></div></header>" +
      '<nav class="period-nav" aria-label="Períodos"><div class="wrap">' + D.periods.map(function (p) { return '<a class="chip" href="#' + esc(p.id) + '" data-period="' + esc(p.id) + '">' + esc(p.name) + "</a>"; }).join("") + "</div></nav>" +
      '<div class="wrap">' + D.periods.map(function (p) {
        var ev = D.timeline.filter(function (t) { return t.period === p.id; });
        return '<section class="period" id="' + esc(p.id) + '" aria-labelledby="h-' + esc(p.id) + '"><div class="period-head reveal"><div><h2 class="display" id="h-' + esc(p.id) + '">' + esc(p.name) + '</h2><p class="range serif-i">' + esc(p.range) + '</p></div><p class="lede">' + esc(p.summary) + "</p></div>" +
          '<ol class="events">' + ev.map(function (t) {
            var a = art(t.artwork);
            return '<li class="event reveal"><div class="when">' + esc(t.label) + "</div><div><h3>" + esc(t.title) + "</h3><p>" + esc(t.text) + "</p>" +
              ((t.sources || []).length ? '<p class="src">Fontes: ' + t.sources.map(function (x) { return '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.label) + "</a>"; }).join(" · ") + "</p>" : "") + "</div>" +
              (a ? '<button class="thumb" data-art="' + esc(a.id) + '" aria-label="Ver ficha: ' + esc(a.title) + '"><div class="frame">' + img(a) + "</div><span>" + esc(a.title) + "</span></button>" : "<span></span>") + "</li>";
          }).join("") + "</ol></section>";
      }).join("") + "</div>";
    // destaca o período visível
    var chips = $$(".chip[data-period]");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (!e.isIntersecting) return;
          chips.forEach(function (c) {
            var on = c.getAttribute("data-period") === e.target.id;
            if (on) { c.setAttribute("aria-current", "true"); c.scrollIntoView({ block: "nearest", inline: "nearest" }); } else c.removeAttribute("aria-current");
          });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      $$(".period").forEach(function (p) { io.observe(p); });
    }
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 60); }
  }

  /* =========================================================
     ARTE SACRA
     ========================================================= */
  function arte() {
    var root = $("#content"), c = param("c");
    if (c && !cat(c)) c = null;
    root.innerHTML = '<header class="page-hero"><div class="wrap"><p class="crumbs"><a href="index.html">Início</a> / Arte Sacra</p><div class="row">' +
      '<h1 class="display">Arte<br><span class="terra">Sacra</span></h1><p class="lede">O acervo completo, organizado por suporte. Toque em uma obra para abrir a ficha com autoria, data, local, descrição e fonte.</p></div></div></header>' +
      '<div class="wrap"><div class="tabs" role="group" aria-label="Filtrar por coleção"><button class="chip" data-c="">Todas</button>' +
      CATS.map(function (x) { return '<button class="chip" data-c="' + x.id + '">' + x.name + "</button>"; }).join("") + '</div><div id="cat-intro"></div><div class="salon" id="salon"></div></div>';
    var chips = $$(".tabs .chip");
    function render(id) {
      chips.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-c") === (id || ""))); });
      var x = cat(id), list = D.artworks.filter(function (a) { return !id || a.category === id; });
      $("#cat-intro").innerHTML = '<div class="cat-intro"><p class="display">' + (x ? x.name : "Acervo") + "</p><p>" + (x ? x.text : "Todas as peças do museu, das catacumbas ao século XX.") + " <strong>" + list.length + " obras.</strong></p></div>";
      $("#salon").innerHTML = list.length ? list.map(function (a) {
        return '<button class="work" data-art="' + esc(a.id) + '" data-group="salon" aria-label="Ver ficha: ' + esc(a.title) + '"><div class="frame">' + img(a) + '</div><div class="cap"><div><div class="t">' + esc(a.title) + '</div><div class="s">' + esc(a.artist || "") + '</div></div><div class="d">' + esc(a.date || "") + "</div></div></button>";
      }).join("") : '<p class="empty">Nenhuma obra nesta coleção.</p>';
      history.replaceState(null, "", id ? "arte-sacra.html?c=" + id : "arte-sacra.html");
    }
    chips.forEach(function (b) { b.addEventListener("click", function () { render(b.getAttribute("data-c")); }); });
    render(c);
  }

  shell();
  ({ home: home, exposicoes: exposicoes, santos: santos, historia: historia, arte: arte }[page] || function () {})();
  reveals();
})();
