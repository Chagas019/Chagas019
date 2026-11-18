/*  ============================================================
    O CHAMADO — montagem no After Effects (ExtendScript)
    Arquivo > Scripts > Executar arquivo de script… > OChamado_montagem.jsx
    Requer: pasta ../render com as sequências PNG geradas pelo Blender
            (cenaN_obj = objetos com alfa, cenaN_bg = cenário 15 qps)
    Cria: pastas organizadas, 1 comp por cena (fundo + objetos + luz),
          comp MASTER 1080x1920 30 qps com transições, tipografia,
          narração, trilha, color grading, e fila de render H.264.
    ============================================================ */
(function () {
    app.beginUndoGroup("O CHAMADO - montagem");
    var ROOT = new File($.fileName).parent, BASE = ROOT.parent;
    var W = 1080, H = 1920, FPS = 30, HANDLE = 12;
    var G = [0, 6.5, 12.5, 20.5, 26.5, 32], SCN = [195, 180, 240, 180, 165];
    var NOMES = ["01 O INICIO", "02 O CHAMADO", "03 OS TALENTOS", "04 A RESPOSTA", "05 ENCERRAMENTO"];
    function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }

    app.newProject(); var P = app.project;
    var fMaster = P.items.addFolder("00_MASTER"), fCenas = P.items.addFolder("01_CENAS 3D"), fSeq = P.items.addFolder("02_RENDERS BLENDER"),
        fAud = P.items.addFolder("03_AUDIO"), fSol = P.items.addFolder("04_SOLIDOS");

    function ease(prop) { for (var k = 1; k <= prop.numKeys; k++) { var n = prop.propertyValueType === PropertyValueType.ThreeD ? 3 : (prop.propertyValueType === PropertyValueType.TwoD ? 2 : 1);
        if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) n = 1;
        var a = []; for (var d = 0; d < n; d++) a.push(new KeyframeEase(0, 75)); try { prop.setTemporalEaseAtKey(k, a, a); } catch (e) {} } }
    function keys(prop, ts, vs) { for (var i = 0; i < ts.length; i++) prop.setValueAtTime(ts[i], vs[i]); ease(prop); }
    function seq(dir, fps) {
        var f = new Folder(BASE.fsName + "/render/" + dir); if (!f.exists) return null;
        var files = f.getFiles("*.png"); if (!files.length) return null;
        files.sort(); var io = new ImportOptions(files[0]); io.sequence = true; io.forceAlphabetical = true;
        var it = P.importFile(io); it.mainSource.conformFrameRate = fps; it.parentFolder = fSeq; it.name = dir; return it;
    }

    // ---------------- comps de cena ----------------
    var cenas = [];
    for (var s = 0; s < 5; s++) {
        var dur = (SCN[s] + 2 * HANDLE) / FPS;
        var C = P.items.addComp("CENA " + NOMES[s], W, H, 1, dur, FPS); C.parentFolder = fCenas;
        var bg = seq("cena" + (s + 1) + "_bg", FPS / 2), ob = seq("cena" + (s + 1) + "_obj", FPS);
        if (bg) { var lb = C.layers.add(bg); lb.name = "CENARIO (Blender, sombras reais)"; lb.property("ADBE Transform Group").property("ADBE Scale").setValue([300, 300]); lb.frameBlendingType = FrameBlendingType.PIXEL_MOTION; C.frameBlending = true; }
        if (ob) {
            var lo = C.layers.add(ob); lo.name = "OBJETOS 3D (Blender, alfa)";
            var sc = (s === 3) ? 200 : 150; lo.property("ADBE Transform Group").property("ADBE Scale").setValue([sc, sc]);
            var gl = lo.property("ADBE Effect Parade").addProperty("ADBE Glo2"); try { gl.property("ADBE Glo2-0003").setValue(80); gl.property("ADBE Glo2-0004").setValue(.35); } catch (e) {}
        }
        cenas.push(C);
    }

    // ---------------- MASTER ----------------
    var M = P.items.addComp("O CHAMADO - MASTER 1080x1920", W, H, 1, 32, FPS); M.parentFolder = fMaster;
    for (s = 4; s >= 0; s--) {
        var L = M.layers.add(cenas[s]); L.name = "CENA " + NOMES[s];
        L.startTime = G[s] - HANDLE / FPS; L.inPoint = Math.max(0, G[s] - .2); L.outPoint = G[s + 1] + .2;
        if (s > 0) keys(L.property("ADBE Transform Group").property("ADBE Opacity"), [G[s] - .2, G[s] + .2], [0, 100]);
    }
    // texto (linha sans + linha serifada itálica)
    var INK = ["#2B2118", "#1F1D1B", "#FFFFFF", "#FFFFFF", "#FFFFFF"], ACC = ["#8E0B1A", "#8E0B1A", "#F6DDA8", "#F2B544", "#E9C27A"];
    var CAPS = [[1.75, 6.15, 0, "EXISTE UM PROPÓSITO", "para a sua vida."], [8.25, 12.2, 1, "DEUS CONTINUA", "chamando."],
        [13.4, 15.45, 2, "ELE TE DEU", "dons."], [15.45, 17.45, 2, "ELE TE DEU", "talentos."], [17.45, 20.25, 2, "ELE TE DEU", "uma missão."],
        [21.35, 23.85, 3, "O CHAMADO NÃO É SOBRE", "ser perfeito."], [23.95, 26.3, 3, "É SOBRE ESTAR", "disponível."], [27.15, 31.9, 4, "QUAL É A SUA", "resposta?"]];
    function txt(str, font, size, col, y, a, b, track) {
        var l = M.layers.addText(str), sp = l.property("ADBE Text Properties").property("ADBE Text Document"), d = sp.value;
        d.font = font; d.fontSize = size; d.fillColor = hex(col); d.tracking = track; d.justification = ParagraphJustification.CENTER_JUSTIFY; d.applyStroke = false; sp.setValue(d);
        l.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, y]);
        l.inPoint = a; l.outPoint = b + .05; l.motionBlur = true;
        keys(l.property("ADBE Transform Group").property("ADBE Opacity"), [a, a + .8, b - .5, b], [0, 100, 100, 0]);
        keys(l.property("ADBE Transform Group").property("ADBE Position"), [a, a + .9], [[W / 2, y + 30], [W / 2, y]]);
        var bl = l.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
        keys(bl.property("ADBE Gaussian Blur 2-0001"), [a, a + .8, b - .5, b], [12, 0, 0, 8]);
        return l;
    }
    for (var i = 0; i < CAPS.length; i++) {
        var c = CAPS[i]; var y = c[2] === 2 ? 290 : 300;
        txt(c[3], "InterDisplay-Light", 52, INK[c[2]], y, c[0], c[1], 220).name = "TXT " + c[3];
        txt(c[4], "CormorantGaramond-MediumItalic", 128, ACC[c[2]], y + 128, c[0] + .16, c[1], 0).name = "TXT " + c[4];
    }
    txt("Sim, Senhor.", "CormorantGaramond-MediumItalic", 76, "#E9C27A", 1585, 29.45, 31.95, 0).name = "TXT Sim, Senhor.";
    txt("EIS-ME AQUI", "InterDisplay-Light", 40, "#FFFFFF", 1660, 29.6, 31.95, 300).name = "TXT EIS-ME AQUI";

    // grading + grão + vinheta + fades
    var adj = M.layers.addSolid([1, 1, 1], "AJUSTE  color grading + grão", W, H, 1, 32); adj.adjustmentLayer = true; adj.source.parentFolder = fSol;
    var cb = adj.property("ADBE Effect Parade").addProperty("ADBE Brightness & Contrast 2"); try { cb.property(2).setValue(6); } catch (e) {}
    var ns = adj.property("ADBE Effect Parade").addProperty("ADBE Noise"); try { ns.property(1).setValue(2.5); } catch (e) {}
    var fd = M.layers.addSolid([0, 0, 0], "FADE", W, H, 1, 32); fd.source.parentFolder = fSol;
    keys(fd.property("ADBE Transform Group").property("ADBE Opacity"), [0, .6, 31.3, 32], [100, 0, 0, 100]);

    // áudio
    var au = ["mix_final.wav", "narracao_sincronizada.wav", "trilha_instrumental.wav"];
    for (i = 0; i < au.length; i++) {
        var af = new File(BASE.fsName + "/audio/" + au[i]); if (!af.exists) continue;
        var ai = P.importFile(new ImportOptions(af)); ai.parentFolder = fAud;
        var al = M.layers.add(ai); al.name = "AUDIO " + au[i]; if (i > 0) al.audioEnabled = false; // mix final ativo; stems para remixar
    }
    var mk = [[0, "CENA 01 O INÍCIO"], [6.5, "CENA 02 O CHAMADO"], [12.5, "CENA 03 OS TALENTOS"], [20.5, "CENA 04 A RESPOSTA"], [26.5, "CENA 05 ENCERRAMENTO"]];
    for (i = 0; i < mk.length; i++) M.markerProperty.setValueAtTime(mk[i][0], new MarkerValue(mk[i][1]));

    var rq = P.renderQueue.items.add(M), om = rq.outputModule(1), tp = om.templates;
    for (i = 0; i < tp.length; i++) if (/H\.264/i.test(tp[i])) { om.applyTemplate(tp[i]); break; }
    new Folder(BASE.fsName + "/render_ae").create(); om.file = new File(BASE.fsName + "/render_ae/O_CHAMADO_AE.mp4");
    P.save(new File(ROOT.fsName + "/O_CHAMADO.aep")); M.openInViewer();
    app.endUndoGroup();
    alert("O CHAMADO: projeto montado e salvo em\n" + ROOT.fsName + "/O_CHAMADO.aep");
})();
