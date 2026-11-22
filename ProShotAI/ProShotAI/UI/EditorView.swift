import Photos
import SwiftUI

/// Editor não destrutivo: prévia em tempo real (Core Image/GPU), salva parâmetros no Fotos e exporta em resolução total.
struct EditorView: View {
    let asset: PHAsset
    @Environment(\.dismiss) private var dismiss

    enum Tool: String, CaseIterable, Identifiable {
        case presets = "Presets", light = "Luz", color = "Cor", detail = "Detalhe", curve = "Curva"
        var id: String { rawValue }
    }

    @State private var source: EditSource?
    @State private var settings = EditSettings()
    @State private var preview: CGImage?
    @State private var original: CGImage?
    @State private var showOriginal = false
    @State private var tool: Tool = .presets
    @State private var busy = false
    @State private var status: String?
    @State private var exportURL: URL?
    @State private var failed = false
    @State private var renderTask: Task<Void, Never>?

    private static let renderQueue = DispatchQueue(label: "proshot.editor.render", qos: .userInteractive)

    var body: some View {
        VStack(spacing: 0) {
            header
            ZStack {
                Theme.black
                if let img = showOriginal ? original : preview {
                    Image(decorative: img, scale: 1).resizable().aspectRatio(contentMode: .fit)
                } else if failed {
                    Text("Não foi possível abrir esta foto.").foregroundStyle(Theme.dim)
                } else {
                    ProgressView()
                }
                if showOriginal {
                    Text("ORIGINAL").font(Theme.mono(11, .bold)).foregroundStyle(.black)
                        .padding(4).background(Theme.accent).frame(maxHeight: .infinity, alignment: .top).padding(8)
                }
                if let status {
                    Text(status).font(Theme.label(13)).foregroundStyle(.white)
                        .padding(10).background(.black.opacity(0.75), in: Capsule())
                        .frame(maxHeight: .infinity, alignment: .bottom).padding(10)
                }
            }
            .contentShape(Rectangle())
            .onLongPressGesture(minimumDuration: 0.15, pressing: { showOriginal = $0 }, perform: {})

            Picker("Ferramenta", selection: $tool) {
                ForEach(Tool.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 10).padding(.top, 8)

            Group {
                switch tool {
                case .presets: presets
                case .light: sliders(light)
                case .color: VStack(spacing: 6) { profilePicker; sliders(color) }
                case .detail: sliders(detail)
                case .curve: CurveEditor(curve: $settings.curve).frame(height: 170).padding(.horizontal, 16)
                }
            }
            .frame(height: 210)
            .disabled(source == nil)
        }
        .background(Theme.black)
        .preferredColorScheme(.dark)
        .tint(Theme.accent)
        .onAppear(perform: load)
        .onChange(of: settings) { _, _ in scheduleRender() }
    }

    // MARK: - Cabeçalho

    private var header: some View {
        HStack {
            Button("Cancelar") { dismiss() }
            Spacer()
            if source?.isRAW == true { Pill(text: "RAW", active: true) }
            Button { settings = EditSettings() } label: { Image(systemName: "arrow.uturn.backward") }
                .disabled(settings.isIdentity)
                .padding(.horizontal, 8)
            Spacer()
            Menu {
                ForEach(ExportFormat.allCases) { f in
                    Button(f.label) { export(f) }
                }
            } label: { Image(systemName: "square.and.arrow.up") }
                .disabled(source == nil || busy)
            if let exportURL {
                ShareLink(item: exportURL) { Text("Enviar") }
            }
            Button("Salvar") { save() }.bold().disabled(source == nil || busy)
                .padding(.leading, 10)
        }
        .padding(.horizontal, 14)
        .frame(height: 48)
    }

    // MARK: - Ferramentas

    private struct SliderSpec: Identifiable {
        let id: String
        let key: WritableKeyPath<EditSettings, Double>
        let range: ClosedRange<Double>
        var format: (Double) -> String = { String(format: "%+.0f", $0 * 100) }
    }

    private var light: [SliderSpec] {
        [SliderSpec(id: "Exposição", key: \.exposure, range: -3...3, format: { ExposureMath.evLabel($0) + " EV" }),
         SliderSpec(id: "Contraste", key: \.contrast, range: -1...1),
         SliderSpec(id: "Realces", key: \.highlights, range: -1...0),
         SliderSpec(id: "Sombras", key: \.shadows, range: -1...1)]
    }
    private var color: [SliderSpec] {
        [SliderSpec(id: "Temperatura", key: \.temperature, range: -1...1),
         SliderSpec(id: "Matiz", key: \.tint, range: -1...1),
         SliderSpec(id: "Saturação", key: \.saturation, range: -1...1),
         SliderSpec(id: "Vibração", key: \.vibrance, range: -1...1)]
    }
    private var detail: [SliderSpec] {
        [SliderSpec(id: "Nitidez", key: \.sharpness, range: 0...1, format: { "\(Int($0 * 100))" }),
         SliderSpec(id: "Redução de ruído", key: \.noiseReduction, range: 0...1, format: { "\(Int($0 * 100))" })]
    }

    private func sliders(_ specs: [SliderSpec]) -> some View {
        ScrollView {
            VStack(spacing: 4) {
                ForEach(specs) { s in
                    HStack {
                        Text(s.id).font(Theme.label(13, .medium)).foregroundStyle(Theme.text).frame(width: 118, alignment: .leading)
                        Slider(value: $settings[dynamicMember: s.key], in: s.range)
                        Text(s.format(settings[keyPath: s.key])).font(Theme.mono(11)).foregroundStyle(Theme.dim)
                            .frame(width: 58, alignment: .trailing)
                    }
                    .onTapGesture(count: 2) { settings[keyPath: s.key] = EditSettings()[keyPath: s.key] }
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 8)
        }
    }

    private var profilePicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(ColorProfile.allCases) { p in
                    Button { settings.profile = p } label: { Pill(text: p.label, active: settings.profile == p) }
                        .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16).padding(.top, 8)
        }
    }

