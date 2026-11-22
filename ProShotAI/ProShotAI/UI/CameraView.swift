import AVFoundation
import SwiftUI

struct CameraView: View {
    @StateObject private var engine = CameraEngine()
    @Environment(\.scenePhase) private var scenePhase

    @AppStorage("grid") private var grid: GridStyle = .thirds
    @AppStorage("showHistogram") private var showHistogram = true
    @AppStorage("peaking") private var peaking = false
    @AppStorage("zebra") private var zebra = false
    @AppStorage("level") private var showLevel = true
    @AppStorage("zebraThreshold") private var zebraThreshold = 0.95
    @AppStorage("peakingSensitivity") private var peakingSensitivity = 0.35

    @State private var selected: ManualParameter?
    @State private var showSettings = false
    @State private var showGallery = false
    @State private var focusPoint: CGPoint?
    @State private var focusID = UUID()
    @State private var pinchStartZoom: CGFloat = 1

    var body: some View {
        ZStack {
            Theme.black.ignoresSafeArea()
            switch engine.status {
            case .unauthorized:
                PermissionView()
            case .unavailable(let reason):
                UnavailableView(reason: reason)
            default:
                camera
            }
        }
        .preferredColorScheme(.dark)
        .statusBarHidden()
        .onAppear { engine.start(); syncAnalyzer() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { engine.start() } else if phase == .background { engine.stop() }
        }
        .onChange(of: peaking) { _, _ in syncAnalyzer() }
        .onChange(of: zebra) { _, _ in syncAnalyzer() }
        .onChange(of: showHistogram) { _, _ in syncAnalyzer() }
        .onChange(of: zebraThreshold) { _, _ in syncAnalyzer() }
        .onChange(of: peakingSensitivity) { _, _ in syncAnalyzer() }
        .onChange(of: selected) { _, _ in syncAnalyzer() }
        .onChange(of: engine.focusAuto) { _, _ in syncAnalyzer() }
        .sheet(isPresented: $showSettings) {
            SettingsSheet(engine: engine, grid: $grid, showHistogram: $showHistogram, peaking: $peaking,
                          zebra: $zebra, showLevel: $showLevel, zebraThreshold: $zebraThreshold,
                          peakingSensitivity: $peakingSensitivity)
                .presentationDetents([.medium, .large])
        }
        .fullScreenCover(isPresented: $showGallery) { GalleryView() }
    }

    private func syncAnalyzer() {
        let a = engine.analyzer
        a.histogramEnabled = showHistogram
        a.peakingEnabled = peaking
        a.zebraEnabled = zebra
        a.zebraThreshold = Float(zebraThreshold)
        a.peakingSensitivity = Float(peakingSensitivity)
        a.loupeEnabled = selected == .focus && !engine.focusAuto
    }

    // MARK: - Layout

