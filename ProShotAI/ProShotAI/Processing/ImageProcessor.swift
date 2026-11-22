import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import Photos
import UniformTypeIdentifiers
import UIKit

enum ExportFormat: String, CaseIterable, Identifiable {
    case jpeg, heif, tiff16
    var id: String { rawValue }
    var label: String {
        switch self {
        case .jpeg: return "JPEG (qualidade 100%)"
        case .heif: return "HEIF 10-bit"
        case .tiff16: return "TIFF 16-bit (sem perdas)"
        }
    }
    var ext: String { self == .jpeg ? "jpg" : self == .heif ? "heic" : "tiff" }
}

/// Fonte de imagem para edição: decodificador RAW (DNG) ou imagem processada.
final class EditSource {
    let isRAW: Bool
    let properties: [String: Any]
    private let rawFilter: CIRAWFilter?
    private let processed: CIImage?

    init?(data: Data, preferRAW: Bool) {
        if preferRAW, let raw = CIRAWFilter(imageData: data, identifierHint: UTType("com.adobe.raw-image")?.identifier) {
            rawFilter = raw
            processed = nil
            isRAW = true
            properties = (raw.properties as? [String: Any]) ?? [:]
        } else if let img = CIImage(data: data, options: [.applyOrientationProperty: true]) {
            rawFilter = nil
            processed = img
            isRAW = false
            properties = img.properties
        } else {
            return nil
        }
    }

    /// Imagem base. Em RAW, redução de ruído e nitidez são feitas no próprio demosaico.
    func image(settings: EditSettings, scale: CGFloat) -> CIImage? {
        if let raw = rawFilter {
            raw.scaleFactor = Float(min(max(scale, 0.05), 1))
            if raw.isLuminanceNoiseReductionSupported { raw.luminanceNoiseReductionAmount = Float(settings.noiseReduction) }
            if raw.isColorNoiseReductionSupported { raw.colorNoiseReductionAmount = Float(0.3 + settings.noiseReduction * 0.7) }
            if raw.isSharpnessSupported { raw.sharpnessAmount = Float(settings.sharpness) }
            raw.exposure = Float(settings.exposure)
            return raw.outputImage
        }
        guard let img = processed else { return nil }
        guard scale < 0.999 else { return img }
        return img.applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: scale, kCIInputAspectRatioKey: 1])
    }

    var fullSize: CGSize {
        if let raw = rawFilter { return raw.nativeSize }
        return processed?.extent.size ?? .zero
    }
}

