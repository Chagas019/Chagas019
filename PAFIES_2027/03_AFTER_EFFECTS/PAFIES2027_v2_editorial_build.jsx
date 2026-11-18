/*  PAFIES 2027 — v2 EDITORIAL 2D | Construtor do projeto After Effects
    Uso: File > Scripts > Run Script File… (mantenha a pasta PAFIES_2027 inteira).
    Cria PAFIES2027_v2_MASTER.aep com:
      • ilustrações vetoriais (02_ILLUSTRATOR/v2_editorial/pdf) como camadas 3D em profundidades diferentes (parallax 2.5D)
      • câmera 3D + Null CAM_CONTROL por cena (push / drift)
      • fitas de velocidade = Shape Layers com Trim Paths (cabeça e cauda animadas)
      • texto palavra por palavra (Text Animator, Range Selector baseado em palavras)
      • tarjas reveladas por Track Matte, morph círculo→coração (Path keyframes), wipes diagonais
      • tempos idênticos à trilha (120 BPM) e ao render final (05_REMOTION/src/v2)
*/
(function () {
    app.beginUndoGroup("PAFIES 2027 v2");
    var FPS = 30, W = 1080, H = 1920;
    var root = new File($.fileName).parent.parent;
    var proj = app.newProject();
    function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
    var C = { royal: hex("#1E40C8"), navy: hex("#0B1033"), red: hex("#E8233F"), redDark: hex("#A3173A"), yellow: hex("#FFD000"), cream: hex("#EFE9DF"), sky: hex("#8EC5E8") };
    function folder(n) { return proj.items.addFolder(n); }
    var fC = folder("00_MASTER"), fS = folder("01_CENAS"), fI = folder("02_ILUSTRACOES"), fA = folder("03_AUDIO"), fN = folder("04_SOLIDOS");
    function imp(rel, parent) {
        var f = new File(root.fsName + "/" + rel); if (!f.exists) { $.writeln("faltando " + rel); return null; }
        var it = proj.importFile(new ImportOptions(f)); it.parentFolder = parent; return it;
    }
    var I = {};
    var names = ["megafone_mao", "mao_aberta_azul", "mao_aberta_vermelha", "caixa_doacao", "maca", "lata", "arroz", "leite", "coracao",
        "galera_pessoa_1", "galera_pessoa_2", "galera_pessoa_3", "galera_pessoa_4", "corredor_pernas", "estadio_fundo"];
    for (var i = 0; i < names.length; i++) I[names[i]] = imp("02_ILLUSTRATOR/v2_editorial/pdf/" + names[i] + ".pdf", fI);
    var LOGO = imp("07_ASSETS/logo/pafies_logo_oficial_1600.png", fI);
    var AUD = imp("08_AUDIO/PAFIES2027_mix.wav", fA);

    // ---------- helpers ----------
    function comp(n, d) { var c = proj.items.addComp(n, W, H, 1, d, FPS); c.parentFolder = fS; c.motionBlur = true; return c; }
    function ease(p) {
        for (var k = 1; k <= p.numKeys; k++) {
            var n = (p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL || !(p.value instanceof Array)) ? 1 : p.value.length;
            var a = [], b = []; for (var d = 0; d < n; d++) { a.push(new KeyframeEase(0, 80)); b.push(new KeyframeEase(0, 80)); }
            try { p.setTemporalEaseAtKey(k, a, b); } catch (e) {}
        }
    }
    function K(p, t, v) { for (var k = 0; k < t.length; k++) p.setValueAtTime(t[k], v[k]); ease(p); }
    function bg(c, col) { var s = c.layers.addSolid(col, "FUNDO", W, H, 1); s.source.parentFolder = fN; return s; }
    function tr(l) { return l.property("Transform"); }
    function art(c, item, x, y, z, sc, tIn, rot) { // ilustração como camada 3D (parallax pela câmera)
        if (!item) return null;
        var l = c.layers.add(item); l.threeDLayer = true; l.motionBlur = true;
        tr(l).property("Position").setValue([x, y, z]); tr(l).property("Scale").setValue([sc, sc, sc]);
        if (rot) tr(l).property("Z Rotation").setValue(rot);
        if (tIn !== undefined) K(tr(l).property("Scale"), [tIn, tIn + 0.45], [[0, 0, 0], [sc, sc, sc]]);
        return l;
    }
    function bob(l, amp, spd) { tr(l).property("Position").expression = "value + [0, Math.sin(time*" + spd + "+index)*" + amp + ", 0]"; }
    function words(c, txt, size, col, y, tIn, opt) { // texto palavra por palavra (máscara simulada por Range Selector de palavras)
        opt = opt || {};
        var l = c.layers.addText(txt); var p = l.property("Source Text"); var td = p.value;
        td.resetCharStyle(); td.font = "Anton-Regular"; td.fontSize = size; td.fillColor = col; td.justification = ParagraphJustification.CENTER_JUSTIFY;
        p.setValue(td); tr(l).property("Position").setValue([W / 2, y + size * 0.35]);
        if (opt.rot) tr(l).property("Rotation").setValue(opt.rot);
        var an = l.property("Text").property("Animators").addProperty("ADBE Text Animator"); an.name = "Entrada_Palavras";
        an.property("Properties").addProperty("ADBE Text Position 3D").setValue([0, size * 1.1, 0]);
        an.property("Properties").addProperty("ADBE Text Opacity").setValue(0);
        var rs = an.property("Selectors").addProperty("ADBE Text Selector");
        rs.property("Advanced").property("Based On").setValue(3); // palavras
        rs.property("Advanced").property("Shape").setValue(2);    // rampa
        K(rs.property("Offset"), [tIn, tIn + 0.25 + txt.split(" ").length * 0.12], [-100, 100]);
        if (opt.out !== undefined) { K(tr(l).property("Opacity"), [opt.out, opt.out + 0.3], [100, 0]); }
        if (opt.shadow) { var sh = l.property("Effects").addProperty("ADBE Drop Shadow"); sh.property("Shadow Color").setValue(opt.shadow); sh.property("Opacity").setValue(255); sh.property("Distance").setValue(size * 0.05); sh.property("Softness").setValue(0); }
        return l;
    }
    function band(c, y, w, h, col, tIn, rot, textLayer) { // tarja revelada por Track Matte (retângulo com escala X animada)
        var s = c.layers.addSolid(col, "TARJA", w, h, 1); s.source.parentFolder = fN;
        tr(s).property("Position").setValue([W / 2, y]); tr(s).property("Rotation").setValue(rot || -3);
        var m = c.layers.addShape(); m.name = "MATTE_TARJA";
        var r = m.property("Contents").addProperty("ADBE Vector Shape - Rect"); m.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        r.property("Size").setValue([w, h]); tr(m).property("Position").setValue([W / 2, y]); tr(m).property("Rotation").setValue(rot || -3);
        tr(m).property("Anchor Point").setValue([-w / 2, 0]); tr(m).property("Position").setValue([W / 2 - w / 2 * Math.cos((rot || -3) * Math.PI / 180), y - w / 2 * Math.sin((rot || -3) * Math.PI / 180)]);
        K(tr(m).property("Scale"), [tIn, tIn + 0.4], [[0, 100], [100, 100]]);
        m.moveBefore(s);
        try { s.setTrackMatte(m, TrackMatteType.ALPHA); } catch (e) { s.trackMatteType = TrackMatteType.ALPHA; }
        if (textLayer) textLayer.moveBefore(m);
        return s;
    }
    function ribbon(c, pts, cols, width, tIn, dur) { // fita de velocidade: shape + Trim Paths
        for (var k = 0; k < cols.length; k++) {
            var l = c.layers.addShape(); l.name = "FITA_" + k; l.motionBlur = true;
            var g = l.property("Contents").addProperty("ADBE Vector Group");
            var pth = g.property("Contents").addProperty("ADBE Vector Shape - Group");
            var sh = new Shape(); sh.vertices = pts.v; sh.inTangents = pts.i; sh.outTangents = pts.o; sh.closed = false;
            pth.property("Path").setValue(sh);
            var st = g.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
            st.property("Color").setValue(cols[k]); st.property("Stroke Width").setValue(width * (1 - k * 0.18)); st.property("Line Cap").setValue(2);
            var tp = l.property("Contents").addProperty("ADBE Vector Filter - Trim");
            var t0 = tIn + k * 0.03;
            K(tp.property("End"), [t0, t0 + dur], [0, 100]);
            K(tp.property("Start"), [t0 + dur * 0.55, t0 + dur * 1.55], [0, 100]);
        }
    }
    function camRig(c, from, to) {
        var n = c.layers.addNull(); n.name = "CAM_CONTROL"; n.threeDLayer = true; n.source.parentFolder = fN;
        var cam = c.layers.addCamera("CAM_2.5D", [W / 2, H / 2]);
        tr(cam).property("Position").setValue([W / 2, H / 2, -2400]); cam.property("Camera Options").property("Zoom").setValue(2400);
        cam.parent = n;
        K(tr(n).property("Position"), [0, c.duration], [from, to]);
        return n;
    }
    function wipe(c, t, cols, dir) {
        for (var k = 0; k < cols.length; k++) {
            var s = c.layers.addSolid(cols[k], "WIPE_" + k, W * 2, H * 2, 1); s.source.parentFolder = fN;
            tr(s).property("Rotation").setValue(dir * 20);
            var t0 = t + k * 0.07;
            K(tr(s).property("Position"), [t0, t0 + 0.27, t0 + 0.54], [[-W * 1.2 * dir + W / 2, H / 2], [W / 2, H / 2], [W * 2.2 * dir + W / 2, H / 2]]);
            s.inPoint = t0; s.outPoint = t0 + 0.55;
        }
    }
    var R1 = { v: [[-150, 1350], [540, 480], [900, 1080], [330, 1020]], i: [[0, 0], [-420, 140], [140, -320], [90, 220]], o: [[300, -50], [390, -130], [-140, 240], [0, 0]] };

    // ===== CENA 1 — ABERTURA (0–6s): mão com megafone, pulsos, palavra por palavra, zoom na boca (match-cut) =====
    var s1 = comp("V2_CENA_01_ABERTURA", 6); bg(s1, C.navy);
    var ring = s1.layers.addShape(); ring.name = "PULSO_CORACAO";
    var el = ring.property("Contents").addProperty("ADBE Vector Shape - Ellipse"); el.property("Size").setValue([300, 300]);
    var stk = ring.property("Contents").addProperty("ADBE Vector Graphic - Stroke"); stk.property("Color").setValue(C.royal); stk.property("Stroke Width").setValue(10);
    tr(ring).property("Position").setValue([560, 1250]);
    tr(ring).property("Scale").expression = "b=[0.4,1.45,2.4,3.25,4.0,4.7];s=100;for(i=0;i<b.length;i++){d=time-b[i];if(d>0&&d<1.1)s=Math.max(s,100+d*220);} [s,s]";
    var mg = art(s1, I.megafone_mao, 560, 1250, 0, 105, undefined, -32);
    if (mg) { tr(mg).property("Anchor Point").setValue([470, 200, 0]); K(tr(mg).property("Position"), [0.6, 1.4, 4.93, 5.97], [[560, 2150, 0], [560, 1250, 0], [560, 1250, 0], [560, 1250, -2300]]); }
    words(s1, "EI, GALERA…", 170, C.cream, 520, 1.1, { out: 2.9 });
    words(s1, "ESTÃO", 260, C.yellow, 420, 3.1, { shadow: C.royal, out: 4.9 });
    var t1 = words(s1, "PREPARADOS?", 180, C.cream, 690, 3.37, { rot: -3, out: 4.9 });
    band(s1, 690, 1000, 200, C.red, 3.3, -3, t1);
    camRig(s1, [W / 2, H / 2, 0], [W / 2, H / 2, 140]);

    // ===== CENA 2 — REVELAÇÃO (6–14s): logo, fitas, "10ª", tarja =====
    var s2 = comp("V2_CENA_02_REVELACAO", 8); bg(s2, C.red);
    ribbon(s2, R1, [C.yellow, C.cream, C.royal], 80, 0.13, 1.13);
    var lg = art(s2, LOGO, W / 2, 840, 0, 40, 0.2);
    if (lg) K(tr(lg).property("Position"), [3.0, 3.87], [[W / 2, 840, 0], [W / 2, 450, 0]]);
    var ten = words(s2, "10ª", 560, C.yellow, 1010, 3.2, { shadow: C.navy });
    words(s2, "EDIÇÃO", 150, C.cream, 1300, 3.73, { shadow: C.navy });
    var t2 = words(s2, "GINCANA SOLIDÁRIA", 96, C.cream, 1450, 4.73, { rot: -3 });
    band(s2, 1450, 940, 130, C.navy, 4.6, -3, t2);
    words(s2, "PAFIES 2027", 150, C.yellow, 1610, 5.47, { shadow: C.navy });
    camRig(s2, [W / 2 - 20, H / 2 + 30, -120], [W / 2 + 20, H / 2 - 30, 0]);

    // ===== CENA 3 — SOLIDARIEDADE (14–24s): mãos + caixa, alimentos em parallax, morph círculo→coração =====
    var s3 = comp("V2_CENA_03_SOLIDARIEDADE", 10); bg(s3, C.cream);
    var food = [["maca", 230, 760, -300, 0.6], ["lata", 860, 700, -200, 0.8], ["arroz", 190, 1060, -100, 1.0], ["leite", 890, 1040, -250, 1.2], ["coracao", 540, 600, -400, 1.4]];
    for (i = 0; i < food.length; i++) { var fl = art(s3, I[food[i][0]], food[i][1], food[i][2], food[i][3], 120, food[i][4]); if (fl) { bob(fl, 14, 2.1); K(tr(fl).property("Opacity"), [6.4, 7.0], [100, 0]); } }
    var hl = art(s3, I.mao_aberta_azul, 300, 1760, 0, 115, undefined, 28); if (hl) { tr(hl).property("Anchor Point").setValue([160, 400, 0]); K(tr(hl).property("Position"), [0, 0.8], [[300, 2700, 0], [300, 1760, 0]]); }
    var hr = art(s3, I.mao_aberta_vermelha, 780, 1770, 0, 115, undefined, -28); if (hr) { tr(hr).property("Anchor Point").setValue([160, 400, 0]); tr(hr).property("Scale").setValue([-115, 115, 115]); K(tr(hr).property("Position"), [0, 0.8], [[780, 2700, 0], [780, 1770, 0]]); }
    var bx = art(s3, I.caixa_doacao, 540, 1300, 0, 135); if (bx) { tr(bx).property("Anchor Point").setValue([205, 110, 0]); K(tr(bx).property("Position"), [0, 0.8], [[540, 2240, 0], [540, 1300, 0]]); }
    var hm = s3.layers.addShape(); hm.name = "MORPH_CIRCULO_CORACAO";
    var hp = hm.property("Contents").addProperty("ADBE Vector Shape - Group");
    var cS = new Shape(), hS = new Shape(), cv = [], hv = [];
    for (i = 0; i < 24; i++) { var a = i / 24 * 2 * Math.PI; cv.push([Math.sin(a) * 330, -Math.cos(a) * 330]);
        var x = 16 * Math.pow(Math.sin(a), 3), y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); hv.push([x / 16 * 330, -y / 16 * 330 + 33]); }
    cS.vertices = cv; cS.closed = true; hS.vertices = hv; hS.closed = true;
    K(hp.property("Path"), [6.67, 7.53], [cS, hS]);
    hm.property("Contents").addProperty("ADBE Vector Graphic - Fill").property("Color").setValue(C.red);
    tr(hm).property("Position").setValue([540, 820]); K(tr(hm).property("Scale"), [6.6, 7.13], [[0, 0], [100, 100]]);
    var kw = ["DESAFIOS", "UNIÃO", "CRIATIVIDADE", "DIVERSÃO", "SOLIDARIEDADE"];
    for (i = 0; i < kw.length; i++) { var w = words(s3, kw[i], 170, i % 2 ? C.red : C.royal, 320, 0.6 + i * 0.733, { out: 0.6 + i * 0.733 + 0.4 }); }
    words(s3, "MUITO MAIS QUE", 104, C.navy, 250, 4.33, { out: 6.53 });
    words(s3, "UMA COMPETIÇÃO.", 136, C.royal, 390, 4.6, { out: 6.6 });
    words(s3, "UMA MISSÃO DE", 110, C.navy, 250, 7.07);
    var t3 = words(s3, "SOLIDARIEDADE.", 150, C.cream, 400, 7.47, { rot: -3 });
    band(s3, 400, 1010, 170, C.red, 7.33, -3, t3);
    camRig(s3, [W / 2 - 24, H / 2, 0], [W / 2 + 24, H / 2, 160]);

    // ===== CENA 4 — EXPECTATIVA (24–32s): corredor + fitas, galera, megafone, contagem =====
    var s4 = comp("V2_CENA_04_EXPECTATIVA", 8);
    var b1 = bg(s4, C.royal); b1.outPoint = 2; var b2 = bg(s4, C.yellow); b2.inPoint = 2; b2.outPoint = 4; var b3 = bg(s4, C.navy); b3.inPoint = 4; b3.outPoint = 6;
    var bc = [C.cream, C.royal, C.red]; for (i = 0; i < 3; i++) { var bb = bg(s4, bc[i]); bb.inPoint = 6 + i * 0.5; bb.outPoint = i < 2 ? 6.5 + i * 0.5 : 8; }
    var rn = art(s4, I.corredor_pernas, 600, 980, 0, 155, 0, -8); if (rn) { tr(rn).property("Anchor Point").setValue([250, 150, 0]); tr(rn).property("Position").expression = "value + [0, -Math.abs(Math.sin(time*12.6))*40, 0]"; rn.outPoint = 2; }
    ribbon(s4, { v: [[560, 1150], [-200, 1250]], i: [[0, 0], [400, 50]], o: [[-260, -50], [0, 0]] }, [C.yellow, C.red, C.cream], 70, 0, 0.67);
    var tA = words(s4, "PREPARE", 270, C.yellow, 340, 0, { shadow: C.navy }); tA.outPoint = 2;
    var tB = words(s4, "SUA EQUIPE!", 170, C.cream, 590, 0.2, { shadow: C.navy }); tB.outPoint = 2;
    for (i = 0; i < 4; i++) { var pp = art(s4, I["galera_pessoa_" + (i + 1)], 220 + i * 215, 1880, 0, 120, 2.07 + i * 0.07); if (pp) { tr(pp).property("Anchor Point").setValue([100, 330, 0]); tr(pp).property("Position").expression = "value + [0, -Math.abs(Math.sin(time*6.28+" + i + "))*40, 0]"; pp.inPoint = 2; pp.outPoint = 4; } }
    var tC = words(s4, "REÚNA", 250, C.navy, 380, 2.0); tC.inPoint = 2; tC.outPoint = 4;
    var tD = words(s4, "A GALERA!", 190, C.red, 620, 2.2, { shadow: C.navy }); tD.inPoint = 2; tD.outPoint = 4;
    var m4 = art(s4, I.megafone_mao, 440, 1380, 0, 85, 4.1, -30); if (m4) { tr(m4).property("Anchor Point").setValue([470, 200, 0]); m4.inPoint = 4; m4.outPoint = 6; }
    var tE = words(s4, "ESSA EDIÇÃO", 170, C.cream, 430, 4.0); tE.inPoint = 4; tE.outPoint = 6;
    var tF = words(s4, "PROMETE!", 280, C.yellow, 720, 4.27, { shadow: C.red }); tF.inPoint = 4; tF.outPoint = 6;
    var nums = ["3", "2", "1"]; for (i = 0; i < 3; i++) { var n = words(s4, nums[i], 600, i === 1 ? C.navy : C.yellow, 1000, 6 + i * 0.5, { shadow: C.navy }); n.inPoint = 6 + i * 0.5; n.outPoint = i < 2 ? 6.5 + i * 0.5 : 7.5; }
    var tG = words(s4, "A CONTAGEM REGRESSIVA COMEÇOU!", 70, C.cream, 330, 6.07, { rot: -2 }); tG.inPoint = 6; band(s4, 330, 1010, 110, C.navy, 6.0, -2, tG);
    wipe(s4, 1.73, [C.yellow, C.navy], 1); wipe(s4, 3.73, [C.red, C.cream], -1);
    var adj = s4.layers.addSolid(C.cream, "AJUSTE_PUNCH_NO_KICK", W, H, 1); adj.adjustmentLayer = true; adj.source.parentFolder = fN;
    var tf = adj.property("Effects").addProperty("ADBE Geometry2"); if (tf) tf.property("Scale").expression = "100+3*Math.exp(-(time%0.5)*8)";

    // ===== CENA 5 — FINALIZAÇÃO (32–40s): estádio, logo, fitas, confete, golpe final =====
    var s5 = comp("V2_CENA_05_FINAL", 8); bg(s5, C.royal);
    art(s5, I.estadio_fundo, W / 2, H / 2, 400, 100);
    ribbon(s5, { v: [[-150, 1100], [800, 520], [700, 1150], [380, 880]], i: [[0, 0], [-300, -140], [280, -40], [-50, 160]], o: [[250, -600], [300, 160], [-220, 40], [0, 0]] }, [C.yellow, C.red, C.cream], 74, 0.07, 1.13);
    var lg5 = art(s5, LOGO, W / 2, 800, 0, 38, 0); if (lg5) K(tr(lg5).property("Scale"), [6.0, 6.13, 6.4], [[38, 38, 38], [42, 42, 42], [38, 38, 38]]);
    words(s5, "ESTÃO PREPARADOS?", 112, C.cream, 300, 0.13, { shadow: C.navy });
    words(s5, "PAFIES 2027", 190, C.yellow, 1250, 2.0, { shadow: C.navy });
    var t5 = words(s5, "VAMOS FAZER HISTÓRIA!", 104, C.cream, 1440, 4.13, { rot: -3 }); band(s5, 1440, 980, 135, C.red, 4.0, -3, t5);
    words(s5, "10ª EDIÇÃO · UMA SÓ MISSÃO: FAZER A DIFERENÇA", 46, C.cream, 1590, 5.0);
    var cf = s5.layers.addShape(); cf.name = "CONFETE";
    var cr = cf.property("Contents").addProperty("ADBE Vector Shape - Rect"); cr.property("Size").setValue([22, 10]);
    cf.property("Contents").addProperty("ADBE Vector Graphic - Fill").property("Color").setValue(C.yellow);
    var rp = cf.property("Contents").addProperty("ADBE Vector Filter - Repeater"); rp.property("Copies").setValue(80);
    rp.property("Transform").property("Position").expression = "seedRandom(5,true);[random(-40,40),random(10,60)]"; rp.property("Transform").property("Rotation").expression = "time*40";
    tr(cf).property("Position").expression = "[540, -200 + time*260]";
    camRig(s5, [W / 2, H / 2 - 40, -160], [W / 2, H / 2, 0]);

    // ===== MASTER =====
    var M = proj.items.addComp("PAFIES2027_v2_MASTER_1080x1920", W, H, 1, 40, FPS); M.parentFolder = fC;
    var ord = [[s1, 0], [s2, 6], [s3, 14], [s4, 24], [s5, 32]];
    for (i = ord.length - 1; i >= 0; i--) { var L = M.layers.add(ord[i][0]); L.startTime = ord[i][1]; }
    wipe(M, 13.73, [C.yellow, C.navy, C.cream], 1); wipe(M, 23.73, [C.red, C.yellow, C.royal], -1);
    if (AUD) M.layers.add(AUD);
    var gr = M.layers.addSolid(C.cream, "GRAO_PAPEL", W, H, 1); gr.adjustmentLayer = true; gr.source.parentFolder = fN;
    var nz = gr.property("Effects").addProperty("ADBE Noise"); if (nz) nz.property("Amount of Noise").setValue(5);
    var mk = ["01 ABERTURA", "02 REVELACAO", "03 SOLIDARIEDADE", "04 EXPECTATIVA", "05 FINAL"];
    for (i = 0; i < 5; i++) M.markerProperty.setValueAtTime(ord[i][1], new MarkerValue(mk[i]));
    proj.renderQueue.items.add(M);
    M.openInViewer();
    proj.save(new File(new File($.fileName).parent.fsName + "/PAFIES2027_v2_MASTER.aep"));
    app.endUndoGroup();
    alert("PAFIES 2027 v2: projeto salvo como PAFIES2027_v2_MASTER.aep");
})();
