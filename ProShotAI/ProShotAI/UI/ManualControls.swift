import SwiftUI

/// Régua horizontal arrastável (dial de câmera). `value` normalizado 0…1.
struct RulerDial: View {
    @Binding var value: Double
    var ticks = 60
    var spacing: CGFloat = 9
    var enabled = true
    @State private var dragStart: Double?

    var body: some View {
        Canvas { ctx, size in
            let center = size.width / 2
            let offset = CGFloat(value) * CGFloat(ticks) * spacing
            for i in 0...ticks {
                let x = center + CGFloat(i) * spacing - offset
                guard x >= -2, x <= size.width + 2 else { continue }
                let major = i % 5 == 0
                let h: CGFloat = major ? 18 : 9
                let fade = 1 - min(1, abs(x - center) / (size.width / 2)) * 0.8
                var p = Path()
                p.move(to: CGPoint(x: x, y: size.height / 2 - h / 2))
                p.addLine(to: CGPoint(x: x, y: size.height / 2 + h / 2))
                ctx.stroke(p, with: .color(.white.opacity((major ? 0.9 : 0.45) * fade)), lineWidth: major ? 1.4 : 1)
            }
            var c = Path()
            c.move(to: CGPoint(x: center, y: 2))
            c.addLine(to: CGPoint(x: center, y: size.height - 2))
            ctx.stroke(c, with: .color(enabled ? Theme.accent : Theme.dim), lineWidth: 2)
        }
        .frame(height: 38)
        .contentShape(Rectangle())
        .opacity(enabled ? 1 : 0.4)
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { g in
                    guard enabled else { return }
                    if dragStart == nil { dragStart = value }
                    let delta = -Double(g.translation.width) / Double(CGFloat(ticks) * spacing)
                    let nv = min(max((dragStart ?? value) + delta, 0), 1)
                    if Int(nv * Double(ticks)) != Int(value * Double(ticks)) { Haptics.tick() }
                    value = nv
                }
                .onEnded { _ in dragStart = nil }
        )
        .accessibilityAdjustableAction { dir in
            value = min(max(value + (dir == .increment ? 1 : -1) / Double(ticks), 0), 1)
        }
    }
}