    private var camera: some View {
        VStack(spacing: 0) {
            TopBar(engine: engine, grid: $grid, showSettings: $showSettings)
            GeometryReader { geo in
                let w = min(geo.size.width, geo.size.height * 3 / 4)
                viewfinder
                    .frame(width: w, height: w * 4 / 3)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            InfoStrip(engine: engine)
                .padding(.vertical, 5)
            ManualControlPanel(engine: engine, selected: $selected)
                .padding(.horizontal, 10)
            LensSelector(engine: engine)
                .frame(height: 50)
            BottomBar(engine: engine, showGallery: $showGallery)
                .padding(.bottom, 6)
        }
    }

    private var viewfinder: some View {
        ZStack {
            CameraPreview(session: engine.session,
                          onTap: { p, d in
                              if engine.aeafLocked { engine.unlockAEAF() }
                              engine.focusAndExpose(at: d, lock: false)
                              showReticle(p)
                          },
                          onLongPress: { p, d in
                              engine.focusAndExpose(at: d, lock: true)
                              UINotificationFeedbackGenerator().notificationOccurred(.success)
                              showReticle(p)
                          },
                          onPinch: { scale, began in
                              if began { pinchStartZoom = engine.digitalZoom }
                              engine.setDigitalZoom(pinchStartZoom * scale)
                          })
            AnalyzerOverlay(analyzer: engine.analyzer)
            GridOverlay(style: grid)
            if showLevel { LevelIndicator(motion: engine.motion) }
            if let p = focusPoint {
                FocusReticle(locked: engine.aeafLocked)
                    .id(focusID)
                    .position(p)
            }
            VStack {
                HStack(alignment: .top) {
                    if showHistogram { HistogramPanel(analyzer: engine.analyzer) }
                    Spacer()
                    LoupePanel(analyzer: engine.analyzer)
                }
                Spacer()
                ExposureMeter(offset: engine.isoAuto && engine.shutterAuto ? engine.meterOffset : engine.meterOffset - engine.bias)
                    .opacity(engine.isoAuto && engine.shutterAuto ? 0.5 : 1)
            }
            .padding(8)
            if engine.countdown > 0 {
                Text("\(engine.countdown)")
                    .font(.system(size: 96, weight: .thin, design: .rounded))
                    .foregroundStyle(.white)
                    .shadow(radius: 8)
                    .transition(.scale)
            }
            if let msg = engine.message {
                Text(msg)
                    .font(Theme.label(13, .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(.black.opacity(0.75), in: Capsule())
                    .frame(maxHeight: .infinity, alignment: .top)
                    .padding(.top, 74)
                    .onTapGesture { engine.message = nil }
                    .task(id: msg) {
                        try? await Task.sleep(nanoseconds: 3_000_000_000)
                        if engine.message == msg { engine.message = nil }
                    }
            }
            Color.black.opacity(engine.shutterBlink ? 0.85 : 0).allowsHitTesting(false)
        }
        .clipped()
    }

    private func showReticle(_ p: CGPoint) {
        focusPoint = p
        focusID = UUID()
    }
}

// MARK: - Subviews que observam o analisador (evita redesenhar a tela toda a cada quadro)

private struct AnalyzerOverlay: View {
    @ObservedObject var analyzer: FrameAnalyzer
    var body: some View {
        if let img = analyzer.overlay {
            Image(decorative: img, scale: 1)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .allowsHitTesting(false)
        }
    }
}

private struct HistogramPanel: View {
    @ObservedObject var analyzer: FrameAnalyzer
    var body: some View { HistogramView(histogram: analyzer.histogram) }
}

private struct LoupePanel: View {
    @ObservedObject var analyzer: FrameAnalyzer
    var body: some View {
        if let img = analyzer.loupe { FocusLoupe(image: img) }
    }
}

// MARK: - Barras

private struct TopBar: View {
    @ObservedObject var engine: CameraEngine
    @Binding var grid: GridStyle
    @Binding var showSettings: Bool

    var body: some View {
        HStack(spacing: 2) {
            Menu {
                ForEach(FlashSetting.allCases) { f in
                    let ok = f == .off || (f == .torch ? engine.caps.torch : engine.caps.flash)
                    Button {
                        engine.flash = f
                    } label: {
                        Label(ok ? f.label : "\(f.label) — indisponível", systemImage: f.symbol)
                    }
                    .disabled(!ok)
                }
            } label: {
                Image(systemName: engine.flash.symbol)
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(engine.flash == .off ? Theme.text : Theme.accent)
                    .frame(width: 44, height: 44)
            }

            IconButton(symbol: "timer", active: engine.timerSeconds > 0,
                       badge: engine.timerSeconds > 0 ? "\(engine.timerSeconds)s" : nil) {
                engine.timerSeconds = engine.timerSeconds == 0 ? 3 : (engine.timerSeconds == 3 ? 10 : 0)
            }
            IconButton(symbol: "square.stack.3d.down.right", active: engine.burstCount > 1,
                       badge: engine.burstCount > 1 ? "\(engine.burstCount)" : nil) {
                engine.burstCount = engine.burstCount == 1 ? 5 : (engine.burstCount == 5 ? 10 : 1)
            }
            IconButton(symbol: "grid", active: grid != .off) {
                let all = GridStyle.allCases
                grid = all[(all.firstIndex(of: grid)! + 1) % all.count]
            }

            Spacer()

            if engine.aeafLocked {
                Button { engine.unlockAEAF() } label: { Pill(text: "AE/AF L", active: true) }
                    .buttonStyle(.plain)
            }

            Menu {
                ForEach(CaptureFormat.allCases) { f in
                    let ok = engine.caps.supports(f)
                    Button {
                        engine.format = f
                    } label: {
                        Text(ok ? "\(f.label) — \(f.detail)" : "\(f.label) — não suportado neste iPhone/lente")
                    }
                    .disabled(!ok)
                }
            } label: {
                Pill(text: engine.format.label, active: engine.format == .raw || engine.format == .rawPlusHEIF || engine.format == .proRAW)
                    .frame(height: 44)
            }

            IconButton(symbol: "slider.horizontal.3") { showSettings = true }
        }
        .padding(.horizontal, 6)
        .frame(height: 46)
        .background(Theme.black)
    }
}

private struct InfoStrip: View {
    @ObservedObject var engine: CameraEngine
    var body: some View {
        let ev = ExposureMath.sceneEV(aperture: Double(engine.caps.aperture), shutter: engine.shutter,
                                      iso: Double(engine.iso), meterOffset: Double(engine.meterOffset))
        let focal = (engine.currentLens?.focal35 ?? 0) * Double(engine.digitalZoom)
        HStack(spacing: 10) {
            item("ISO", "\(Int(engine.iso.rounded()))", manual: !engine.isoAuto)
            item("S", ExposureMath.shutterLabel(engine.shutter), manual: !engine.shutterAuto)
            item("F", String(format: "%.1f", engine.caps.aperture), manual: false)
            item("WB", "\(Int(engine.temperature / 100) * 100)K", manual: !engine.wbAuto)
            item("EV", String(format: "%.1f", ev), manual: false)
            item("LUX", luxText(ExposureMath.lux(fromEV: ev)), manual: false)
            item("", "\(Int(focal.rounded()))mm", manual: engine.digitalZoom > 1.01)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }

    private func luxText(_ l: Double) -> String {
        l >= 10000 ? String(format: "%.0fk", l / 1000) : l >= 1000 ? String(format: "%.1fk", l / 1000) : "\(Int(l))"
    }

    private func item(_ k: String, _ v: String, manual: Bool) -> some View {
        HStack(spacing: 2) {
            if !k.isEmpty { Text(k).font(Theme.mono(8, .bold)).foregroundStyle(Theme.dim) }
            Text(v).font(Theme.mono(11, .semibold)).foregroundStyle(manual ? Theme.accent : Theme.text)
        }
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
}

private struct BottomBar: View {
    @ObservedObject var engine: CameraEngine
    @Binding var showGallery: Bool

    var body: some View {
        HStack {
            Button { showGallery = true } label: {
                Group {
                    if let t = engine.lastThumbnail {
                        Image(uiImage: t).resizable().aspectRatio(contentMode: .fill)
                    } else {
                        Image(systemName: "photo.on.rectangle").font(.system(size: 20)).foregroundStyle(Theme.text)
                    }
                }
                .frame(width: 52, height: 52)
                .background(Theme.graphite)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.line))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Galeria")
            .frame(maxWidth: .infinity)

            ShutterButton(capturing: engine.isCapturing, countingDown: engine.countdown > 0, burst: engine.burstCount) {
                engine.shutterPressed()
            }

            Button {
                Haptics.tap()
                let front = engine.lenses.first { $0.isFront }
                let wide = engine.lenses.first { !$0.isFront && abs($0.opticalZoom - 1) < 0.05 } ?? engine.lenses.first { !$0.isFront }
                if engine.currentLens?.isFront == true { if let wide { engine.select(wide) } } else if let front { engine.select(front) }
            } label: {
                Image(systemName: "arrow.triangle.2.circlepath.camera")
                    .font(.system(size: 20))
                    .foregroundStyle(Theme.text)
                    .frame(width: 52, height: 52)
                    .background(Circle().fill(Theme.graphite))
            }
            .buttonStyle(.plain)
            .disabled(!engine.lenses.contains { $0.isFront })
            .accessibilityLabel("Alternar câmera")
            .frame(maxWidth: .infinity)
        }
        .frame(height: 92)
    }
}

private struct ShutterButton: View {
    let capturing: Bool
    let countingDown: Bool
    let burst: Int
    let action: () -> Void
    @State private var pressed = false

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle().stroke(Color.white, lineWidth: 4).frame(width: 78, height: 78)
                Circle()
                    .fill(capturing || countingDown ? Theme.rec : Color.white)
                    .frame(width: capturing ? 52 : 64, height: capturing ? 52 : 64)
                    .scaleEffect(pressed ? 0.9 : 1)
                if burst > 1 {
                    Text("\(burst)").font(Theme.mono(14, .bold)).foregroundStyle(.black)
                }
                if countingDown {
                    Image(systemName: "xmark").font(.system(size: 18, weight: .bold)).foregroundStyle(.white)
                }
            }
            .animation(.spring(response: 0.2, dampingFraction: 0.6), value: capturing)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(DragGesture(minimumDistance: 0)
            .onChanged { _ in pressed = true }
            .onEnded { _ in pressed = false })
        .accessibilityLabel(countingDown ? "Cancelar temporizador" : "Disparar")
    }
}

// MARK: - Estados de erro

private struct PermissionView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.fill").font(.system(size: 44)).foregroundStyle(Theme.accent)
            Text("Acesso à câmera necessário").font(Theme.label(20, .bold)).foregroundStyle(Theme.text)
            Text("Permita o acesso em Ajustes para usar o ProShot AI.")
                .font(Theme.label(14, .regular)).foregroundStyle(Theme.dim).multilineTextAlignment(.center)
            Button("Abrir Ajustes") {
                if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            }
            .buttonStyle(.borderedProminent).tint(Theme.accent).foregroundStyle(.black)
        }
        .padding(32)
    }
}

private struct UnavailableView: View {
    let reason: String
    @State private var showGallery = false
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.badge.ellipsis").font(.system(size: 44)).foregroundStyle(Theme.dim)
            Text(reason).font(Theme.label(16, .semibold)).foregroundStyle(Theme.text).multilineTextAlignment(.center)
            Text("O simulador não tem câmera. Instale em um iPhone físico.")
                .font(Theme.label(13, .regular)).foregroundStyle(Theme.dim)
            Button("Abrir galeria") { showGallery = true }
                .buttonStyle(.bordered).tint(Theme.accent)
        }
        .padding(32)
        .fullScreenCover(isPresented: $showGallery) { GalleryView() }
    }
}