    private var presets: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(Preset.all) { p in
                    Button {
                        Haptics.tap()
                        settings = p.settings
                    } label: {
                        VStack(spacing: 6) {
                            PresetThumb(base: original, settings: p.settings)
                            Text(p.name).font(Theme.label(11, .semibold))
                                .foregroundStyle(settings == p.settings ? Theme.accent : Theme.text)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
        }
    }

    // MARK: - Renderização

    private func load() {
        ImageProcessor.loadSource(for: asset) { src, previous in
            guard let src else { failed = true; return }
            source = src
            let scale = min(1, 1600 / max(src.fullSize.width, src.fullSize.height, 1))
            Self.renderQueue.async {
                let base = src.image(settings: EditSettings(), scale: scale)
                let cg = base.flatMap { ImageProcessor.render(ImageProcessor.apply(EditSettings(), to: $0, isRAW: src.isRAW)) }
                DispatchQueue.main.async {
                    original = cg
                    if let previous { settings = previous } else { preview = cg }
                }
            }
        }
    }

    private func scheduleRender() {
        guard let src = source else { return }
        let s = settings
        let scale = min(1, 1600 / max(src.fullSize.width, src.fullSize.height, 1))
        renderTask?.cancel()
        renderTask = Task {
            try? await Task.sleep(nanoseconds: 30_000_000)   // agrupa eventos do slider
            guard !Task.isCancelled else { return }
            let cg: CGImage? = await withCheckedContinuation { cont in
                Self.renderQueue.async {
                    let img = src.image(settings: s, scale: scale).map { ImageProcessor.apply(s, to: $0, isRAW: src.isRAW) }
                    cont.resume(returning: img.flatMap(ImageProcessor.render))
                }
            }
            if !Task.isCancelled, let cg { preview = cg }
        }
    }

    private func save() {
        guard let src = source else { return }
        busy = true
        status = "Salvando em resolução total…"
        ImageProcessor.saveNonDestructive(asset: asset, source: src, settings: settings) { result in
            busy = false
            switch result {
            case .success:
                status = "Salvo no Fotos (reversível)"
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { dismiss() }
            case .failure(let e):
                status = "Erro: \(e.localizedDescription)"
            }
        }
    }

    private func export(_ format: ExportFormat) {
        guard let src = source else { return }
        busy = true
        status = "Exportando \(format.label)…"
        let s = settings
        Self.renderQueue.async {
            let result = Result { try ImageProcessor.export(src, settings: s, format: format) }
            DispatchQueue.main.async {
                busy = false
                switch result {
                case .success(let url):
                    exportURL = url
                    status = "Pronto — toque em Enviar"
                case .failure(let e):
                    status = "Erro: \(e.localizedDescription)"
                }
            }
        }
    }
}

private struct PresetThumb: View {
    let base: CGImage?
    let settings: EditSettings
    @State private var thumb: CGImage?

    var body: some View {
        ZStack {
            Theme.graphite
            if let thumb { Image(decorative: thumb, scale: 1).resizable().aspectRatio(contentMode: .fill) }
        }
        .frame(width: 72, height: 72)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .task(id: base == nil) {
            guard let base else { return }
            let s = settings
            thumb = await withCheckedContinuation { cont in
                DispatchQueue.global(qos: .utility).async {
                    let ci = CIImage(cgImage: base)
                    let small = ci.applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: 160 / max(ci.extent.width, 1)])
                    cont.resume(returning: ImageProcessor.render(ImageProcessor.apply(s, to: small, isRAW: false)))
                }
            }
        }
    }
}

/// Editor de curva de tons com 5 pontos arrastáveis.
struct CurveEditor: View {
    @Binding var curve: ToneCurve

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            ZStack {
                Path { p in
                    for i in 1..<4 {
                        let x = w * CGFloat(i) / 4, y = h * CGFloat(i) / 4
                        p.move(to: CGPoint(x: x, y: 0)); p.addLine(to: CGPoint(x: x, y: h))
                        p.move(to: CGPoint(x: 0, y: y)); p.addLine(to: CGPoint(x: w, y: y))
                    }
                }
                .stroke(Theme.line)
                Path { p in
                    p.move(to: CGPoint(x: 0, y: h)); p.addLine(to: CGPoint(x: w, y: 0))
                }
                .stroke(Theme.dim.opacity(0.4), style: StrokeStyle(lineWidth: 1, dash: [3]))
                Path { p in
                    let pts = curve.points.enumerated().map { CGPoint(x: w * ToneCurve.xs[$0.offset], y: h * (1 - $0.element)) }
                    p.move(to: pts[0])
                    for i in 1..<pts.count {
                        let a = pts[i - 1], b = pts[i]
                        p.addQuadCurve(to: CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2), control: a)
                        if i == pts.count - 1 { p.addLine(to: b) }
                    }
                }
                .stroke(Color.white, lineWidth: 1.5)
                ForEach(0..<5, id: \.self) { i in
                    Circle()
                        .fill(Theme.accent)
                        .frame(width: 18, height: 18)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                        .position(x: w * ToneCurve.xs[i], y: h * (1 - curve.points[i]))
                        .gesture(DragGesture().onChanged { g in
                            curve.points[i] = min(max(1 - Double(g.location.y / h), 0), 1)
                        })
                }
            }
        }
        .background(Theme.panel)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .onTapGesture(count: 2) { curve = .linear }
    }
}
