import SwiftUI

struct SettingsSheet: View {
    @ObservedObject var engine: CameraEngine
    @Binding var grid: GridStyle
    @Binding var showHistogram: Bool
    @Binding var peaking: Bool
    @Binding var zebra: Bool
    @Binding var showLevel: Bool
    @Binding var zebraThreshold: Double
    @Binding var peakingSensitivity: Double

    var body: some View {
        NavigationStack {
            Form {
                Section("Ferramentas de visualização") {
                    Toggle("Histograma RGB", isOn: $showHistogram)
                    Toggle("Focus Peaking", isOn: $peaking)
                    if peaking {
                        LabeledSlider(title: "Sensibilidade", value: $peakingSensitivity, range: 0.15...0.6,
                                      text: "\(Int((0.75 - peakingSensitivity) * 166))%")
                    }
                    Toggle("Zebra (superexposição)", isOn: $zebra)
                    if zebra {
                        LabeledSlider(title: "Limiar", value: $zebraThreshold, range: 0.8...1.0,
                                      text: "\(Int(zebraThreshold * 100))%")
                    }
                    Toggle("Nível eletrônico", isOn: $showLevel)
                    Picker("Grade", selection: $grid) {
                        ForEach(GridStyle.allCases) { Text($0.label).tag($0) }
                    }
                }

                Section("Captura") {
                    Picker("Formato", selection: $engine.format) {
                        ForEach(CaptureFormat.allCases.filter { engine.caps.supports($0) }) { Text($0.label).tag($0) }
                    }
                    Picker("Temporizador", selection: $engine.timerSeconds) {
                        Text("Desligado").tag(0); Text("3 s").tag(3); Text("10 s").tag(10)
                    }
                    Picker("Disparo contínuo", selection: $engine.burstCount) {
                        Text("Desligado").tag(1); Text("5 fotos").tag(5); Text("10 fotos").tag(10)
                    }
                    if let info = engine.lastCaptureInfo, !info.isEmpty {
                        LabeledContent("Última foto", value: info).font(Theme.mono(12))
                    }
                }

                Section("Este iPhone (detectado)") {
                    ForEach(engine.lenses) { l in
                        LabeledContent(l.name, value: "\(l.zoomLabel) · \(Int(l.focal35.rounded()))mm eq.")
                    }
                    cap("RAW (DNG Bayer)", engine.caps.bayerRAW)
                    cap("Apple ProRAW", engine.caps.proRAW)
                    cap("HEIF / HEVC", engine.caps.hevc)
                    cap("Flash", engine.caps.flash)
                    cap("Lanterna", engine.caps.torch)
                    cap("Exposição manual", engine.caps.customExposure)
                    cap("Foco manual", engine.caps.manualFocus)
                    cap("Balanço de branco manual", engine.caps.manualWhiteBalance)
                    LabeledContent("ISO", value: "\(Int(engine.caps.minISO))–\(Int(engine.caps.maxISO))")
                    LabeledContent("Obturador", value: "\(ExposureMath.shutterLabel(engine.caps.minShutter)) – \(ExposureMath.shutterLabel(engine.caps.maxShutter))")
                    LabeledContent("Abertura", value: String(format: "f/%.2f (fixa)", engine.caps.aperture))
                    LabeledContent("Resolução máx.", value: "\(engine.caps.maxPhotoWidth)×\(engine.caps.maxPhotoHeight) · \(String(format: "%.0f", engine.caps.megapixels)) MP")
                    LabeledContent("Zoom digital máx.", value: String(format: "×%.1f", engine.caps.maxDigitalZoom))
                }
                .font(Theme.label(14, .regular))
            }
            .scrollContentBackground(.hidden)
            .background(Theme.panel)
            .navigationTitle("Configurações")
            .navigationBarTitleDisplayMode(.inline)
        }
        .tint(Theme.accent)
        .preferredColorScheme(.dark)
    }

    private func cap(_ name: String, _ ok: Bool) -> some View {
        LabeledContent(name) {
            Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle")
                .foregroundStyle(ok ? Theme.ok : Theme.dim)
        }
    }
}

struct LabeledSlider: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let text: String
    var body: some View {
        HStack {
            Text(title).frame(width: 110, alignment: .leading)
            Slider(value: $value, in: range)
            Text(text).font(Theme.mono(12)).frame(width: 48, alignment: .trailing)
        }
    }
}
