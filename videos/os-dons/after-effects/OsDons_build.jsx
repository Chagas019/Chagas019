/*  ============================================================
    OS DONS — construtor do projeto After Effects (ExtendScript)
    ------------------------------------------------------------
    Como usar:  After Effects > Arquivo > Scripts > Executar arquivo de script…
                e selecione este arquivo (OsDons_build.jsx).
    Requisitos: AE 2022+ (H.264 nativo no Render Queue a partir do AE 2023).
                Instale as fontes da pasta ../fonts antes (Anton, Playfair Display).
    O script cria: pastas, comps por cena, câmera 3D com profundidade de campo,
    partículas 3D, sólidos wireframe 3D, símbolos, raios de luz, tipografia
    cinética com animators, glow, motion blur, trilha com marcadores,
    fila de render em MP4 (H.264) e salva o .aep ao lado deste script.
    ============================================================ */
(function OsDons() {
    app.beginUndoGroup("OS DONS - construir projeto");

    var ROOT = new File($.fileName).parent;           // .../os-dons/after-effects
    var BASE = ROOT.parent;                            // .../os-dons
    var W = 1080, H = 1920, FPS = 30, DUR = 26;

    // ---------- paleta ----------
    function hex(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
    var RED = hex("#E50920"), DRED = hex("#65000D"), BLACK = hex("#080808"), WHITE = hex("#FFFFFF"), GOLD = hex("#F2B544");
    var FONT_DISPLAY = "Anton-Regular", FONT_ITALIC = "PlayfairDisplay-ExtraBoldItalic";

    // ---------- projeto ----------
    app.newProject();
    var P = app.project;
    P.bitsPerChannel = 16;
    var fComps = P.items.addFolder("01_COMPS"), fScenes = P.items.addFolder("02_CENAS"),
        fAudio = P.items.addFolder("03_AUDIO"), fSolids = P.items.addFolder("04_SOLIDOS"), fRef = P.items.addFolder("05_REFERENCIA");

    // ---------- utilidades ----------
    function dims(prop) {
        var t = prop.propertyValueType;
        if (t === PropertyValueType.ThreeD_SPATIAL || t === PropertyValueType.TwoD_SPATIAL) return 1;
        if (t === PropertyValueType.ThreeD) return 3;
        if (t === PropertyValueType.TwoD) return 2;
        return 1;
    }
    // keyframes com easing suave (influência alta = “expo”)
    function keys(prop, times, values, easeIn, easeOut) {
        easeIn = easeIn || 85; easeOut = easeOut || 85;
        for (var i = 0; i < times.length; i++) prop.setValueAtTime(times[i], values[i]);
        var n = dims(prop);
        for (var k = 1; k <= prop.numKeys; k++) {
            var a = [], b = [];
            for (var d = 0; d < n; d++) { a.push(new KeyframeEase(0, easeIn)); b.push(new KeyframeEase(0, easeOut)); }
            try { prop.setTemporalEaseAtKey(k, a, b); } catch (e) {}
        }
        return prop;
    }
    function fx(layer, match) { try { return layer.property("ADBE Effect Parade").addProperty(match); } catch (e) { return null; } }
    function setp(effect, match, v) { try { effect.property(match).setValue(v); } catch (e) {} }
    function glow(layer, radius, intensity) {
        var g = fx(layer, "ADBE Glo2");
        if (g) { setp(g, "ADBE Glo2-0002", 40 * 2.55); setp(g, "ADBE Glo2-0003", radius); setp(g, "ADBE Glo2-0004", intensity); }
        return g;
    }
    function solid(comp, color, name, w, h) {
        var l = comp.layers.addSolid(color, name, w || comp.width, h || comp.height, 1, comp.duration);
        try { l.source.parentFolder = fSolids; } catch (e) {}
        return l;
    }
    function ramp(layer, p1, c1, p2, c2, radial) {
        var r = fx(layer, "ADBE Ramp");
        if (!r) return;
        setp(r, "ADBE Ramp-0001", p1); setp(r, "ADBE Ramp-0002", c1);
        setp(r, "ADBE Ramp-0003", p2); setp(r, "ADBE Ramp-0004", c2);
        setp(r, "ADBE Ramp-0005", radial ? 2 : 1);
    }
    function opacityWindow(layer, a, b, fi, fo) {
        var o = layer.property("ADBE Transform Group").property("ADBE Opacity");
        keys(o, [a, a + fi, b - fo, b], [0, 100, 100, 0]);
    }

    // tipografia: cria texto centralizado
    function text(comp, str, font, size, color, x, y, tracking) {
        var l = comp.layers.addText(str);
        var sp = l.property("ADBE Text Properties").property("ADBE Text Document");
        var d = sp.value;
        d.resetCharStyle(); d.resetParagraphStyle();
        d.font = font; d.fontSize = size; d.applyFill = true; d.fillColor = color; d.applyStroke = false;
        d.tracking = tracking || 0; d.justification = ParagraphJustification.CENTER_JUSTIFY;
        sp.setValue(d);
        l.name = "TXT  " + str;
        // ancora no centro visual do texto
        var r = l.sourceRectAtTime(0, false);
        l.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([r.left + r.width / 2, r.top + r.height / 2]);
        l.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
        l.motionBlur = true;
        return l;
    }
    // animator de texto letra a letra (range selector com offset animado)
    // mode: "cascade" (posição Y + opacidade), "depth" (escala+rotação+desfoque), "flip" (escala X), "track" (tracking)
    function animateLetters(layer, t0, dur, mode, shapeIdx) {
        var anims = layer.property("ADBE Text Properties").property("ADBE Text Animators");
        var an = anims.addProperty("ADBE Text Animator");
        an.name = "IN_" + mode;
        var pr = an.property("ADBE Text Animator Properties");
        if (mode === "cascade") {
            pr.addProperty("ADBE Text Position 3D").setValue([0, 140, 0]);
            pr.addProperty("ADBE Text Opacity").setValue(0);
            pr.addProperty("ADBE Text Rotation").setValue(18);
        } else if (mode === "depth") {
            pr.addProperty("ADBE Text Scale 3D").setValue([500, 500, 100]);
            pr.addProperty("ADBE Text Opacity").setValue(0);
            pr.addProperty("ADBE Text Rotation").setValue(-45);
            pr.addProperty("ADBE Text Blur").setValue([40, 40]);
        } else if (mode === "flip") {
            pr.addProperty("ADBE Text Scale 3D").setValue([0, 100, 100]);
            pr.addProperty("ADBE Text Opacity").setValue(0);
        } else if (mode === "track") {
            pr.addProperty("ADBE Text Tracking Amount").setValue(120);
            pr.addProperty("ADBE Text Opacity").setValue(0);
            pr.addProperty("ADBE Text Blur").setValue([20, 0]);
        }
        var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        var adv = sel.property("ADBE Text Range Advanced");
        try { adv.property("ADBE Text Range Shape").setValue(shapeIdx || 2); } catch (e) {}   // 2 = Ramp Up
        try { adv.property("ADBE Text Levels Max Ease").setValue(80); adv.property("ADBE Text Levels Min Ease").setValue(40); } catch (e) {}
        keys(sel.property("ADBE Text Percent Offset"), [t0, t0 + dur], [-100, 100], 90, 70);
        return an;
    }
    // impacto: escala de "slam" + blur + opacidade
    function slam(layer, t0, from, dur) {
        var tr = layer.property("ADBE Transform Group");
        keys(tr.property("ADBE Scale"), [t0, t0 + (dur || .45)], [[from, from], [100, 100]], 95, 15);
        keys(tr.property("ADBE Opacity"), [t0, t0 + .12], [0, 100]);
    }
    function exitScale(layer, t0, t1, to) {
        var s = layer.property("ADBE Transform Group").property("ADBE Scale");
        var cur = s.valueAtTime(t0 - .01, false);
        keys(s, [t0, t1], [cur, [to, to]], 10, 95);
        var o = layer.property("ADBE Transform Group").property("ADBE Opacity");
        keys(o, [t1 - .15, t1], [100, 0]);
    }
    function shockRing(comp, name, x, y, t0, maxR, color) {
        var l = comp.layers.addShape(); l.name = name;
        var g = l.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var c = g.property("ADBE Vectors Group");
        var el = c.addProperty("ADBE Vector Shape - Ellipse");
        keys(el.property("ADBE Vector Ellipse Size"), [t0, t0 + .8], [[0, 0], [maxR * 2, maxR * 2]], 10, 95);
        var st = c.addProperty("ADBE Vector Graphic - Stroke");
        st.property("ADBE Vector Stroke Color").setValue(color);
        keys(st.property("ADBE Vector Stroke Width"), [t0, t0 + 1], [22, 1]);
        l.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
        keys(l.property("ADBE Transform Group").property("ADBE Opacity"), [t0, t0 + .05, t0 + 1.1], [0, 100, 0]);
        l.blendingMode = BlendingMode.ADD; glow(l, 40, 1.5);
        l.inPoint = t0; l.outPoint = t0 + 1.3;
        return l;
    }
    function lightSweep(comp, layerAbove, t0, t1) { // faixa de luz que atravessa o texto (track matte)
        var s = solid(comp, [1, .96, .86], "LUZ  varredura", 360, 2400);
        s.property("ADBE Transform Group").property("ADBE Rotate Z").setValue(18);
        keys(s.property("ADBE Transform Group").property("ADBE Position"), [t0, t1], [[-300, H / 2], [W + 300, H / 2]], 60, 60);
        var b = fx(s, "ADBE Gaussian Blur 2"); setp(b, "ADBE Gaussian Blur 2-0001", 120);
        s.blendingMode = BlendingMode.ADD;
        s.moveBefore(layerAbove);
        try { s.setTrackMatte(layerAbove, TrackMatteType.ALPHA); } catch (e) { try { s.trackMatteType = TrackMatteType.ALPHA; } catch (e2) {} }
        s.inPoint = t0; s.outPoint = t1;
        return s;
    }

    // =====================================================================
    //  COMPOSIÇÕES DAS CENAS (tipografia 2D, em espaço de tela)
    // =====================================================================
    function sceneComp(name, dur) { var c = P.items.addComp(name, W, H, 1, dur, FPS); c.parentFolder = fScenes; c.motionBlur = true; c.shutterAngle = 220; return c; }

    // ---- CENA 01 — INTRODUÇÃO (0 – 5.6 s) ----
    var C1 = sceneComp("CENA 01 - Introducao", 5.75);
    var t1a = text(C1, "VOCÊ JÁ", FONT_DISPLAY, 150, WHITE, W / 2, 560, 120);   slam(t1a, .95, 320);
    var t1b = text(C1, "DESCOBRIU", FONT_DISPLAY, 290, WHITE, W / 2, 770, 20);  slam(t1b, 1.45, 260); animateLetters(t1b, 1.45, .5, "cascade");
    var t1c = text(C1, "o seu", FONT_ITALIC, 120, GOLD, W / 2, 1000, 60);       animateLetters(t1c, 1.95, .55, "cascade");
    var t1d = text(C1, "DOM?", FONT_DISPLAY, 430, RED, W / 2, 1290, 0);         slam(t1d, 2.35, 420);
    ramp(t1d, [W / 2, 1100], hex("#FF5A66"), [W / 2, 1460], hex("#8A0012"));
    shockRing(C1, "FX  onda de choque DOM", W / 2, 1290, 2.35, 900, hex("#FF5060"));
    var C1txt = [t1a, t1b, t1c, t1d];
    for (var i = 0; i < C1txt.length; i++) {
        glow(C1txt[i], 60, 1.2);
        // mergulho final (whip zoom) no "O" de DOM
        exitScale(C1txt[i], 4.85, 5.6, 900);
    }
    var nullPush = C1.layers.addNull(); nullPush.name = "CTRL  push camera"; // push suave
    nullPush.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H / 2]);
    keys(nullPush.property("ADBE Transform Group").property("ADBE Scale"), [0, 5], [[100, 100], [109, 109]], 33, 33);
    for (i = 0; i < C1txt.length; i++) C1txt[i].parent = nullPush;

    // ---- CENA 02 — DESCOBERTA (5.6 – 13.6 s) ----
    var C2 = sceneComp("CENA 02 - Descoberta", 8.1);
    var words = [
        { s: "CRIATIVIDADE", font: FONT_DISPLAY, size: 230, col: WHITE, mode: "depth" },
        { s: "FÉ", font: FONT_DISPLAY, size: 640, col: GOLD, mode: "slam" },
        { s: "PROPÓSITO", font: FONT_DISPLAY, size: 270, col: WHITE, mode: "slices" },
        { s: "TALENTO", font: FONT_DISPLAY, size: 300, col: RED, mode: "flip" }
    ];
    for (i = 0; i < words.length; i++) {
        var w = words[i], a = i * 2, b = a + 2;
        var lt = text(C2, w.s, w.font, w.size, w.col, W / 2, 1010, 20);
        lt.inPoint = a; lt.outPoint = b;
        glow(lt, w.mode === "slam" ? 90 : 60, w.mode === "slam" ? 1.6 : 1.2);
        if (w.mode === "depth") { animateLetters(lt, a, .8, "depth", 4); exitScale(lt, a + 1.6, b, 260); }
        if (w.mode === "slam") { slam(lt, a, 300, .4); shockRing(C2, "FX  onda FÉ", W / 2, 1010, a + .12, 1100, GOLD); exitScale(lt, a + 1.62, b, 800); }
        if (w.mode === "slices") { // máscaras horizontais alternadas (fatias)
            var N = 6, top = 1010 - w.size * .6, hh = w.size * 1.15 / N;
            lt.name = "TXT  PROPÓSITO (base oculta)"; lt.enabled = false;
            for (var k = 0; k < N; k++) {
                var sl = lt.duplicate(); sl.enabled = true; sl.name = "TXT  PROPÓSITO fatia " + (k + 1);
                var mk = sl.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
                var shp = new Shape(); var y0 = top + k * hh, y1 = y0 + hh + 1;
                shp.vertices = [[-2000, y0], [3000, y0], [3000, y1], [-2000, y1]]; shp.closed = true;
                // máscara em coordenadas da camada: converte pelo anchor
                var ap = sl.property("ADBE Transform Group").property("ADBE Anchor Point").value;
                for (var v = 0; v < 4; v++) shp.vertices[v] = [shp.vertices[v][0] - W / 2 + ap[0], shp.vertices[v][1] - 1010 + ap[1]];
                mk.property("ADBE Mask Shape").setValue(shp);
                var dir = (k % 2) ? 1 : -1, pos = sl.property("ADBE Transform Group").property("ADBE Position");
                keys(pos, [a + k * .045, a + .6 + k * .045, b - .4, b - .05], [[W / 2 + dir * 1200, 1010], [W / 2, 1010], [W / 2, 1010], [W / 2 - dir * 1200, 1010]], 95, 95);
            }
        }
        if (w.mode === "flip") { animateLetters(lt, a, .9, "flip", 4); animateLetters(lt, a, .9, "track", 4); lightSweep(C2, lt, a + .9, a + 1.5); exitScale(lt, a + 1.6, b, 140); }
        // rótulo “dom 0X”
        var lb = text(C2, "dom  0" + (i + 1), FONT_ITALIC, 58, GOLD, W / 2, 690, 100);
        lb.inPoint = a; lb.outPoint = b; opacityWindow(lb, a + .05, b - .02, .4, .3);
        var ix = text(C2, "0" + (i + 1) + " / 04", FONT_DISPLAY, 30, WHITE, W / 2, 1320, 80);
        ix.inPoint = a; ix.outPoint = b; opacityWindow(ix, a + .05, b - .02, .4, .3);
    }

    // ---- CENA 03 — MENSAGEM (13.6 – 20.0 s) ----
    var C3 = sceneComp("CENA 03 - Mensagem", 6.5);
    var lines3 = [
        { s: "OS DONS QUE", f: FONT_DISPLAY, size: 150, c: WHITE, t: .3, y: 640 },
        { s: "RECEBEMOS", f: FONT_DISPLAY, size: 250, c: WHITE, t: .8, y: 830 },
        { s: "NÃO SÃO PARA", f: FONT_DISPLAY, size: 150, c: WHITE, t: 1.35, y: 1010 },
        { s: "ficar", f: FONT_ITALIC, size: 190, c: GOLD, t: 1.9, y: 1170 },
        { s: "ESCONDIDOS.", f: FONT_DISPLAY, size: 250, c: WHITE, t: 2.5, y: 1370 }
    ];
    var nullMsg = C3.layers.addNull(); nullMsg.name = "CTRL  dolly mensagem";
    nullMsg.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H / 2]);
    keys(nullMsg.property("ADBE Transform Group").property("ADBE Scale"), [0, 6.4], [[100, 100], [108, 108]], 33, 33);
    for (i = 0; i < lines3.length; i++) {
        var L3 = lines3[i];
        var l3 = text(C3, L3.s, L3.f, L3.size, L3.c, W / 2, L3.y, 40);
        // revelação por máscara: o texto sobe de dentro de uma "fenda"
        var r3 = l3.sourceRectAtTime(0, false), ap3 = l3.property("ADBE Transform Group").property("ADBE Anchor Point").value;
        var m3 = l3.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        var s3 = new Shape(); s3.vertices = [[r3.left - 400, r3.top - 30], [r3.left + r3.width + 400, r3.top - 30], [r3.left + r3.width + 400, r3.top + r3.height + 40], [r3.left - 400, r3.top + r3.height + 40]]; s3.closed = true;
        m3.property("ADBE Mask Shape").setValue(s3);
        keys(l3.property("ADBE Transform Group").property("ADBE Anchor Point"), [L3.t, L3.t + .7], [[ap3[0], ap3[1] - r3.height - 40], ap3], 10, 95);
        // máscara acompanha: anima a máscara no sentido oposto
        var s3b = new Shape(); s3b.closed = true; s3b.vertices = [];
        for (var q = 0; q < 4; q++) s3b.vertices.push([s3.vertices[q][0], s3.vertices[q][1] - r3.height - 40]);
        keys(m3.property("ADBE Mask Shape"), [L3.t, L3.t + .7], [s3b, s3], 10, 95);
        glow(l3, 55, 1.1);
        l3.parent = nullMsg;
        var dirOut = i < 2 ? -1 : 1;
        keys(l3.property("ADBE Transform Group").property("ADBE Opacity"), [5.65, 6.35], [100, 0]);
        if (L3.s === "NÃO SÃO PARA") { // caixa vermelha de destaque em “NÃO”
            var box = C3.layers.addShape(); box.name = "FX  destaque NÃO";
            var bg = box.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
            var rc = bg.addProperty("ADBE Vector Shape - Rect"); rc.property("ADBE Vector Rect Size").setValue([300, 150]);
            bg.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(RED);
            box.property("ADBE Transform Group").property("ADBE Position").setValue([300, L3.y]);
            box.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([-150, 0]);
            keys(box.property("ADBE Transform Group").property("ADBE Scale"), [L3.t + .35, L3.t + .9], [[0, 100], [100, 100]], 10, 95);
            box.moveAfter(l3); box.parent = nullMsg;
        }
        if (L3.s === "ESCONDIDOS.") { // escondido → revelado pela luz
            var reveal = fx(l3, "ADBE Linear Wipe");
            setp(reveal, "ADBE Linear Wipe-0002", 270);
            if (reveal) keys(reveal.property("ADBE Linear Wipe-0001"), [3.0, 3.9], [100, 0], 60, 60);
            var ghost = text(C3, "ESCONDIDOS.", FONT_DISPLAY, 250, RED, W / 2, L3.y, 40); ghost.name = "TXT  ESCONDIDOS (contorno)";
            opacityWindow(ghost, 2.5, 4.2, .4, .4); ghost.parent = nullMsg; ghost.moveAfter(l3);
            lightSweep(C3, l3, 3.0, 3.9);
        }
    }

    // ---- CENA 04 — ENCERRAMENTO (20.0 – 26.0 s) ----
    var C4 = sceneComp("CENA 04 - Encerramento", 6);
    var lines4 = [
        { s: "COLOQUE", f: FONT_DISPLAY, size: 150, c: WHITE, t: .2, y: 690, m: "track" },
        { s: "SEUS DONS", f: FONT_DISPLAY, size: 250, c: WHITE, t: .55, y: 880, m: "cascade" },
        { s: "a serviço", f: FONT_ITALIC, size: 160, c: hex("#FFE9EB"), t: .95, y: 1060, m: "cascade" },
        { s: "DE DEUS.", f: FONT_DISPLAY, size: 320, c: GOLD, t: 1.4, y: 1270, m: "slam" }
    ];
    for (i = 0; i < lines4.length; i++) {
        var L4 = lines4[i], l4 = text(C4, L4.s, L4.f, L4.size, L4.c, W / 2, L4.y, 40);
        if (L4.m === "slam") { slam(l4, L4.t, 320); shockRing(C4, "FX  onda DEUS", W / 2, L4.y, L4.t + .1, 950, GOLD); }
        else animateLetters(l4, L4.t, .8, L4.m, 2);
        var ds = fx(l4, "ADBE Drop Shadow"); setp(ds, "ADBE Drop Shadow-0001", [.07, 0, .01]); setp(ds, "ADBE Drop Shadow-0002", 220); setp(ds, "ADBE Drop Shadow-0005", 40);
        glow(l4, 50, .8);
        l4.outPoint = 3.7;
        keys(l4.property("ADBE Transform Group").property("ADBE Opacity"), [3.15, 3.65], [100, 0]);
    }
    var q1 = text(C4, "qual é o seu", FONT_ITALIC, 120, WHITE, W / 2, 750, 40); q1.inPoint = 3.6; animateLetters(q1, 3.7, .6, "cascade", 2);
    var q2 = text(C4, "DOM?", FONT_DISPLAY, 520, WHITE, W / 2, 1180, 0); q2.inPoint = 3.6; slam(q2, 4.0, 400);
    ramp(q2, [W / 2, 1000], WHITE, [W / 2, 1380], hex("#FF4D5C"));
    glow(q2, 80, 1.3); shockRing(C4, "FX  onda DOM final", W / 2, 1180, 4.0, 1000, WHITE);
    var q3 = text(C4, "coloque-o a serviço", FONT_ITALIC, 52, hex("#FFD9DD"), W / 2, 1490, 60); q3.inPoint = 3.6; opacityWindow(q3, 5.0, 6, .6, .01);
    keys(q2.property("ADBE Transform Group").property("ADBE Scale"), [4.45, 6], [[100, 100], [104, 104]], 33, 33);

    // =====================================================================
    //  COMP PRINCIPAL — mundo 3D, câmera, luz, fundo e cenas
    // =====================================================================
    var M = P.items.addComp("OS DONS - MAIN 1080x1920", W, H, 1, DUR, FPS);
    M.parentFolder = fComps; M.motionBlur = true; M.shutterAngle = 220; M.bgColor = BLACK;
    try { M.renderer = "ADBE Advanced 3d"; } catch (e) {}

    // ---- fundos por cena ----
    function bg(name, a, b, c1, c2, p1, p2, radial) {
        var s = solid(M, BLACK, name); ramp(s, p1, c1, p2, c2, radial);
        s.inPoint = a; s.outPoint = b; opacityWindow(s, a, b, .5, .5); return s;
    }
    var BG0 = solid(M, BLACK, "BG  preto base");
    var BG1 = bg("BG  CENA 01 brasa", .4, 5.8, hex("#A00618"), BLACK, [W / 2, 1060], [W / 2, 2300], true);
    var BG2 = bg("BG  CENA 02 vermelho-preto", 5.2, 13.8, DRED, BLACK, [W / 2, 0], [W / 2, 1800]);
    var BG3 = bg("BG  CENA 03 luz de baixo", 13.3, 20.1, DRED, BLACK, [W / 2, H], [W / 2, 700]);
    var BG4 = bg("BG  CENA 04 vermelho intenso", 19.7, DUR, RED, BLACK, [W / 2, 0], [W / 2, H]);
    var spot = solid(M, [1, .4, .4], "LUZ  spot encerramento"); var spm = spot.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var ell = new Shape(); ell.vertices = [[540, 200], [1040, 700], [540, 1200], [40, 700]]; ell.inTangents = [[-276, 0], [0, -276], [276, 0], [0, 276]]; ell.outTangents = [[276, 0], [0, 276], [-276, 0], [0, -276]]; ell.closed = true;
    spm.property("ADBE Mask Shape").setValue(ell); spm.property("ADBE Mask Feather").setValue([400, 400]);
    spot.blendingMode = BlendingMode.ADD; spot.inPoint = 19.9; opacityWindow(spot, 19.9, DUR, .6, .5);
    spot.property("ADBE Transform Group").property("ADBE Opacity").expression = "value * (0.55 + 0.12*Math.sin(time*2.2))";

    // ---- raios de luz (shape layer, modo Add) ----
    function rays(name, x, y, a, b, count, len, color, spread, base) {
        var l = M.layers.addShape(); l.name = name;
        var root = l.property("ADBE Root Vectors Group");
        for (var r = 0; r < count; r++) {
            var g = root.addProperty("ADBE Vector Group"); g.name = "raio " + (r + 1);
            var path = g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
            var ang = base + spread * r / count, wd = .03 + Math.random() * .05;
            var sh = new Shape(); sh.vertices = [[0, 0], [Math.cos(ang - wd) * len, Math.sin(ang - wd) * len], [Math.cos(ang + wd) * len, Math.sin(ang + wd) * len]]; sh.closed = true;
            path.property("ADBE Vector Shape").setValue(sh);
            var gf = g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - G-Fill");
            try { gf.property("ADBE Vector Grad Type").setValue(2); gf.property("ADBE Vector Grad Start Pt").setValue([0, 0]); gf.property("ADBE Vector Grad End Pt").setValue([len, 0]); } catch (e) {}
            g.property("ADBE Vector Transform Group").property("ADBE Vector Group Opacity").expression = "40 + 35*Math.sin(time*" + (0.8 + Math.random()).toFixed(2) + " + " + r + ")";
        }
        var fill = fx(l, "ADBE Fill"); setp(fill, "ADBE Fill-0002", color);
        var bl = fx(l, "ADBE Gaussian Blur 2"); setp(bl, "ADBE Gaussian Blur 2-0001", 30);
        l.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
        l.property("ADBE Transform Group").property("ADBE Rotate Z").expression = "time*3";
        l.blendingMode = BlendingMode.ADD; l.inPoint = a; l.outPoint = b; opacityWindow(l, a, b, .5, .6);
        return l;
    }
    rays("LUZ  raios explosao", W / 2, 1060, .5, 5.6, 16, 2000, RED, Math.PI * 2, 0);
    rays("LUZ  raios descoberta", W / 2, H / 2, 5.6, 13.7, 12, 1900, hex("#FF2A3C"), Math.PI * 2, 0);
    rays("LUZ  raios de baixo", W / 2, H + 120, 13.6, 20.1, 14, 2300, RED, Math.PI * .9, Math.PI * 1.05);
    rays("LUZ  raios do alto", W / 2, -150, 20, DUR, 12, 2300, hex("#FFC8BE"), Math.PI * .55, Math.PI * .22);

    // ---- câmera 3D com DOF e dolly ----
    var cam = M.layers.addCamera("CAM  principal", [W / 2, H / 2]);
    var camOpt = cam.property("ADBE Camera Options Group");
    try { camOpt.property("ADBE Camera Depth of Field").setValue(1); camOpt.property("ADBE Camera Focus Distance").setValue(1300); camOpt.property("ADBE Camera Aperture").setValue(60); camOpt.property("ADBE Camera Blur Level").setValue(120); } catch (e) {}
    var camCtl = M.layers.addNull(); camCtl.name = "CTRL  camera dolly"; camCtl.threeDLayer = true;
    camCtl.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H / 2, 0]);
    cam.parent = camCtl;
    // dolly com acelerações nas transições (whip)
    keys(camCtl.property("ADBE Transform Group").property("ADBE Position"),
        [0, 5.2, 5.6, 13.3, 13.7, 19.7, 20.1, 23.5, 23.8, 26],
        [[W/2, H/2, 0], [W/2, H/2, 500], [W/2, H/2, 1600], [W/2, H/2, 3900], [W/2, H/2, 4800], [W/2, H/2, 6100], [W/2, H/2, 7200], [W/2, H/2, 7600], [W/2, H/2, 8200], [W/2, H/2, 8400]], 60, 60);
    camCtl.property("ADBE Transform Group").property("ADBE Rotate Z").expression = "Math.sin(time*0.31)*2";
    cam.property("ADBE Transform Group").property("ADBE Position").expression =
        "// órbita sutil + shake nos impactos (marcadores da trilha)\n" +
        "var o=[Math.sin(time*.23)*120, Math.cos(time*.17)*160, 0];\n" +
        "var s=0; var hits=[0.5,0.95,1.45,1.95,2.35,5.6,7.6,9.6,11.6,13.6,16.6,20,21.4,23.7,24];\n" +
        "for(var i=0;i<hits.length;i++){var d=time-hits[i]; if(d>=0&&d<.6) s+=Math.exp(-d*9)*18;}\n" +
        "value + o + [wiggle(25,s)[0]-value[0], wiggle(25,s)[1]-value[1], 0];";

    // ---- mundo: partículas 3D, sólidos wireframe, símbolos, palavras ----
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var NULLW = M.layers.addNull(); NULLW.name = "CTRL  mundo 3D (densidade)"; NULLW.threeDLayer = true;
    var dens = NULLW.property("ADBE Effect Parade").addProperty("ADBE Slider Control"); dens.name = "Densidade";
    keys(dens.property(1), [0, .5, 1.5, 5.6, 6.5], [25, 25, 70, 70, 100]);
    function particle(idx) {
        var big = rnd() < .08, col = rnd() < .22 ? GOLD : (rnd() < .7 ? hex("#FF2A3C") : WHITE);
        var l = M.layers.addShape(); l.name = (big ? "BOKEH  " : "PART  ") + idx; l.threeDLayer = true;
        var g = l.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
        var r = big ? 20 + rnd() * 40 : 3 + rnd() * 6;
        g.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([r, r]);
        g.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(col);
        var x = (rnd() - .5) * 3400, y = (rnd() - .5) * 4200, z = 200 + rnd() * 9000;
        l.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2 + x, H / 2 + y, z]);
        l.property("ADBE Transform Group").property("ADBE Position").expression = "value + [Math.sin(time*.5+" + idx + ")*30, -time*" + (20 + rnd() * 50).toFixed(1) + ", 0]";
        l.property("ADBE Transform Group").property("ADBE Opacity").expression =
            "thisComp.layer(\"CTRL  mundo 3D (densidade)\").effect(\"Densidade\")(1) * (" + (big ? ".25" : ".9") + ") * (.55+.45*Math.sin(time*" + (1 + rnd() * 4).toFixed(2) + "+" + idx + "))";
        l.blendingMode = BlendingMode.ADD; l.motionBlur = true;
        try { l.property("ADBE Material Options Group").property("ADBE Accepts Lights").setValue(0); } catch (e) {}
        return l;
    }
    var GEO = {
        octa: { v: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]], e: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]] },
        cube: { v: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]], e: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]] },
        tetra: { v: [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]], e: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]] }
    };
    // sólido wireframe 3D real: cada aresta é um shape layer 3D parentado a um null que gira
    function wireSolid(kind, idx) {
        var g = GEO[kind], s = 70 + rnd() * 140, col = rnd() < .3 ? GOLD : RED;
        var ctrl = M.layers.addNull(); ctrl.name = "3D  " + kind.toUpperCase() + " " + idx; ctrl.threeDLayer = true;
        var side = idx % 2 ? 1 : -1;
        ctrl.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2 + side * (260 + rnd() * 800), H / 2 + (rnd() - .5) * 2600, 600 + rnd() * 8500]);
        ctrl.property("ADBE Transform Group").property("ADBE Position").expression = "value + [0, Math.sin(time*.6+" + idx + ")*80, 0]";
        ctrl.property("ADBE Transform Group").property("ADBE Rotate X").expression = "time*" + ((rnd() - .5) * 80).toFixed(1);
        ctrl.property("ADBE Transform Group").property("ADBE Rotate Y").expression = "time*" + (20 + rnd() * 50).toFixed(1);
        for (var e = 0; e < g.e.length; e++) {
            var A = g.v[g.e[e][0]], B = g.v[g.e[e][1]];
            var l = M.layers.addShape(); l.name = "3D  " + kind + " " + idx + " aresta " + (e + 1); l.threeDLayer = true;
            var gg = l.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
            var pth = gg.addProperty("ADBE Vector Shape - Group"), sh = new Shape();
            // aresta simétrica no ponto médio, apontada para o vértice B com lookAt (eixo Z) e girada 90° em Y
            var dx = (B[0] - A[0]) * s, dy = (B[1] - A[1]) * s, dz = (B[2] - A[2]) * s, len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            var Mx = (A[0] + B[0]) / 2 * s, My = (A[1] + B[1]) / 2 * s, Mz = (A[2] + B[2]) / 2 * s;
            sh.vertices = [[-len / 2, 0], [len / 2, 0]]; sh.closed = false; pth.property("ADBE Vector Shape").setValue(sh);
            var st = gg.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue(col); st.property("ADBE Vector Stroke Width").setValue(4);
            l.parent = ctrl;
            l.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0, 0]);
            l.property("ADBE Transform Group").property("ADBE Position").setValue([Mx, My, Mz]);
            l.property("ADBE Transform Group").property("ADBE Orientation").expression = "lookAt([" + [Mx, My, Mz].join(",") + "],[" + [B[0] * s, B[1] * s, B[2] * s].join(",") + "])";
            l.property("ADBE Transform Group").property("ADBE Rotate Y").setValue(90);
            l.blendingMode = BlendingMode.ADD; l.motionBlur = true;
            l.property("ADBE Transform Group").property("ADBE Opacity").expression = "thisComp.layer(\"CTRL  mundo 3D (densidade)\").effect(\"Densidade\")(1)";
        }
        return ctrl;
    }
    function symbol(kind, idx) { // símbolos dos dons como shapes 3D (billboard)
        var l = M.layers.addShape(); l.name = "SIMB  " + kind + " " + idx; l.threeDLayer = true; l.autoOrient = AutoOrientType.CAMERA_OR_POINT_OF_INTEREST;
        var gg = l.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
        if (kind === "estrela") { var ps = gg.addProperty("ADBE Vector Shape - Star"); ps.property("ADBE Vector Star Points").setValue(4); ps.property("ADBE Vector Star Outer Radius").setValue(95); ps.property("ADBE Vector Star Inner Radius").setValue(22); }
        else if (kind === "aneis") { for (var r = 1; r <= 3; r++) gg.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([r * 60, r * 60]); }
        else if (kind === "chama") { var p = gg.addProperty("ADBE Vector Shape - Group"), sh = new Shape();
            sh.vertices = [[0, 90], [-55, 20], [-10, -90], [25, -70], [55, 30]]; sh.inTangents = [[30, 0], [0, 40], [-20, 30], [0, 0], [0, -40]]; sh.outTangents = [[-30, 0], [0, -40], [10, 20], [20, 40], [-10, 50]]; sh.closed = true;
            p.property("ADBE Vector Shape").setValue(sh); }
        else { gg.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([180, 180]);
            var c = gg.addProperty("ADBE Vector Shape - Group"), s2 = new Shape(); s2.vertices = [[0, -60], [0, 65]]; s2.closed = false; c.property("ADBE Vector Shape").setValue(s2);
            var c2 = gg.addProperty("ADBE Vector Shape - Group"), s3 = new Shape(); s3.vertices = [[-38, -18], [38, -18]]; s3.closed = false; c2.property("ADBE Vector Shape").setValue(s3); }
        var st = gg.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue(kind === "estrela" ? GOLD : hex("#FF3A4C")); st.property("ADBE Vector Stroke Width").setValue(5);
        l.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2 + (idx % 2 ? 1 : -1) * (300 + rnd() * 650), H / 2 + (rnd() - .5) * 3000, 500 + rnd() * 8500]);
        l.property("ADBE Transform Group").property("ADBE Rotate Z").expression = "time*" + ((rnd() - .5) * 40).toFixed(1);
        l.property("ADBE Transform Group").property("ADBE Opacity").expression = "thisComp.layer(\"CTRL  mundo 3D (densidade)\").effect(\"Densidade\")(1)*.75";
        l.blendingMode = BlendingMode.ADD; glow(l, 30, 1); l.motionBlur = true;
    }
    function ghostWord(str, idx) {
        var l = text(M, str, rnd() < .4 ? FONT_ITALIC : FONT_DISPLAY, 120 + rnd() * 140, hex("#FF3346"), W / 2, H / 2, 40);
        l.name = "PALAVRA 3D  " + str; l.threeDLayer = true;
        l.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2 + (rnd() - .5) * 2600, H / 2 + (rnd() - .5) * 3600, 800 + rnd() * 8500]);
        l.property("ADBE Transform Group").property("ADBE Opacity").expression = "thisComp.layer(\"CTRL  mundo 3D (densidade)\").effect(\"Densidade\")(1)*.12";
    }
    var wordsG = ["DOM", "GRAÇA", "SERVIR", "AMOR", "LUZ", "DONS", "ESPÍRITO", "SABEDORIA", "CHAMADO", "MISSÃO", "ALEGRIA"];
    for (i = 0; i < wordsG.length; i++) ghostWord(wordsG[i], i);
    var kinds = ["octa", "cube", "tetra", "octa", "cube", "tetra", "octa", "cube", "tetra", "octa"];
    for (i = 0; i < kinds.length; i++) wireSolid(kinds[i], i + 1);
    var syms = ["chama", "estrela", "cruz", "aneis", "chama", "estrela", "aneis", "cruz", "estrela", "chama"];
    for (i = 0; i < syms.length; i++) symbol(syms[i], i + 1);
    for (i = 0; i < 160; i++) particle(i + 1);

    // ---- explosão de luz (CENA 01) ----
    var ex = solid(M, WHITE, "FX  explosao de luz");
    var exM = ex.property("ADBE Mask Parade").addProperty("ADBE Mask Atom"); exM.property("ADBE Mask Shape").setValue(ell); exM.property("ADBE Mask Feather").setValue([500, 500]);
    ex.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([540, 700]);
    ex.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, 1060]);
    keys(ex.property("ADBE Transform Group").property("ADBE Scale"), [.5, 1.4], [[5, 5], [320, 320]], 10, 95);
    keys(ex.property("ADBE Transform Group").property("ADBE Opacity"), [.45, .52, 2.2], [0, 100, 0]);
    var tint = fx(ex, "ADBE Tint"); setp(tint, "ADBE Tint-0002", hex("#FF5A66"));
    ex.blendingMode = BlendingMode.ADD; ex.inPoint = .4; ex.outPoint = 2.5;
    shockRing(M, "FX  onda explosao", W / 2, 1060, .5, 1700, hex("#FF6A70"));
    try { // estilhaços com CC Particle World, se disponível
        var pw = solid(M, BLACK, "FX  estilhacos (CC Particle World)"); var ccp = fx(pw, "CC Particle World");
        if (ccp) { pw.blendingMode = BlendingMode.ADD; pw.inPoint = .5; pw.outPoint = 3; } else pw.remove();
    } catch (e) {}

    // ---- cenas (precomps) ----
    function placeScene(c, t0) { var l = M.layers.add(c); l.startTime = t0; l.name = "CENA  " + c.name; l.motionBlur = true; return l; }
    placeScene(C1, 0); placeScene(C2, 5.6); placeScene(C3, 13.6); placeScene(C4, 20.0);

    // ---- flashes de transição ----
    var flash = solid(M, [1, .75, .76], "FX  flashes de transicao"); flash.blendingMode = BlendingMode.ADD;
    var ft = [], fv = [], fl = [[0.5, 90], [5.55, 85], [7.6, 35], [13.55, 75], [16.6, 20], [19.95, 90], [21.4, 30], [23.65, 80]];
    for (i = 0; i < fl.length; i++) { ft.push(fl[i][0] - .06, fl[i][0], fl[i][0] + .45); fv.push(0, fl[i][1], 0); }
    keys(flash.property("ADBE Transform Group").property("ADBE Opacity"), ft, fv, 33, 80);

    // ---- ajuste final: bloom, vinheta, grão ----
    var adj = solid(M, WHITE, "ADJ  bloom + grao + vinheta"); adj.adjustmentLayer = true;
    glow(adj, 120, .6);
    var ng = fx(adj, "ADBE Noise"); setp(ng, "ADBE Noise-0001", 4);
    var vig = solid(M, BLACK, "ADJ  vinheta"); var vm = vig.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var ve = new Shape(); ve.vertices = [[540, 260], [1000, 960], [540, 1660], [80, 960]]; ve.inTangents = [[-254, 0], [0, -386], [254, 0], [0, 386]]; ve.outTangents = [[254, 0], [0, 386], [-254, 0], [0, -386]]; ve.closed = true;
    vm.property("ADBE Mask Shape").setValue(ve); vm.inverted = true; vm.property("ADBE Mask Feather").setValue([600, 600]); vig.property("ADBE Transform Group").property("ADBE Opacity").setValue(70);
    var fade = solid(M, BLACK, "FX  fade in/out"); keys(fade.property("ADBE Transform Group").property("ADBE Opacity"), [0, .35, 25.45, 26], [100, 0, 0, 100], 33, 33);

    // ---- trilha + marcadores de sincronização ----
    var audioFile = new File(BASE.fsName + "/audio/trilha_os_dons.wav");
    if (audioFile.exists) {
        var ai = P.importFile(new ImportOptions(audioFile)); ai.parentFolder = fAudio;
        var al = M.layers.add(ai); al.name = "AUDIO  trilha (sincronizada)";
        var hits = [0.5, 0.95, 1.45, 1.95, 2.35, 5.6, 7.6, 9.6, 11.6, 13.6, 16.6, 20.0, 21.4, 23.7, 24.0];
        for (i = 0; i < hits.length; i++) al.property("ADBE Marker").setValueAtTime(hits[i], new MarkerValue("HIT " + (i + 1)));
    }
    var refFile = new File(BASE.fsName + "/OS_DONS_1080x1920.mp4");
    if (refFile.exists) { var ri = P.importFile(new ImportOptions(refFile)); ri.parentFolder = fRef; }

    // marcadores de cena na comp principal
    var cm = [[0, "CENA 01 — INTRODUÇÃO"], [5.6, "CENA 02 — DESCOBERTA"], [13.6, "CENA 03 — MENSAGEM"], [20, "CENA 04 — ENCERRAMENTO"], [23.7, "FINAL — QUAL É O SEU DOM?"]];
    for (i = 0; i < cm.length; i++) M.markerProperty.setValueAtTime(cm[i][0], new MarkerValue(cm[i][1]));

    // ---- fila de render (MP4 H.264) ----
    var rq = P.renderQueue.items.add(M);
    var om = rq.outputModule(1), templates = om.templates, chosen = null;
    for (i = 0; i < templates.length; i++) if (/H\.264/i.test(templates[i])) { chosen = templates[i]; break; }
    if (chosen) om.applyTemplate(chosen);
    om.file = new File(BASE.fsName + "/render_ae/OS_DONS_AE" + (chosen ? ".mp4" : ".mov"));
    new Folder(BASE.fsName + "/render_ae").create();

    // ---- salvar ----
    var aep = new File(ROOT.fsName + "/OS_DONS.aep");
    P.save(aep);
    M.openInViewer();
    app.endUndoGroup();

    var msg = "OS DONS — projeto criado e salvo em:\n" + aep.fsName + "\n\nFila de render: " + (chosen || "modelo padrão (sem H.264 nesta versão — use o Media Encoder)") +
              "\n\nRenderizar agora?";
    if (confirm(msg)) P.renderQueue.render();
})();
