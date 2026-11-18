/*  PAFIES 2027 — 10ª EDIÇÃO  |  Construtor do projeto After Effects
    -------------------------------------------------------------------
    COMO USAR (After Effects 2022+):
      1. Mantenha a pasta PAFIES_2027 inteira (este script lê ../02_ILLUSTRATOR, ../04_BLENDER, ../08_AUDIO).
      2. File > Scripts > Run Script File…  → selecione este arquivo.
      3. O script cria o projeto organizado e salva PAFIES2027_MASTER.aep nesta pasta.

    O que é criado:
      • Pastas: 00_COMPS / 01_PRECOMPS_CENAS / 02_ILLUSTRATOR / 03_BLENDER_3D / 04_AUDIO / 05_NULLS_CAMERA
      • MASTER 1080x1920 @30fps, 40s, com as 5 cenas pré-compostas no tempo da trilha (120 BPM)
      • Câmera 3D + Null "CAM_CONTROL" (parenting) com push-in, e camadas 3D em Z diferentes (parallax)
      • Text layers animadas (Easy Ease / curvas de velocidade), Shape Layers, Track Matte, Motion Blur
      • Sequências PNG RGBA do Blender (celular, "10", alimentos) como camadas 3D flutuantes
    Observação: os tempos espelham a composição Remotion (05_REMOTION/src/theme.ts).
*/
(function () {
    app.beginUndoGroup("PAFIES 2027 — Build");
    var FPS = 30, W = 1080, H = 1920, DUR = 40;
    var root = new File($.fileName).parent.parent; // .../PAFIES_2027
    var proj = app.newProject();
    proj.bitsPerChannel = 16;

    // ---------- paleta ----------
    function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
    var ROYAL = hex("#1E40C8"), ROYAL_L = hex("#3A63F0"), ROYAL_D = hex("#0A1A5C"), YELLOW = hex("#FFD000"), BLACK = hex("#0A0A0F"), WHITE = hex("#F5F5F2");

    // ---------- pastas ----------
    function folder(n) { var f = proj.items.addFolder(n); return f; }
    var fComps = folder("00_COMPS"), fScenes = folder("01_PRECOMPS_CENAS"), fAI = folder("02_ILLUSTRATOR"),
        f3D = folder("03_BLENDER_3D"), fAud = folder("04_AUDIO"), fSolids = folder("05_SOLIDS_NULLS");

    // ---------- importação ----------
    function imp(path, parent, seq) {
        var file = new File(root.fsName + "/" + path);
        if (!file.exists) { $.writeln("faltando: " + path); return null; }
        var io = new ImportOptions(file);
        if (seq) { io.sequence = true; io.forceAlphabetical = true; }
        var it = proj.importFile(io);
        it.parentFolder = parent;
        if (seq) { it.mainSource.conformFrameRate = FPS; it.mainSource.alphaMode = AlphaMode.STRAIGHT; }
        return it;
    }
    var AI = {};
    var aiNames = ["raio_a", "raio_b", "raio_c", "sunburst_amarelo", "sunburst_azul", "halftone_linear_preto", "halftone_radial_preto",
        "halftone_diagonal_amarelo", "grafismos_kit", "pafies_logo_PROVISORIO"];
    for (var i = 0; i < aiNames.length; i++) AI[aiNames[i]] = imp("02_ILLUSTRATOR/pdf/" + aiNames[i] + ".pdf", fAI, false);
    var B = {};
    var bl = ["phone", "num10", "apple", "can", "rice", "milk", "heart"];
    for (i = 0; i < bl.length; i++) B[bl[i]] = imp("04_BLENDER/renders/" + bl[i] + "/" + bl[i] + "_0001.png", f3D, true);
    var MUSIC = imp("08_AUDIO/PAFIES2027_mix.wav", fAud, false);

    // ---------- helpers ----------
    function comp(name, dur, parent) { var c = proj.items.addComp(name, W, H, 1, dur, FPS); c.parentFolder = parent; c.motionBlur = true; c.shutterAngle = 180; c.bgColor = BLACK; return c; }
    function ease(prop) { // Easy Ease com influência forte (expo-out) — equivalente ao Graph Editor
        for (var k = 1; k <= prop.numKeys; k++) {
            var dims = (prop.value instanceof Array) ? prop.value.length : 1;
            if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) dims = 1;
            var eIn = [], eOut = [];
            for (var d = 0; d < dims; d++) { eIn.push(new KeyframeEase(0, 85)); eOut.push(new KeyframeEase(0, 85)); }
            prop.setTemporalEaseAtKey(k, eIn, eOut);
        }
    }
    function keys(prop, times, values) { for (var k = 0; k < times.length; k++) prop.setValueAtTime(times[k], values[k]); ease(prop); }
    function solid(c, name, col) { var l = c.layers.addSolid(col, name, W, H, 1); l.source.parentFolder = fSolids; return l; }
    function text(c, str, size, col, y, tIn, opts) {
        opts = opts || {};
        var l = c.layers.addText(str);
        var td = l.property("Source Text").value;
        td.resetCharStyle(); td.font = "Anton-Regular"; td.fontSize = size; td.fillColor = col; td.applyFill = true;
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        if (opts.stroke) { td.applyStroke = true; td.strokeColor = opts.stroke; td.strokeWidth = size * 0.04; td.strokeOverFill = false; }
        l.property("Source Text").setValue(td);
        l.motionBlur = true;
        var tr = l.property("Transform");
        tr.property("Position").setValue([W / 2, y]);
        // sombra dura (offset preto) — estética editorial
        var sh = l.property("Effects").addProperty("ADBE Drop Shadow");
        sh.property("Shadow Color").setValue(BLACK); sh.property("Opacity").setValue(255);
        sh.property("Direction").setValue(140); sh.property("Distance").setValue(size * 0.06); sh.property("Softness").setValue(0);
        var mode = opts.mode || "slam";
        if (mode === "slam") {
            keys(tr.property("Scale"), [tIn, tIn + 0.27, tIn + 0.4], [[260, 260], [94, 94], [100, 100]]);
            keys(tr.property("Opacity"), [tIn, tIn + 0.1], [0, 100]);
            var bl = l.property("Effects").addProperty("ADBE Fast Box Blur") || null;
            if (bl) keys(bl.property(1), [tIn, tIn + 0.25], [30, 0]);
        } else if (mode === "up") {
            keys(tr.property("Position"), [tIn, tIn + 0.5], [[W / 2, y + size], [W / 2, y]]);
            keys(tr.property("Opacity"), [tIn, tIn + 0.2], [0, 100]);
            // Text Animator: entrada por caractere (Range Selector com offset animado)
            var an = l.property("Text").property("Animators").addProperty("ADBE Text Animator");
            an.property("Properties").addProperty("ADBE Text Position 3D").setValue([0, size * 0.8, 0]);
            an.property("Properties").addProperty("ADBE Text Opacity").setValue(0);
            var rs = an.property("Selectors").addProperty("ADBE Text Selector");
            keys(rs.property("Offset"), [tIn, tIn + 0.6], [0, 100]);
        } else if (mode === "wide") {
            var tk = l.property("Text").property("Animators").addProperty("ADBE Text Animator");
            var trk = tk.property("Properties").addProperty("ADBE Text Tracking Amount");
            keys(trk, [tIn, tIn + 0.6], [400, 0]);
            keys(tr.property("Opacity"), [tIn, tIn + 0.25], [0, 100]);
        }
        if (opts.out !== undefined) { keys(tr.property("Opacity"), [opts.out, opts.out + 0.25], [100, 0]); }
        if (opts.rot) tr.property("Rotation").setValue(opts.rot);
        return l;
    }
    function footage(c, item, x, y, scale, tIn, z) {
        if (!item) return null;
        var l = c.layers.add(item);
        l.startTime = tIn || 0; l.motionBlur = true;
        if (z !== undefined) { l.threeDLayer = true; l.property("Transform").property("Position").setValue([x, y, z]); }
        else l.property("Transform").property("Position").setValue([x, y]);
        l.property("Transform").property("Scale").setValue(z !== undefined ? [scale, scale, scale] : [scale, scale]);
        return l;
    }
    function wiggleFloat(l, amp) { // flutuação contínua via expressão
        l.property("Transform").property("Position").expression = "value + [Math.sin(time*1.3+index)*" + amp + ", Math.cos(time*1.1+index)*" + amp + (l.threeDLayer ? ", 0]" : "]");
    }
    function rig3D(c, push0, push1) { // câmera 3D + Null de controle (parenting)
        var nul = c.layers.addNull(); nul.name = "CAM_CONTROL"; nul.threeDLayer = true; nul.property("Transform").property("Position").setValue([W / 2, H / 2, 0]);
        nul.source.parentFolder = fSolids;
        var cam = c.layers.addCamera("CAM_PAFIES", [W / 2, H / 2]);
        cam.property("Transform").property("Position").setValue([W / 2, H / 2, -2400]);
        cam.property("Camera Options").property("Zoom").setValue(2400);
        cam.property("Camera Options").property("Depth of Field").setValue(1);
        cam.property("Camera Options").property("Focus Distance").setValue(2400);
        cam.property("Camera Options").property("Aperture").setValue(60);
        cam.parent = nul;
        keys(nul.property("Transform").property("Position"), [0, c.duration], [[W / 2, H / 2, push0], [W / 2, H / 2, push1]]);
        nul.property("Transform").property("Z Rotation").expression = "Math.sin(time*0.6)*1.2";
        return nul;
    }
    function rays(c, item, opacity, speed) {
        var l = footage(c, item, W / 2, H / 2, 260); if (!l) return;
        l.property("Transform").property("Opacity").setValue(opacity);
        l.property("Transform").property("Rotation").expression = "time*" + speed;
        l.blendingMode = BlendingMode.SCREEN; return l;
    }
    function bg(c, col1, col2) {
        var s = solid(c, "BG_GRADIENTE", col2);
        var r = s.property("Effects").addProperty("ADBE Ramp");
        r.property("Start of Ramp").setValue([W / 2, H * 0.42]); r.property("Start Color").setValue(col1);
        r.property("End of Ramp").setValue([W / 2, H * 1.05]); r.property("End Color").setValue(col2);
        r.property("Ramp Shape").setValue(2); // radial
        return s;
    }
    function particles(c, n, col) { // partículas com shape layers + expressões (sem plugins)
        var l = c.layers.addShape(); l.name = "PARTICULAS";
        var g = l.property("Contents").addProperty("ADBE Vector Group");
        var el = g.property("Contents").addProperty("ADBE Vector Shape - Ellipse"); el.property("Size").setValue([12, 12]);
        var fl = g.property("Contents").addProperty("ADBE Vector Graphic - Fill"); fl.property("Color").setValue(col);
        var rp = l.property("Contents").addProperty("ADBE Vector Filter - Repeater");
        rp.property("Copies").setValue(n);
        rp.property("Transform").property("Position").expression = "seedRandom(3,true);[random(-60,60), random(-90,40)]";
        rp.property("Transform").property("Rotation").expression = "time*12";
        l.property("Transform").property("Position").setValue([W / 2, H / 2]);
        var glow = l.property("Effects").addProperty("ADBE Glo2"); if (glow) glow.property("Glow Radius").setValue(30);
        return l;
    }
    function bolt(c, which, x, y, sc, rot, tIn) {
        var l = footage(c, AI["raio_" + which], x, y, sc, 0); if (!l) return;
        l.property("Transform").property("Rotation").setValue(rot);
        keys(l.property("Transform").property("Scale"), [tIn, tIn + 0.25, tIn + 0.4], [[0, 0], [sc * 1.15, sc * 1.15], [sc, sc]]);
        l.property("Transform").property("Rotation").expression = "value + Math.sin(time*5)*4";
        return l;
    }

    // =================== CENAS ===================
    // CENA 01 — ABERTURA
    var s1 = comp("CENA_01_ABERTURA", 6, fScenes);
    solid(s1, "BG_PRETO", BLACK);
    var glow = solid(s1, "LUZ_AZUL", ROYAL_L);
    var mk = glow.property("Masks").addProperty("Mask"); var sh = new Shape();
    sh.vertices = [[540, 760], [840, 1060], [540, 1360], [240, 1060]]; sh.closed = true; mk.property("Mask Shape").setValue(sh);
    mk.property("Mask Feather").setValue([500, 500]);
    keys(glow.property("Transform").property("Opacity"), [0, 2.0, 5.5], [5, 45, 90]);
    glow.property("Transform").property("Scale").expression = "b=[0.4,1.45,2.4,3.25,4.0,4.7]; s=100; for(i=0;i<b.length;i++){d=time-b[i]; if(d>0) s=Math.max(s,100+25*Math.exp(-d*6));} [s,s]";
    footage(s1, AI["halftone_radial_preto"], W / 2, H / 2, 100).property("Transform").property("Opacity").setValue(55);
    text(s1, "EI, GALERA…", 120, WHITE, 820, 1.1, { mode: "up", out: 2.95 });
    text(s1, "ESTÃO", 240, YELLOW, 1000, 3.1);
    text(s1, "PREPARADOS?", 165, YELLOW, 1210, 3.43);
    rig3D(s1, 0, 300);

    // CENA 02 — REVELAÇÃO
    var s2 = comp("CENA_02_REVELACAO", 8, fScenes);
    bg(s2, ROYAL_L, ROYAL_D);
    rays(s2, AI["sunburst_amarelo"], 16, 15);
    footage(s2, AI["halftone_linear_preto"], W / 2, H / 2, 100).property("Transform").property("Opacity").setValue(30);
    particles(s2, 60, YELLOW);
    bolt(s2, "a", 150, 420, 180, -18, 0.2); bolt(s2, "b", 930, 470, 160, 16, 0.33);
    bolt(s2, "c", 120, 1500, 140, 12, 3.47); bolt(s2, "a", 960, 1430, 170, -14, 3.6);
    var logo = footage(s2, AI["pafies_logo_PROVISORIO"], W / 2, 900, 110, 0, 0);
    if (logo) {
        logo.name = "LOGO_PAFIES (substituir pelo original)";
        keys(logo.property("Transform").property("X Rotation"), [0, 1.0], [75, 0]);
        keys(logo.property("Transform").property("Position"), [0, 1.0, 3.07, 3.93], [[W / 2, 900, -900], [W / 2, 900, 0], [W / 2, 900, 0], [W / 2, 560, 0]]);
        var ex = logo.property("Effects").addProperty("ADBE Drop Shadow"); ex.property("Shadow Color").setValue(ROYAL_D); ex.property("Opacity").setValue(255); ex.property("Distance").setValue(18); ex.property("Softness").setValue(0); ex.property("Direction").setValue(180);
    }
    var n10 = footage(s2, B["num10"], W / 2, 1140, 95, 3.07, 0);
    if (n10) { keys(n10.property("Transform").property("Scale"), [3.07, 3.5], [[0, 0, 0], [95, 95, 95]]); }
    text(s2, "ª EDIÇÃO", 110, YELLOW, 1430, 3.73, { mode: "up" });
    // Track Matte: tarja branca revelada por máscara animada
    var tarja = solid(s2, "TARJA_BRANCA", WHITE); tarja.property("Transform").property("Scale").setValue([84, 6.2]);
    tarja.property("Transform").property("Position").setValue([W / 2, 1585]); tarja.property("Transform").property("Rotation").setValue(-2);
    var matte = s2.layers.addShape(); matte.name = "MATTE_TARJA";
    var rc = matte.property("Contents").addProperty("ADBE Vector Shape - Rect"); matte.property("Contents").addProperty("ADBE Vector Graphic - Fill");
    keys(rc.property("Size"), [4.67, 5.0], [[0, 130], [2200, 130]]);
    matte.property("Transform").property("Position").setValue([0, 1585]);
    matte.moveBefore(tarja);
    try { tarja.setTrackMatte(matte, TrackMatteType.ALPHA); } catch (e) { tarja.trackMatteType = TrackMatteType.ALPHA; }
    text(s2, "GINCANA SOLIDÁRIA", 92, ROYAL, 1585, 4.87, { mode: "wide", rot: -2 });
    text(s2, "PAFIES 2027", 150, WHITE, 1740, 5.53);
    rig3D(s2, 300, 0);

    // CENA 03 — SOLIDARIEDADE (alimentos 3D em Z diferentes = parallax + DOF)
    var s3 = comp("CENA_03_SOLIDARIEDADE", 10, fScenes);
    bg(s3, hex("#2E58E6"), ROYAL_D);
    rays(s3, AI["sunburst_azul"], 35, -7);
    var items = [["apple", 200, 520, -200], ["can", 880, 640, 0], ["rice", 170, 1260, -350], ["milk", 900, 1330, -100], ["heart", 540, 330, 900], ["apple", 980, 1000, 1200], ["can", 90, 900, 1400]];
    for (i = 0; i < items.length; i++) { var it = footage(s3, B[items[i][0]], items[i][1], items[i][2], 85, i * 0.2, items[i][3]); if (it) wiggleFloat(it, 30); }
    var ph = footage(s3, B["phone"], W / 2, 960, 92, 0.13, -400);
    if (ph) keys(ph.property("Transform").property("Position"), [0.13, 1.3], [[W / 2, 1900, -400], [W / 2, 960, -400]]);
    var words = ["DESAFIOS", "UNIÃO", "CRIATIVIDADE", "DIVERSÃO", "SOLIDARIEDADE"];
    for (i = 0; i < words.length; i++) { var wl = text(s3, words[i], 150, i % 2 ? WHITE : YELLOW, 1500, 0.6 + i * 0.733); wl.inPoint = 0.6 + i * 0.733; wl.outPoint = 0.6 + i * 0.733 + 0.8; }
    text(s3, "MUITO MAIS QUE", 110, WHITE, 1420, 4.33, { mode: "up", out: 6.67 });
    text(s3, "UMA COMPETIÇÃO.", 130, WHITE, 1550, 4.67, { mode: "up", out: 6.67 });
    text(s3, "UMA MISSÃO DE", 110, WHITE, 1300, 7.07, { mode: "up" });
    text(s3, "SOLIDARIEDADE.", 150, BLACK, 1460, 7.53, { rot: -3 });
    rig3D(s3, 0, 250);

    // CENA 04 — EXPECTATIVA (cortes a cada compasso de 2s)
    var s4 = comp("CENA_04_EXPECTATIVA", 8, fScenes);
    var c1 = solid(s4, "BG_AMARELO", YELLOW); c1.outPoint = 2;
    var c2 = solid(s4, "BG_AZUL", ROYAL); c2.inPoint = 2; c2.outPoint = 4;
    var c3 = solid(s4, "BG_PRETO", BLACK); c3.inPoint = 4; c3.outPoint = 6;
    var t;
    t = text(s4, "PREPARE", 280, BLACK, 800, 0); t.outPoint = 2;
    t = text(s4, "SUA EQUIPE!", 190, ROYAL, 1060, 0.27); t.outPoint = 2;
    t = text(s4, "REÚNA", 240, WHITE, 520, 2.0); t.inPoint = 2; t.outPoint = 4;
    t = text(s4, "A GALERA!", 190, YELLOW, 790, 2.2); t.inPoint = 2; t.outPoint = 4;
    t = text(s4, "ESSA EDIÇÃO", 170, WHITE, 760, 4.0, { mode: "wide" }); t.inPoint = 4; t.outPoint = 6;
    t = text(s4, "PROMETE!", 260, YELLOW, 1030, 4.27); t.inPoint = 4; t.outPoint = 6;
    var nums = ["3", "2", "1"], cols = [ROYAL, YELLOW, BLACK];
    for (i = 0; i < 3; i++) {
        var b = solid(s4, "BG_CONTAGEM_" + nums[i], cols[i]); b.inPoint = 6 + i * 0.5; b.outPoint = 6 + (i + 1) * 0.5 + (i === 2 ? 0.5 : 0);
        t = text(s4, nums[i], 1100, i === 1 ? ROYAL : YELLOW, 1300, 6 + i * 0.5); t.inPoint = b.inPoint; t.outPoint = b.outPoint;
    }
    t = text(s4, "A CONTAGEM REGRESSIVA COMEÇOU!", 62, WHITE, 330, 6, { mode: "wide" }); t.inPoint = 6;
    // micro-zoom no tempo (kick a cada 0,5s)
    var adj = s4.layers.addSolid(WHITE, "AJUSTE_BEAT_PUNCH", W, H, 1); adj.adjustmentLayer = true; adj.source.parentFolder = fSolids;
    var tf = adj.property("Effects").addProperty("ADBE Geometry2");
    if (tf) tf.property("Scale").expression = "t=time%0.5; 100+3.5*Math.exp(-t*8)";

    // CENA 05 — FINALIZAÇÃO
    var s5 = comp("CENA_05_FINAL", 8, fScenes);
    bg(s5, ROYAL_L, ROYAL_D);
    rays(s5, AI["sunburst_amarelo"], 20, 21);
    particles(s5, 80, YELLOW);
    bolt(s5, "a", 130, 820, 200, -16, 0.27); bolt(s5, "b", 950, 880, 200, 14, 0.4);
    bolt(s5, "c", 190, 1290, 140, 20, 0.53); bolt(s5, "a", 900, 1330, 150, -18, 0.67);
    var lg = footage(s5, AI["pafies_logo_PROVISORIO"], W / 2, 880, 112, 0, 0);
    if (lg) { lg.name = "LOGO_PAFIES (substituir pelo original)"; keys(lg.property("Transform").property("X Rotation"), [0, 1.0], [75, 0]); keys(lg.property("Transform").property("Scale"), [6, 6.15, 6.4], [[112, 112, 112], [122, 122, 122], [112, 112, 112]]); }
    text(s5, "ESTÃO PREPARADOS?", 118, WHITE, 430, 0.13, { mode: "up" });
    text(s5, "PAFIES 2027", 185, YELLOW, 1330, 2.0);
    text(s5, "VAMOS FAZER HISTÓRIA!", 104, ROYAL, 1530, 4.13, { mode: "wide", rot: -2 });
    text(s5, "10ª EDIÇÃO · UMA SÓ MISSÃO: FAZER A DIFERENÇA", 40, WHITE, 1660, 5.0, { mode: "wide" });
    rig3D(s5, 300, 0);

    // =================== MASTER ===================
    var master = comp("PAFIES2027_MASTER_1080x1920", DUR, fComps);
    var order = [[s1, 0], [s2, 6], [s3, 14], [s4, 24], [s5, 32]];
    for (i = order.length - 1; i >= 0; i--) { var L = master.layers.add(order[i][0]); L.startTime = order[i][1]; L.collapseTransformation = false; }
    if (MUSIC) master.layers.add(MUSIC);
    // acabamento: vinheta + grão
    var vin = solid(master, "VINHETA", BLACK); var vm = vin.property("Masks").addProperty("Mask"); vm.inverted = true; vm.property("Mask Feather").setValue([600, 600]); vm.property("Mask Expansion").setValue(-120);
    vin.property("Transform").property("Opacity").setValue(45);
    var gr = master.layers.addSolid(WHITE, "GRAO_FILME", W, H, 1); gr.adjustmentLayer = true; gr.source.parentFolder = fSolids;
    var ng = gr.property("Effects").addProperty("ADBE Noise"); if (ng) ng.property("Amount of Noise").setValue(6);
    // marcadores de cena (sincronia com a trilha / narração)
    var mk2 = ["CENA 01 — ABERTURA", "CENA 02 — REVELAÇÃO", "CENA 03 — SOLIDARIEDADE", "CENA 04 — EXPECTATIVA", "CENA 05 — FINALIZAÇÃO"];
    for (i = 0; i < 5; i++) master.markerProperty.setValueAtTime(order[i][1], new MarkerValue(mk2[i]));
    master.openInViewer();

    // fila de render: H.264 (AE 2023+) ou QuickTime
    var rq = proj.renderQueue.items.add(master);
    rq.outputModule(1).file = new File(root.fsName + "/10_FINAL/PAFIES2027_AE_render");
    proj.save(new File(new File($.fileName).parent.fsName + "/PAFIES2027_MASTER.aep"));
    app.endUndoGroup();
    alert("PAFIES 2027: projeto criado e salvo como PAFIES2027_MASTER.aep");
})();
