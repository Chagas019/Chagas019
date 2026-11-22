import Foundation

enum ColorProfile: String, Codable, CaseIterable, Identifiable {
    case standard, vivid, neutral, portrait, landscape, cinematic, monochrome
    var id: String { rawValue }
    var label: String {
        switch self {
        case .standard: return "Padrão"
        case .vivid: return "Vívido"
        case .neutral: return "Neutro"
        case .portrait: return "Retrato"
        case .landscape: return "Paisagem"
        case .cinematic: return "Cinema"
        case .monochrome: return "P&B"
        }
    }
}

/// Curva de tons com 5 pontos fixos em x (0, .25, .5, .75, 1).
struct ToneCurve: Codable, Equatable {
    var points: [Double] = [0, 0.25, 0.5, 0.75, 1]
    static let linear = ToneCurve()
    static let xs: [Double] = [0, 0.25, 0.5, 0.75, 1]
    var isLinear: Bool { zip(points, Self.xs).allSatisfy { abs($0 - $1) < 0.001 } }
}

/// Parâmetros de edição — serializados como adjustmentData no Fotos (edição não destrutiva).
struct EditSettings: Codable, Equatable {
    var exposure: Double = 0        // EV  -3…3
    var contrast: Double = 0        // -1…1
    var highlights: Double = 0      // -1…0 (recuperação)
    var shadows: Double = 0         // -1…1
    var temperature: Double = 0     // -1…1 (frio ↔ quente)
    var tint: Double = 0            // -1…1 (verde ↔ magenta)
    var saturation: Double = 0      // -1…1
    var vibrance: Double = 0        // -1…1
    var sharpness: Double = 0       // 0…1
    var noiseReduction: Double = 0  // 0…1
    var curve = ToneCurve()
    var profile: ColorProfile = .standard

    static let identity = EditSettings()
    var isIdentity: Bool { self == .identity }
}

struct Preset: Identifiable {
    let id: String
    let name: String
    let settings: EditSettings

    static let all: [Preset] = {
        func make(_ id: String, _ name: String, _ f: (inout EditSettings) -> Void) -> Preset {
            var s = EditSettings(); f(&s); return Preset(id: id, name: name, settings: s)
        }
        return [
            make("original", "Original") { _ in },
            make("clean", "Clean") { $0.contrast = 0.1; $0.vibrance = 0.2; $0.sharpness = 0.3 },
            make("vivid", "Vivid") { $0.profile = .vivid; $0.contrast = 0.15; $0.vibrance = 0.3 },
            make("portra", "Portra") { $0.profile = .portrait; $0.temperature = 0.15; $0.contrast = -0.1; $0.curve.points = [0.04, 0.27, 0.52, 0.76, 0.97]; $0.saturation = -0.1 },
            make("velvia", "Velvia") { $0.profile = .landscape; $0.saturation = 0.35; $0.contrast = 0.2; $0.curve.points = [0, 0.21, 0.5, 0.79, 1] },
            make("cine", "Cine Teal") { $0.profile = .cinematic; $0.contrast = 0.1; $0.highlights = -0.3; $0.curve.points = [0.05, 0.24, 0.5, 0.76, 0.95] },
            make("noir", "Noir") { $0.profile = .monochrome; $0.contrast = 0.35; $0.curve.points = [0, 0.18, 0.5, 0.82, 1]; $0.sharpness = 0.4 },
            make("silver", "Silver") { $0.profile = .monochrome; $0.contrast = -0.1; $0.curve.points = [0.08, 0.3, 0.53, 0.76, 0.96] },
            make("matte", "Matte") { $0.curve.points = [0.12, 0.3, 0.52, 0.74, 0.92]; $0.saturation = -0.15 },
            make("golden", "Golden Hour") { $0.temperature = 0.35; $0.tint = 0.05; $0.vibrance = 0.25; $0.shadows = 0.15 },
            make("night", "Night") { $0.noiseReduction = 0.6; $0.shadows = 0.3; $0.highlights = -0.4; $0.temperature = -0.1 },
        ]
    }()
}
