import AVFoundation
import Foundation

enum CaptureFormat: String, CaseIterable, Identifiable {
    case heif, jpeg, raw, rawPlusHEIF, proRAW
    var id: String { rawValue }
    var label: String {
        switch self {
        case .heif: return "HEIF"
        case .jpeg: return "JPEG"
        case .raw: return "RAW"
        case .rawPlusHEIF: return "RAW+H"
        case .proRAW: return "ProRAW"
        }
    }
    var detail: String {
        switch self {
        case .heif: return "HEIF processado (HEVC), alta eficiência"
        case .jpeg: return "JPEG processado, máxima compatibilidade"
        case .raw: return "DNG Bayer sem processamento (sensor puro)"
        case .rawPlusHEIF: return "DNG Bayer + cópia processada"
        case .proRAW: return "Apple ProRAW DNG (fotografia computacional + RAW)"
        }
    }
}

enum FlashSetting: String, CaseIterable, Identifiable {
    case off, auto, on, torch
    var id: String { rawValue }
    var symbol: String {
        switch self {
        case .off: return "bolt.slash.fill"
        case .auto: return "bolt.badge.automatic.fill"
        case .on: return "bolt.fill"
        case .torch: return "flashlight.on.fill"
        }
    }
    var label: String {
        switch self {
        case .off: return "Flash desligado"
        case .auto: return "Flash automático"
        case .on: return "Flash ligado"
        case .torch: return "Lanterna"
        }
    }
}

enum GridStyle: String, CaseIterable, Identifiable {
    case off, thirds, golden, square
    var id: String { rawValue }
    var label: String {
        switch self {
        case .off: return "Sem grade"
        case .thirds: return "Regra dos terços"
        case .golden: return "Proporção áurea"
        case .square: return "Quadrado 1:1"
        }
    }
}

enum ManualParameter: String, CaseIterable, Identifiable {
    case iso, shutter, focus, whiteBalance, exposureBias
    var id: String { rawValue }
    var short: String {
        switch self {
        case .iso: return "ISO"
        case .shutter: return "S"
        case .focus: return "MF"
        case .whiteBalance: return "WB"
        case .exposureBias: return "EV"
        }
    }
}

/// Uma lente física descoberta no aparelho.
struct LensOption: Identifiable, Hashable {
    let id: String            // AVCaptureDevice.uniqueID
    let name: String
    let position: AVCaptureDevice.Position
    let focal35: Double       // distância focal equivalente 35mm
    let opticalZoom: Double   // relativo à grande-angular (1x)

    var zoomLabel: String { ExposureMath.zoomLabel(opticalZoom) }
    var isFront: Bool { position == .front }
}

/// O que o hardware realmente suporta — nada é exibido como disponível sem estar aqui.
struct DeviceCapabilities: Equatable {
    var bayerRAW = false
    var proRAW = false
    var hevc = false
    var flash = false
    var torch = false
    var manualFocus = false
    var manualWhiteBalance = false
    var customExposure = false
    var minISO: Float = 50
    var maxISO: Float = 1600
    var minShutter: Double = 1.0 / 8000
    var maxShutter: Double = 1.0
    var minBias: Float = -3
    var maxBias: Float = 3
    var maxWBGain: Float = 4
    var maxDigitalZoom: CGFloat = 1
    var aperture: Float = 1.8
    var maxPhotoWidth: Int32 = 0
    var maxPhotoHeight: Int32 = 0

    var megapixels: Double { Double(maxPhotoWidth) * Double(maxPhotoHeight) / 1_000_000 }

    func supports(_ format: CaptureFormat) -> Bool {
        switch format {
        case .heif: return hevc
        case .jpeg: return true
        case .raw, .rawPlusHEIF: return bayerRAW
        case .proRAW: return proRAW
        }
    }
}
