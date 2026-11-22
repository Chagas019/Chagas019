import AVFoundation
import CoreImage
import QuartzCore
import Combine

/// Histograma RGB + luminância calculado a partir de um quadro BGRA.
struct Histogram: Equatable {
    static let bins = 64
    var red: [Float]
    var green: [Float]
    var blue: [Float]
    var luma: [Float]
    var meanLuma: Float          // 0…1
    var clippedHighlights: Float // fração de pixels ≥ 98%
    var clippedShadows: Float    // fração de pixels ≤ 2%

    static let empty = Histogram(red: [], green: [], blue: [], luma: [], meanLuma: 0, clippedHighlights: 0, clippedShadows: 0)

    /// Amostra 1 a cada `step` pixels em cada eixo (rápido o suficiente para ~15 Hz).
    static func compute(bgra base: UnsafePointer<UInt8>, width: Int, height: Int, bytesPerRow: Int, step: Int = 6) -> Histogram {
        var r = [Float](repeating: 0, count: bins), g = r, b = r, l = r
        var sum: Float = 0, hi: Float = 0, lo: Float = 0, n: Float = 0
        let shift = 8 - 6 // 256 → 64 bins
        var y = 0
        while y < height {
            let row = base + y * bytesPerRow
            var x = 0
            while x < width {
                let p = row + x * 4
                let bv = Int(p[0]), gv = Int(p[1]), rv = Int(p[2])
                let lv = (rv * 54 + gv * 183 + bv * 19) >> 8   // Rec.709
                r[rv >> shift] += 1; g[gv >> shift] += 1; b[bv >> shift] += 1; l[lv >> shift] += 1
                sum += Float(lv)
                if lv >= 250 { hi += 1 } else if lv <= 5 { lo += 1 }
                n += 1
                x += step
            }
            y += step
        }
        guard n > 0 else { return .empty }
        func norm(_ a: [Float]) -> [Float] {
            // normalização por raiz para destacar caudas, como em câmeras
            let m = a.max() ?? 1
            return m > 0 ? a.map { sqrt($0 / m) } : a
        }
        return Histogram(red: norm(r), green: norm(g), blue: norm(b), luma: norm(l),
                         meanLuma: sum / n / 255, clippedHighlights: hi / n, clippedShadows: lo / n)
    }
}

/// Recebe quadros de vídeo e produz histograma, overlays de focus peaking / zebra e lupa de foco.
final class FrameAnalyzer: NSObject, ObservableObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    let queue = DispatchQueue(label: "proshot.analysis", qos: .userInitiated)

    @Published private(set) var histogram = Histogram.empty
    @Published private(set) var overlay: CGImage?
    @Published private(set) var loupe: CGImage?

    // Lidos na fila de análise; escritos pela UI (valores simples).
    var histogramEnabled = true
    var peakingEnabled = false
    var zebraEnabled = false
    var loupeEnabled = false
    var zebraThreshold: Float = 0.95
    var peakingSensitivity: Float = 0.35

    private let context = CIContext(options: [.cacheIntermediates: false, .priorityRequestLow: true])
    private var lastHistogram: CFTimeInterval = 0
    private var lastOverlay: CFTimeInterval = 0
    private var lastLoupe: CFTimeInterval = 0

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let pb = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let now = CACurrentMediaTime()

        if histogramEnabled, now - lastHistogram > 1.0 / 15 {
            lastHistogram = now
            CVPixelBufferLockBaseAddress(pb, .readOnly)
            if let base = CVPixelBufferGetBaseAddress(pb) {
                let h = Histogram.compute(bgra: base.assumingMemoryBound(to: UInt8.self),
                                          width: CVPixelBufferGetWidth(pb), height: CVPixelBufferGetHeight(pb),
                                          bytesPerRow: CVPixelBufferGetBytesPerRow(pb))
                DispatchQueue.main.async { self.histogram = h }
            }
            CVPixelBufferUnlockBaseAddress(pb, .readOnly)
        }

        let wantsOverlay = peakingEnabled || zebraEnabled
        if wantsOverlay, now - lastOverlay > 1.0 / 12 {
            lastOverlay = now
            let img = makeOverlay(pb)
            DispatchQueue.main.async { self.overlay = img }
        } else if !wantsOverlay, overlay != nil {
            DispatchQueue.main.async { self.overlay = nil }
        }

        if loupeEnabled, now - lastLoupe > 1.0 / 20 {
            lastLoupe = now
            let img = makeLoupe(pb)
            DispatchQueue.main.async { self.loupe = img }
        } else if !loupeEnabled, loupe != nil {
            DispatchQueue.main.async { self.loupe = nil }
        }
    }

    private func makeOverlay(_ pb: CVPixelBuffer) -> CGImage? {
        var image = CIImage(cvPixelBuffer: pb)
        let scale = 540 / max(image.extent.width, 1)
        image = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        let extent = image.extent
        var result = CIImage.empty()

        if zebraEnabled {
            let mask = image
                .applyingFilter("CIColorControls", [kCIInputSaturationKey: 0])
                .applyingFilter("CIColorThreshold", ["inputThreshold": zebraThreshold])
                .applyingFilter("CIMaskToAlpha")
            if let stripes = CIFilter(name: "CIStripesGenerator", parameters: [
                "inputColor0": CIColor(red: 1, green: 1, blue: 1, alpha: 0.85),
                "inputColor1": CIColor(red: 0, green: 0, blue: 0, alpha: 0),
                "inputWidth": 5,
            ])?.outputImage?.transformed(by: CGAffineTransform(rotationAngle: .pi / 4)).cropped(to: extent) {
                let zebra = stripes.applyingFilter("CIBlendWithAlphaMask", [
                    kCIInputBackgroundImageKey: CIImage.empty(),
                    kCIInputMaskImageKey: mask,
                ])
                result = zebra.composited(over: result)
            }
        }

        if peakingEnabled {
            let mask = image
                .applyingFilter("CIColorControls", [kCIInputSaturationKey: 0])
                .applyingFilter("CIEdges", [kCIInputIntensityKey: 6])
                .applyingFilter("CIColorThreshold", ["inputThreshold": peakingSensitivity])
                .applyingFilter("CIMaskToAlpha")
            let color = CIImage(color: CIColor(red: 1, green: 0.1, blue: 0.15)).cropped(to: extent)
            let peaking = color.applyingFilter("CIBlendWithAlphaMask", [
                kCIInputBackgroundImageKey: CIImage.empty(),
                kCIInputMaskImageKey: mask,
            ])
            result = peaking.composited(over: result)
        }
        return context.createCGImage(result, from: extent)
    }

    /// Recorte central ampliado (assistente de foco).
    private func makeLoupe(_ pb: CVPixelBuffer) -> CGImage? {
        let image = CIImage(cvPixelBuffer: pb)
        let e = image.extent
        let side = min(e.width, e.height) / 5
        let crop = CGRect(x: e.midX - side / 2, y: e.midY - side / 2, width: side, height: side)
        return context.createCGImage(image.cropped(to: crop), from: crop)
    }
}