/// Pipeline de ajustes (Core Image, GPU). Ordem: ruído → exposição → WB → realces/sombras → curva → cor → perfil → nitidez.
enum ImageProcessor {
    static let context = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.extendedLinearSRGB)!])

    static func apply(_ s: EditSettings, to input: CIImage, isRAW: Bool) -> CIImage {
        var img = input
        let extent = input.extent

        if !isRAW, s.noiseReduction > 0 {
            img = img.applyingFilter("CINoiseReduction", parameters: ["inputNoiseLevel": 0.005 + s.noiseReduction * 0.04, "inputSharpness": 0.4])
        }
        if !isRAW, s.exposure != 0 {
            img = img.applyingFilter("CIExposureAdjust", parameters: [kCIInputEVKey: s.exposure])
        }

        var temp = s.temperature, tint = s.tint
        if s.profile == .portrait { temp += 0.06 }
        if temp != 0 || tint != 0 {
            // neutro 6500K; valores positivos esquentam a imagem
            img = img.applyingFilter("CITemperatureAndTint", parameters: [
                "inputNeutral": CIVector(x: 6500, y: 0),
                "inputTargetNeutral": CIVector(x: 6500 - temp * 3000, y: tint * 60),
            ])
        }

        if s.highlights != 0 || s.shadows != 0 {
            img = img.applyingFilter("CIHighlightShadowAdjust", parameters: [
                "inputHighlightAmount": 1 + min(0, s.highlights),
                "inputShadowAmount": s.shadows,
                kCIInputRadiusKey: 0,
            ])
        }

        if !s.curve.isLinear {
            let p = s.curve.points
            img = img.applyingFilter("CIToneCurve", parameters: [
                "inputPoint0": CIVector(x: 0, y: p[0]),
                "inputPoint1": CIVector(x: 0.25, y: p[1]),
                "inputPoint2": CIVector(x: 0.5, y: p[2]),
                "inputPoint3": CIVector(x: 0.75, y: p[3]),
                "inputPoint4": CIVector(x: 1, y: p[4]),
            ])
        }

        var contrast = 1 + s.contrast * 0.5
        var saturation = 1 + s.saturation
        var vibrance = s.vibrance
        switch s.profile {
        case .standard: break
        case .vivid: saturation *= 1.25; contrast *= 1.08
        case .neutral: saturation *= 0.88; contrast *= 0.94
        case .portrait: saturation *= 0.95; contrast *= 0.96
        case .landscape: vibrance += 0.3; contrast *= 1.05
        case .cinematic: saturation *= 0.85; contrast *= 1.06
        case .monochrome: saturation = 0
        }
        img = img.applyingFilter("CIColorControls", parameters: [
            kCIInputContrastKey: contrast,
            kCIInputSaturationKey: max(0, saturation),
            kCIInputBrightnessKey: 0,
        ])
        if vibrance != 0, s.profile != .monochrome {
            img = img.applyingFilter("CIVibrance", parameters: ["inputAmount": vibrance])
        }
        if s.profile == .cinematic {
            // split-toning: sombras azul-petróleo, realces âmbar
            img = img.applyingFilter("CIColorMatrix", parameters: [
                "inputRVector": CIVector(x: 1.02, y: 0, z: 0, w: 0),
                "inputGVector": CIVector(x: 0, y: 1, z: 0, w: 0),
                "inputBVector": CIVector(x: 0, y: 0, z: 0.96, w: 0),
                "inputBiasVector": CIVector(x: -0.01, y: 0.005, z: 0.02, w: 0),
            ])
        }

        if !isRAW, s.sharpness > 0 {
            img = img.applyingFilter("CISharpenLuminance", parameters: [kCIInputSharpnessKey: s.sharpness * 1.2, kCIInputRadiusKey: 1.6])
        } else if isRAW, s.sharpness > 0.5 {
            img = img.applyingFilter("CISharpenLuminance", parameters: [kCIInputSharpnessKey: (s.sharpness - 0.5) * 0.8, kCIInputRadiusKey: 1.2])
        }
        return img.cropped(to: extent)
    }

    static func render(_ image: CIImage) -> CGImage? {
        context.createCGImage(image, from: image.extent, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.displayP3))
    }

    /// Renderização em resolução total para exportação.
    static func export(_ source: EditSource, settings: EditSettings, format: ExportFormat) throws -> URL {
        guard let base = source.image(settings: settings, scale: 1) else { throw CocoaError(.fileReadCorruptFile) }
        let output = apply(settings, to: base, isRAW: source.isRAW).settingProperties(sanitized(source.properties))
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("ProShot-\(Int(Date().timeIntervalSince1970)).\(format.ext)")
        let p3 = CGColorSpace(name: CGColorSpace.displayP3)!
        switch format {
        case .jpeg:
            let key = CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String)
            try context.writeJPEGRepresentation(of: output, to: url, colorSpace: p3, options: [key: 1.0])
        case .heif:
            try context.writeHEIF10Representation(of: output, to: url, colorSpace: p3, options: [:])
        case .tiff16:
            try context.writeTIFFRepresentation(of: output, to: url, format: .RGBA16, colorSpace: p3, options: [:])
        }
        return url
    }

    /// Remove orientação (a imagem já foi orientada) mantendo EXIF/TIFF/GPS.
    static func sanitized(_ props: [String: Any]) -> [String: Any] {
        var p = props
        p[kCGImagePropertyOrientation as String] = 1
        if var tiff = p[kCGImagePropertyTIFFDictionary as String] as? [String: Any] {
            tiff[kCGImagePropertyTIFFOrientation as String] = 1
            p[kCGImagePropertyTIFFDictionary as String] = tiff
        }
        return p
    }

    // MARK: - Edição não destrutiva (Fotos)

    static let adjustmentFormat = "com.proshotai.camera.adjustments"
    static let adjustmentVersion = "1.0"

    static func editingOptions() -> PHContentEditingInputRequestOptions {
        let o = PHContentEditingInputRequestOptions()
        o.isNetworkAccessAllowed = true
        o.canHandleAdjustmentData = { $0.formatIdentifier == adjustmentFormat && $0.formatVersion == adjustmentVersion }
        return o
    }

    static func decodeSettings(from input: PHContentEditingInput?) -> EditSettings? {
        guard let adj = input?.adjustmentData, adj.formatIdentifier == adjustmentFormat else { return nil }
        return try? JSONDecoder().decode(EditSettings.self, from: adj.data)
    }

    /// Grava a versão editada no Fotos com os parâmetros (reversível em "Reverter" no app Fotos).
    static func saveNonDestructive(asset: PHAsset, source: EditSource, settings: EditSettings,
                                   completion: @escaping (Result<Void, Error>) -> Void) {
        asset.requestContentEditingInput(with: editingOptions()) { input, _ in
            guard let input else { completion(.failure(CocoaError(.fileReadUnknown))); return }
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let output = PHContentEditingOutput(contentEditingInput: input)
                    output.adjustmentData = PHAdjustmentData(formatIdentifier: adjustmentFormat,
                                                             formatVersion: adjustmentVersion,
                                                             data: try JSONEncoder().encode(settings))
                    guard let base = source.image(settings: settings, scale: 1) else { throw CocoaError(.fileReadCorruptFile) }
                    let rendered = apply(settings, to: base, isRAW: source.isRAW).settingProperties(sanitized(source.properties))
                    let key = CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String)
                    try context.writeJPEGRepresentation(of: rendered, to: output.renderedContentURL,
                                                        colorSpace: CGColorSpace(name: CGColorSpace.displayP3)!, options: [key: 0.97])
                    PHPhotoLibrary.shared().performChanges({
                        PHAssetChangeRequest(for: asset).contentEditingOutput = output
                    }) { ok, error in
                        DispatchQueue.main.async { ok ? completion(.success(())) : completion(.failure(error ?? CocoaError(.fileWriteUnknown))) }
                    }
                } catch {
                    DispatchQueue.main.async { completion(.failure(error)) }
                }
            }
        }
    }

    /// Lê a imagem original (para reabrir edição anterior) ou a versão atual.
    static func loadSource(for asset: PHAsset, completion: @escaping (EditSource?, EditSettings?) -> Void) {
        let isRAW = PhotoLibrary.isRAW(asset)
        asset.requestContentEditingInput(with: editingOptions()) { input, _ in
            let previous = decodeSettings(from: input)
            let finish: (Data?) -> Void = { data in
                DispatchQueue.global(qos: .userInitiated).async {
                    let src = data.flatMap { EditSource(data: $0, preferRAW: isRAW) }
                    DispatchQueue.main.async { completion(src, previous) }
                }
            }
            if isRAW {
                PhotoLibrary.rawData(for: asset, finish)
            } else if let url = input?.fullSizeImageURL, let data = try? Data(contentsOf: url) {
                finish(data)
            } else {
                PhotoLibrary.imageData(for: asset, finish)
            }
        }
    }

    // MARK: - EXIF

    static func exifRows(_ props: [String: Any]) -> [(String, String)] {
        let exif = props[kCGImagePropertyExifDictionary as String] as? [String: Any] ?? [:]
        let tiff = props[kCGImagePropertyTIFFDictionary as String] as? [String: Any] ?? [:]
        let aux = props[kCGImagePropertyExifAuxDictionary as String] as? [String: Any] ?? [:]
        var rows: [(String, String)] = []
        if let m = tiff[kCGImagePropertyTIFFModel as String] as? String { rows.append(("Câmera", m)) }
        if let l = exif[kCGImagePropertyExifLensModel as String] as? String ?? aux[kCGImagePropertyExifAuxLensModel as String] as? String {
            rows.append(("Lente", l))
        }
        if let iso = (exif[kCGImagePropertyExifISOSpeedRatings as String] as? [NSNumber])?.first { rows.append(("ISO", "\(iso.intValue)")) }
        if let t = exif[kCGImagePropertyExifExposureTime as String] as? Double { rows.append(("Obturador", ExposureMath.shutterLabel(t))) }
        if let f = exif[kCGImagePropertyExifFNumber as String] as? Double { rows.append(("Abertura", String(format: "f/%.1f", f))) }
        if let fl = exif[kCGImagePropertyExifFocalLength as String] as? Double { rows.append(("Focal real", String(format: "%.2f mm", fl))) }
        if let fl35 = exif[kCGImagePropertyExifFocalLenIn35mmFilm as String] as? Int { rows.append(("Focal 35mm", "\(fl35) mm")) }
        if let b = exif[kCGImagePropertyExifExposureBiasValue as String] as? Double { rows.append(("Compensação", ExposureMath.evLabel(b) + " EV")) }
        if let w = props[kCGImagePropertyPixelWidth as String] as? Int, let h = props[kCGImagePropertyPixelHeight as String] as? Int {
            rows.append(("Resolução", "\(w) × \(h) (\(String(format: "%.1f", Double(w * h) / 1e6)) MP)"))
        }
        if let wb = exif[kCGImagePropertyExifWhiteBalance as String] as? Int { rows.append(("Balanço", wb == 0 ? "Automático" : "Manual")) }
        if let flash = exif[kCGImagePropertyExifFlash as String] as? Int { rows.append(("Flash", flash & 1 == 1 ? "Disparou" : "Não disparou")) }
        if let date = exif[kCGImagePropertyExifDateTimeOriginal as String] as? String { rows.append(("Data", date)) }
        return rows
    }
}