/// Chips de parâmetros + dial do parâmetro selecionado.
struct ManualControlPanel: View {
    @ObservedObject var engine: CameraEngine
    @Binding var selected: ManualParameter?

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                ForEach(ManualParameter.allCases) { p in
                    chip(p)
                }
            }
            if let p = selected {
                dialPanel(p)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeOut(duration: 0.18), value: selected)
    }

    private func available(_ p: ManualParameter) -> Bool {
        switch p {
        case .iso, .shutter: return engine.caps.customExposure
        case .focus: return engine.caps.manualFocus
        case .whiteBalance: return engine.caps.manualWhiteBalance
        case .exposureBias: return true
        }
    }

    private func isAuto(_ p: ManualParameter) -> Bool {
        switch p {
        case .iso: return engine.isoAuto
        case .shutter: return engine.shutterAuto
        case .focus: return engine.focusAuto
        case .whiteBalance: return engine.wbAuto
        case .exposureBias: return engine.bias == 0
        }
    }

    private func valueText(_ p: ManualParameter) -> String {
        switch p {
        case .iso: return "\(Int(engine.iso.rounded()))"
        case .shutter: return ExposureMath.shutterLabel(engine.shutter)
        case .focus: return engine.focusAuto ? "AF" : String(format: "%.2f", engine.lensPosition)
        case .whiteBalance: return "\(Int(engine.temperature / 50) * 50)K"
        case .exposureBias: return ExposureMath.evLabel(Double(engine.bias))
        }
    }

    private func chip(_ p: ManualParameter) -> some View {
        let isSel = selected == p
        let ok = available(p)
        return Button {
            Haptics.tap()
            selected = isSel ? nil : p
        } label: {
            VStack(spacing: 1) {
                Text(p.short).font(Theme.mono(9, .bold))
                    .foregroundStyle(isAuto(p) ? Theme.dim : Theme.accent)
                Text(ok ? valueText(p) : "N/D").font(Theme.mono(12, .semibold))
                    .foregroundStyle(ok ? Theme.text : Theme.dim)
                    .lineLimit(1).minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity, minHeight: 40)
            .background(isSel ? Theme.graphite : Theme.panel, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(isSel ? Theme.accent : Theme.line, lineWidth: isSel ? 1.2 : 1))
        }
        .buttonStyle(.plain)
        .disabled(!ok)
        .accessibilityLabel("\(p.short) \(valueText(p))")
    }

    @ViewBuilder
    private func dialPanel(_ p: ManualParameter) -> some View {
        let caps = engine.caps
        VStack(spacing: 4) {
            HStack {
                Button(isAuto(p) ? "AUTO ✓" : "AUTO") {
                    Haptics.tap()
                    switch p {
                    case .iso: engine.setAutoISO()
                    case .shutter: engine.setAutoShutter()
                    case .focus: engine.setAutoFocus()
                    case .whiteBalance: engine.setAutoWhiteBalance()
                    case .exposureBias: engine.setBias(0)
                    }
                }
                .font(Theme.mono(11, .bold))
                .foregroundStyle(isAuto(p) ? .black : Theme.text)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(isAuto(p) ? Theme.accent : Theme.graphite, in: Capsule())
                Spacer()
                Text(rangeText(p)).font(Theme.mono(10)).foregroundStyle(Theme.dim)
            }
            switch p {
            case .iso:
                RulerDial(value: Binding(
                    get: { ExposureMath.logNormalized(Double(engine.iso), min: Double(caps.minISO), max: Double(caps.maxISO)) },
                    set: { engine.setISO(Float(ExposureMath.logValue($0, min: Double(caps.minISO), max: Double(caps.maxISO)))) }))
            case .shutter:
                RulerDial(value: Binding(
                    get: { 1 - ExposureMath.logNormalized(engine.shutter, min: caps.minShutter, max: caps.maxShutter) },
                    set: { engine.setShutter(ExposureMath.logValue(1 - $0, min: caps.minShutter, max: caps.maxShutter)) }),
                          ticks: 80)
            case .focus:
                RulerDial(value: Binding(
                    get: { Double(engine.lensPosition) },
                    set: { engine.setLensPosition(Float($0)) }), ticks: 100, spacing: 7)
                HStack {
                    Image(systemName: "camera.macro").font(.system(size: 11))
                    Spacer()
                    Image(systemName: "mountain.2").font(.system(size: 11))
                }.foregroundStyle(Theme.dim).padding(.horizontal, 4)
            case .whiteBalance:
                RulerDial(value: Binding(
                    get: { (Double(engine.temperature) - 2000) / 8000 },
                    set: { engine.setWhiteBalance(temperature: Float(2000 + $0 * 8000), tint: engine.tint) }), ticks: 80)
                HStack(spacing: 8) {
                    Text("MATIZ").font(Theme.mono(9, .bold)).foregroundStyle(Theme.dim)
                    RulerDial(value: Binding(
                        get: { (Double(engine.tint) + 150) / 300 },
                        set: { engine.setWhiteBalance(temperature: engine.temperature, tint: Float($0 * 300 - 150)) }), ticks: 60, spacing: 6)
                        .frame(height: 26)
                    Text(String(format: "%+.0f", engine.tint)).font(Theme.mono(10)).foregroundStyle(Theme.text).frame(width: 34)
                }
            case .exposureBias:
                RulerDial(value: Binding(
                    get: { (Double(engine.bias) - Double(caps.minBias)) / Double(max(caps.maxBias - caps.minBias, 0.1)) },
                    set: { v in
                        let raw = Double(caps.minBias) + v * Double(caps.maxBias - caps.minBias)
                        engine.setBias(Float((raw * 3).rounded() / 3))   // passos de 1/3 EV
                    }), ticks: 60)
            }
        }
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 10))
    }

    private func rangeText(_ p: ManualParameter) -> String {
        let c = engine.caps
        switch p {
        case .iso: return "ISO \(Int(c.minISO))–\(Int(c.maxISO))"
        case .shutter: return "\(ExposureMath.shutterLabel(c.minShutter)) – \(ExposureMath.shutterLabel(c.maxShutter))"
        case .focus: return "posição da lente 0–1"
        case .whiteBalance: return "2000–10000K"
        case .exposureBias: return "\(ExposureMath.evLabel(Double(c.minBias)))…\(ExposureMath.evLabel(Double(c.maxBias))) EV"
        }
    }
}

/// Seletor de lentes ópticas + indicador de zoom digital.
struct LensSelector: View {
    @ObservedObject var engine: CameraEngine

    var body: some View {
        let back = engine.lenses.filter { !$0.isFront }
        HStack(spacing: 8) {
            if engine.currentLens?.isFront == true {
                Pill(text: "FRONTAL", active: true)
            } else {
                ForEach(back) { lens in
                    let current = lens.id == engine.currentLens?.id
                    Button {
                        Haptics.tap()
                        engine.select(lens)
                    } label: {
                        Text(current && engine.digitalZoom > 1.01
                             ? ExposureMath.zoomLabel(lens.opticalZoom * Double(engine.digitalZoom))
                             : lens.zoomLabel)
                            .font(Theme.mono(12, .bold))
                            .foregroundStyle(current ? Theme.accent : Theme.text)
                            .frame(width: current ? 46 : 38, height: current ? 46 : 38)
                            .background(Circle().fill(Theme.graphite.opacity(current ? 1 : 0.7)))
                            .overlay(Circle().stroke(current ? Theme.accent : Theme.line))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(lens.name) \(lens.zoomLabel)")
                }
            }
            if engine.digitalZoom > 1.01 {
                Button {
                    engine.setDigitalZoom(1)
                } label: {
                    Text("DIGITAL ×\(String(format: "%.1f", engine.digitalZoom))")
                        .font(Theme.mono(10, .bold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 6).padding(.vertical, 3)
                        .background(Theme.accent, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .animation(.easeOut(duration: 0.15), value: engine.currentLens?.id)
    }
}
